const http = require('http');
const WebSocket = require('ws');
import { Server } from 'ws';
import WranggleRpc from "@wranggle/rpc-core";
// import WebSocketTransport, {WebSocketTransportOpts} from "../src/websocket-transport";
import WebSocketTransport, {WebSocketTransportOpts} from "@wranggle/rpc-websocket-transport";
import MockLogger from "@wranggle/rpc-core/__tests__/test-support/mock-logger";
import { buildDebugHandler } from "@wranggle/rpc-core/src/util/logging-support";


// NOTE: must build @wranggle/rpc-core and @wranggle/rpc-websocket-transport before running this test
describe('@wranggle/rpc-websocket-transport integration test', () => {
  let wsPort: number | null;
  let wss: Server;
  let httpServer;
  let transport: WebSocketTransport;
  let lastServerSocket: any;
  let serverRpc: WranggleRpc<any>;

  beforeAll(done => {
    httpServer = http.createServer();
    wss = new WebSocket.Server({ server: httpServer });
    wss.on('connection', (socket: any) => {
      lastServerSocket = socket;
      serverRpc = new WranggleRpc<any>({ 
        websocket: { serverSocket: socket,
        }
      });
      serverRpc.addRequestHandler('hello', (val) => `Hello ${val}`);

    });
    httpServer.listen(() => {
      wsPort = httpServer.address().port;
      done();
    });
  });

  afterAll(done => {
    lastServerSocket && lastServerSocket.close();
    httpServer && httpServer.close(() => done());
  });

  beforeEach(() => {
    lastServerSocket = null;
    transport = null;
    // @ts-ignore
    global.WebSocket = WebSocket;
  });

  afterEach(() => {
    const ws = transport && transport.getPromisedWebSocket().then(ws => {
      // @ts-ignore
      ws && ws.close();
    });
    // @ts-ignore
    delete global.WebSocket;
  });

  const getWebSocketUrl = () => `ws://localhost:${wsPort}`;

  const promisedConnectedTransport = (opts?: Partial<WebSocketTransportOpts>): Promise<WebSocketTransport> => new Promise((resolve, reject) => {
    transport = new WebSocketTransport(Object.assign({
      websocketUrl: getWebSocketUrl()
    }, opts));
    transport.getPromisedWebSocket().then((ws: any) => {
      ws.onopen = () => resolve(transport);
    });
  });


  test('connects to server', async () => {
    transport = await promisedConnectedTransport();
    expect(!!lastServerSocket).toBe(true);
    expect(typeof transport.sendMessage).toBe('function');
  });

  test('remote call round trip', async () => {
    transport = await promisedConnectedTransport();
    const rpc = new WranggleRpc<RemoteServer>({ transport });
    const val = await rpc.remoteInterface().hello('Fred');
    expect(val).toBe('Hello Fred');
  });

  test('buffers calls while connecting', async () => {
    transport = new WebSocketTransport({ websocketUrl: getWebSocketUrl() });
    const rpc = new WranggleRpc<RemoteServer>({ transport });
    const val = await rpc.remoteInterface().hello('Alice');
    expect(val).toBe('Hello Alice');
  });

  test('expose ReconnectingWebSocket factory and use with clientSocket factory', async () => {
    let customSocket: any;

    const buildReconnectingWebSocket = () => {
      customSocket = WebSocketTransport.buildReconnectingWebSocket(getWebSocketUrl(), [], { connectionTimeout: 100 });
      return customSocket;
    };
    transport = new WebSocketTransport({ clientSocket: buildReconnectingWebSocket });
    const ws = await transport.getPromisedWebSocket();
    expect(ws).toBe(customSocket);
    const rpc = new WranggleRpc<RemoteServer>({ transport });
    const val = await rpc.remoteInterface().hello('there');
    expect(val).toBe('Hello there');
  });


  test('debugHandler', async () => {
    const logger = new MockLogger();
    transport = await promisedConnectedTransport();
    transport.debugHandler = buildDebugHandler('WebsocketTransportTest', { logger });
    transport.endpointSenderId = 'wsFakeEndpoint9911';
    const rpc = new WranggleRpc<RemoteServer>({ transport });
    await rpc.remoteInterface().hello('again');
    expect(logger.stack.length).toBe(2);
    const logSend = logger.getFirstMessage();
    expect(logSend).toMatch(/^\[WebsocketTransportTest] TransportSendingPayload/);
    expect(logSend).toMatch(/"methodName": "hello"/);
    expect(logSend).toMatch(/websocketUrl/);

    const logReceive = logger.getLastMessage();
    expect(logReceive).toMatch(/TransportReceivingMessage/);
    expect(logReceive).toMatch(/endpointSenderId/);
    expect(logReceive).toMatch(/endpointSenderId/);
  });

});


interface RemoteServer {
  hello(val: string): string;
}