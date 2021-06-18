import stringify from 'fast-safe-stringify';
import {
  DebugHandler,
  DebugHandlerActivityData,
  LogActivity,
  RequestPayload,
  ResponsePayload,
  RpcTransport,
  RpcChannel, TransportMessageHandler
} from "@wranggle/rpc-core";


export interface IpcTransportOpts {
  /**
   * A reference to the IPC transport object responsible for sending messages.
   * in the parent program, this will be the forked child. In the child, it will be the built-in Node [process](https://nodejs.org/api/process.html)
   *
   */
  ipc: any; // EventEmitter?

  /**
   * Override when ipc.send is not desirable. Adding for use with pm2 (pm2.sendDataToProcessId)
   *
   * @param payload
   */
  sendMessageOverride?: (msg: string) => void;

  debugHandler?: DebugHandler | false;
}


export default class IpcTransport implements RpcTransport {
  private _isStopped = false;
  private readonly ipc: any;
  private _listenHandler?: (payloadJson: string) => void;
  private readonly _endpointMessageHandlersByChannel: Record<string, TransportMessageHandler>;
  endpointSenderId!: string | undefined;
  debugHandler?: DebugHandler | false;
  private readonly _sendMessageOverride?: (msg: string) => void;

  constructor(opts: IpcTransportOpts) {
    if (!opts || !_isIpcProcess(opts.ipc)) {
      throw new Error('IpcTransport expecting ipc process object (with "send" and "on" methods');
    }
    this.ipc = opts.ipc;
    this._endpointMessageHandlersByChannel = {};
    this._sendMessageOverride = opts.sendMessageOverride;
  }

  listen(msgHandler: TransportMessageHandler, channel: RpcChannel): void {
    if (!this._listenHandler) {
      this._listenHandler = this._processInboundMessage.bind(this);
      this.ipc.on('message', this._listenHandler);
    }
    this._endpointMessageHandlersByChannel[channel] = msgHandler;
  }

  removeEndpointHandler(channel: RpcChannel) {
    delete this._endpointMessageHandlersByChannel[channel];
  }

  _processInboundMessage(msg: string) {
    if (this._isStopped) {
      return;
    }
    const handlersByChannel = this._endpointMessageHandlersByChannel;


    let payload;
    try {
      payload = msg && JSON.parse(msg);
    } catch (err) {  // if common, check beginning of message
      this._debug(LogActivity.TransportReceivingMessage, { ignoringNonJsonMessage: msg });
    }
    if (payload) {
      const targetChannel = payload.channel;
      const handler = handlersByChannel[targetChannel];
      this._debug(LogActivity.TransportReceivingMessage, { payload, handler: !!handler });
      if (handler) {
        try {
          handler(payload);
        } catch (error) {
          this._debug(LogActivity.TransportReceivingMessage, { error: 'Error in WranggleRpc core' });
          this._debug(LogActivity.TransportReceivingMessage, { error });
        }
      }
    }
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._isStopped) {
      return;
    }
    this._debug(LogActivity.TransportSendingPayload, { payload });

    if (this._sendMessageOverride) {
      this._sendMessageOverride(stringify(payload));
    } else {
      this.ipc.send(stringify(payload));
    }
  }

  stopTransport(): void {
    this._isStopped = true;
    this._debug(LogActivity.TransportStopping, {});
    this._removeExistingListener();
  }

  _removeExistingListener() {
    if (this._listenHandler && this.ipc && typeof this.ipc['off'] === 'function') {
      this.ipc.off('message', this._listenHandler);
      this._listenHandler = undefined;
    }
  }

  _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    this.debugHandler(Object.assign({
      activity,
      endpointSenderId: this.endpointSenderId,
    }, data));
  }
}



function _isIpcProcess(obj: any): boolean {
  return obj && typeof obj.send === 'function' && typeof obj.on === 'function';
}



type IpcListener = (evt: any, data: any) => void; // todo: Ipc types (for Event)

export interface NodeProcessInstance {
  send: (data: any) => void;
  on(evt: string, listener: IpcListener): void;
}

export {
  IpcTransport,
}