import {DebugHandler, DebugHandlerActivityData, LogActivity, RequestPayload, ResponsePayload, RpcTransport} from "@wranggle/rpc-core";
import stringify from 'fast-safe-stringify';


export interface IpcTransportOpts {
  /**
   * A reference to the IPC transport object responsible for sending messages.
   * in the parent program, this will be the forked child. In the child, it will be the built-in Node [process](https://nodejs.org/api/process.html)
   *
   */
  ipc: any; // EventEmitter?

  debugHandler?: DebugHandler | false;
}


export default class IpcTransport implements RpcTransport {
  private _isStopped = false;
  private readonly ipc: any;
  private _listenHandler?: (payloadJson: string) => void;
  endpointSenderId!: string | void;
  debugHandler?: DebugHandler | false;

  constructor(opts: IpcTransportOpts) {
    if (!opts || !_isIpcProcess(opts.ipc)) {
      throw new Error('IpcTransport expecting ipc process object (with "send" and "on" methods');
    }
    this.ipc = opts.ipc;
  }

  listen(rpcHandler: (payload: (RequestPayload | ResponsePayload)) => void): void {
    this._removeExistingListener();
    this._listenHandler = (payloadJson: string) => {
      if (!this._isStopped) {
        const payload = payloadJson && JSON.parse(payloadJson);
        this._debug(LogActivity.TransportReceivingMessage, { payload });
        rpcHandler(payload);
      }
    };

    this.ipc.on('message', this._listenHandler);
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._isStopped) {
      return;
    }
    this._debug(LogActivity.TransportSendingPayload, { payload });
    this.ipc.send(stringify(payload));
  }

  stopTransport(): void {
    this._isStopped = true;
    this._debug(LogActivity.TransportStopping, {});
    this._removeExistingListener();
  }

  _removeExistingListener() {
    if (this._listenHandler && this.ipc && typeof this.ipc['off'] === 'function') {
      this.ipc.removeEventListener('message', this._listenHandler);
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