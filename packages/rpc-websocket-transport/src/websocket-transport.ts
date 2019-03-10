// import WranggleRpc from '@wranggle/rpc-core';
import {
  DebugHandler, DebugHandlerActivityData,
  LogActivity,
  RequestPayload,
  ResponsePayload,
  RpcTransport
} from "@wranggle/rpc-core/src/interfaces";
// @ts-ignore
import stringify from 'fast-safe-stringify';
import ReconnectingWebSocket from './hacked-reconnecting-websocket/reconnecting-websocket';


import {registerTransport} from "@wranggle/rpc-core/src/transport-shortcut-registration";


const WebSocketEventTypes = [ 'open', 'close', 'message', 'error' ];


export interface WebSocketTransportOpts {
  /**
   * This option creates a WebSocket client connection for your WranggleRpc endpoint.
   *
   * Provide the URL of your WebSocket server as a string or a as promise or function that resolves to the URL string.
   * Eg: `ws://myWebsocketServer.example`
   *
   */
  websocketUrl?: string | (() => string) | (() => Promise<string>);

  /**
   * An alternative to using the `websocketUrl` option for a client-side endpoint, you can use the `clientSocket`
   * option to supply your own client socket.
   *
   * This transport's `websocketUrl` option creates its WebSocket client using the [ReconnectingWebSocket](https://www.npmjs.com/package/reconnecting-websocket)
   *  library. If you want to use your own options for it rather than its defaults, have your `clientSocket` function
   * return a custom ReconnectingWebSocket instance.
   *
   */
  clientSocket?: WebSocket | (() => WebSocket) | Promise<WebSocket>;

  /**
   * Provide the socket connection object for the server-side WranggleRpc endpoint.
   * Your WebSocket server will likely offer access to the socket in a connection listener where you can
   * validate the connection request and create the WranggleRpc endoint. Eg:
   * ```
   * wss.on('connection', (socket, req) => {
   *   if (myValidationCheck(req)) {
   *     setupMyWranggleRpcEndpoint(new WebSocketTransport({ serverSocket: socket })));
   *   }
   * }
   * ```
   */
  serverSocket?: WebSocket | (() => WebSocket) | Promise<WebSocket>;

  debugHandler?: DebugHandler | false;
}


export default class WebSocketTransport implements RpcTransport {
  private _isStopped = false;
  private _promisedSocket: Promise<WebSocket>;
  private _listenHandler?: (payload: RequestPayload | ResponsePayload) => void;
  private readonly isClientSide: boolean;
  private _ws?: WebSocket;
  endpointSenderId!: string | void;
  debugHandler?: DebugHandler | false;
  private _opts: WebSocketTransportOpts;

  constructor(opts: WebSocketTransportOpts) {
    opts = this._opts = opts || {};
    let { serverSocket, websocketUrl, clientSocket } = opts;

    const isClient = this.isClientSide = !!(websocketUrl || clientSocket);
    if (serverSocket && isClient) {
      throw new Error('Expecting options to set up either client or server, not both');
    }
    if (!isClient && !serverSocket) {
      throw new Error('Expecting options to set up either client or server');
    }
    if (serverSocket) {
      this._promisedSocket = this._initServer(serverSocket);
    } else {
      this._promisedSocket = this._initClient(websocketUrl, clientSocket);
    }
  }

