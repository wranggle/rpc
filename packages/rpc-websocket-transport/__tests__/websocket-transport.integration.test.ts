const http = require('http');
const WebSocket = require('ws');
import { Server } from 'ws';
import WranggleRpc from "rpc-core/src/core";
import WebSocketTransport, {WebSocketTransportOpts} from "../src/websocket-transport";


describe('@wranggle/rpc-websocket-transport.ts', () => {
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
        websocket: { serverSocket: socket }
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
});


interface RemoteServer {
  hello(val: string): string;
}