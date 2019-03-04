const http = require('http');
const WebSocket = require('ws');
import { Server } from 'ws';
import WebSocketTransport, {WebSocketTransportOpts} from "../src/websocket-transport";
import WranggleRpc from "rpc-core/src/rpc-core";


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
        transport: new WebSocketTransport({ serverSocket: socket })
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
});


interface RemoteServer {
  hello(val: string): string;
}