  listen(rpcHandler: (payload: (RequestPayload | ResponsePayload)) => void): void {
    this._removeExistingRpcListener();
    this._listenHandler = (...args: any[]) => {
      // @ts-ignore
      if (!this._isStopped) {
        let payload: RequestPayload | ResponsePayload;
        let rawData = _extractRawPayloadString(args[args.length - 1]);
        try {
          payload = JSON.parse(rawData || '{}');
          this._debug(LogActivity.TransportReceivingMessage, { payload });
          rpcHandler(payload);
        } catch (error) {
          this._debug(LogActivity.ReportWarning, { message: 'Ignoring invalid json message', rawData, error });
        }
      }
    };
    this._promisedSocket.then((ws) => {
      this._ws = ws;
      if (this._listenHandler) {
        ws.addEventListener('message', this._listenHandler);
      }
    });
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._isStopped) {
      return;
    }
    this._promisedSocket.then((ws) => {
      try {
        this._debug(LogActivity.TransportSendingPayload, { payload });
        ws.send(stringify(payload));
      } catch (error) {
        this._debug(LogActivity.ReportWarning, { message: 'WebSocketTransport failed to send message', error });
      }
    });
  }

  stopTransport(): void {
    this._isStopped = true;
    this._removeExistingRpcListener();
    this._promisedSocket.then((ws: any) => { // todo: option to skip socket.close(), for the case of a shared socket
      this._debug(LogActivity.TransportStopping, {});
      WebSocketEventTypes.forEach((eventType: string) => {
        delete ws[eventType];
        if (typeof ws.removeEventListener === 'function') {
          ws.removeEventListener(eventType);
        }
      });
      ws && ws.close && ws.close();
      this._ws = void(0);
    });
  }

  getPromisedWebSocket(): Promise<WebSocket> {
    return this._promisedSocket;
  }

  isOpenOrConnecting(): boolean {
    const ws = this._ws as any;
    if (!ws) {
      return false;
    } else {
      const state = ws.readyState as any;
      return state === 0 || state === 1 || state === ws['OPEN'] || state === ws['CONNECTING'];
    }
  }

  addEventListener(eventName: string, listener: EventListener): void {
    this.getPromisedWebSocket().then((ws: WebSocket) => {
      ws.addEventListener(eventName, listener);
    });
  }

  removeEventListener(eventName: string, listener: EventListener): void {
    this.getPromisedWebSocket().then((ws: WebSocket) => {
      ws.removeEventListener(eventName, listener);
    });
  }

  _removeExistingRpcListener() {
    this._listenHandler && this._promisedSocket && this._promisedSocket.then((ws) => {
      this._listenHandler && ws.removeEventListener('message', this._listenHandler);
      this._listenHandler = undefined;
    });
  }

  _initClient(websocketUrl: ClientUrl | void, clientSocket?: SocketBuilder): Promise<WebSocket> {
    if (clientSocket && websocketUrl) {
      throw new Error('Expecting EITHER clientSocket or websocketUrl, not both');
    }
    if (websocketUrl) {
      return Promise.resolve(WebSocketTransport.buildReconnectingWebSocket(websocketUrl) as WebSocket);
    } else if (clientSocket) {
      return Promise.resolve(typeof clientSocket === 'function' ? clientSocket() : clientSocket);
    } else {
      return Promise.reject(false); // not reachable, ts got tricked
    }
  }

  _initServer(serverSocket: SocketBuilder): Promise<WebSocket> {
    return Promise.resolve(typeof serverSocket === 'function' ? serverSocket() : serverSocket);
  }

  _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    const isClient = this.isClientSide;
    const res = Object.assign({
      activity,
      isClient,
      endpointSenderId: this.endpointSenderId,
    }, data);
    if (this._opts.websocketUrl) {
      res.websocketUrl = this._opts.websocketUrl;
    }
    this.debugHandler(res);
  }

  static buildReconnectingWebSocket(...args: any[]): ReconnectingWebSocket {
    // @ts-ignore
    return new ReconnectingWebSocket(...args);
  }
}

function _extractRawPayloadString(eventOrData: any) {
  if (typeof eventOrData === 'string') {
    return eventOrData;
  } else if (typeof eventOrData === 'object' && eventOrData.data) {
    return eventOrData.data;
  }

}

registerTransport('websocket', (opts: WebSocketTransportOpts) => new WebSocketTransport(opts));


interface WebSocket {
  send: (data: any) => void;
  addEventListener: (eventName: string, handler: Listener) => void;
  removeEventListener: (eventName: string, handler: Listener) => void;
}

type SocketBuilder = WebSocket | (() => WebSocket) | Promise<WebSocket>;

type Listener = (event: any, data: any) => void;
type ClientUrl = string | (() => string) | (() => Promise<string>);
