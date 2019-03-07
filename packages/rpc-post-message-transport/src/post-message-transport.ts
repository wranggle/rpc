import { RequestPayload, ResponsePayload, RpcTransport} from "@wranggle/rpc-core/src/interfaces";
import {registerTransport} from "@wranggle/rpc-core/src/transport-shortcut-registration";


type WindowRef = any;

export interface PostMessageTransportOpts {
  /**
   * Target window to use for both sending and receiving messages. If they are different, use the `sendingWindow` and
   * `receivingWindow` options.
   *
   * Note: if using an iframe, remember to pass in its `contentWindow` (eg, myIframe.contentWindow) not the iframe DOM element.
   *
   */
  targetWindow?: any;

  /**
   * The `targetOrigin` value used when calling targetWindow.postMessage.
   * Use the origin / base url of the receiving window. Eg, `https://example.edu`
   *
   * If this option is not set, it will use the current origin (meaning both communicating windows must be on the same origin.)
   */
  sendToOrigin?: string;

  /**
   * Filter that determines if a message should be received.
   *
   * It a function is passed, it will called with the event.origin string of the received message and only accept
   *   the message if the function returns `true`
   * If a string is passed, it will expect the message origin to match it exactly. (Eg, "https://example.edu")
   *
   * If this option is not set, the transport will only accept messages originating from the same origin.
   *
   * @param origin
   */
  shouldReceive?: string | ((origin: string) => boolean);

  /**
   * If different windows are needed for sending and receiving, use this option to specify the target window for sending messages.
   */
  sendingWindow?: any;

  /**
   * If different windows are needed for sending and receiving, use this option to specify the window for receiving messages.
   */
  receivingWindow?: any;
}


export default class PostMessageTransport implements RpcTransport {
  private _sendingWindow: WindowRef;
  private _receivingWindow: WindowRef;
  private _opts: PostMessageTransportOpts;
  private _isStopped = false;
  private _windowEventListener?: (payload: RequestPayload | ResponsePayload) => void;
  endpointSenderId!: string | void;

  constructor(opts: PostMessageTransportOpts) {
    const sendingWindow = opts.sendingWindow || opts.targetWindow;
    if (!sendingWindow || typeof sendingWindow.postMessage !== 'function') {
      throw new Error('Expecting a browser window or contentWindow. Passed in value is missing "postMessage"');
    }
    const receivingWindow = opts.receivingWindow || opts.targetWindow;
    if (!receivingWindow || typeof receivingWindow.addEventListener !== 'function') {
      throw new Error('Expecting a browser window or contentWindow. Passed in value is missing "addEventListener"');
    }
    // @ts-ignore
    opts.sendToOrigin = opts.sendToOrigin || (global.location && global.location.origin);
    if (!opts.sendToOrigin) {
      throw new Error('sendToOrigin required');
    }
    this._sendingWindow = sendingWindow;
    this._receivingWindow = receivingWindow;
    this._opts = opts;
  }

  listen(rpcHandler: (payload: (RequestPayload | ResponsePayload)) => void): void {
    this._removeExistingListener();
    // @ts-ignore
    let shouldReceive = this._opts.shouldReceive || global.location.origin;

    this._windowEventListener = (evt: any) => {
      if (this._isStopped) {
        return;
      }
      const origin = evt.origin;
      let permitted = false;
      if (typeof shouldReceive === 'function') {
        permitted = shouldReceive(origin);
      } else if (typeof shouldReceive === 'string') {
        permitted = origin === shouldReceive;
      }
      if (permitted === true) {
        rpcHandler(evt.data);
      }
    };

    this._receivingWindow.addEventListener('message', this._windowEventListener);
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._isStopped) {
      return;
    }
    this._sendingWindow.postMessage(payload, this._opts.sendToOrigin);
  }

  stopTransport(): void {
    this._isStopped = true;
    this._removeExistingListener();
  }

  _removeExistingListener() {
    this._windowEventListener && this._receivingWindow && this._receivingWindow.removeEventListener('message', this._windowEventListener);
  }

}

registerTransport('postMessage', (opts: PostMessageTransportOpts) => new PostMessageTransport(opts));
