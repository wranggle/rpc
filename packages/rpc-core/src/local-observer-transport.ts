import {EventEmitter} from "events"; 
import { RequestPayload, ResponsePayload, RpcTransport, LogActivity, DebugHandlerActivityData, DebugHandler} from "./interfaces";
import {registerTransport} from "./transport-shortcut-registration";


export interface LocalObserverTransportOpts {
  observer: EventEmitter;
  messageEventName?: string;
  debugHandler?: DebugHandler | false;
}
const DefaultOpts = {
  messageEventName: 'LocalRpcEvent'
};


/**
 * This is mostly for internal testing but does have a use/role in production, as syntactical sugar for events.
 * For example, rather than `myObserver.emit('ShowErrorAlert', 'Server is offline')` you might set up RPC with this transport
 * and then make use of with something like: alerts.show('Server is offline')
 *
 * 
 */
export default class LocalObserverTransport implements RpcTransport {
  private readonly observer: EventEmitter;
  readonly messageEventName: string;
  private _isStopped = false;
  private _payloadHandler?: (payload: RequestPayload | ResponsePayload) => void;
  endpointSenderId!: string | void;
  debugHandler?: DebugHandler | false;

  constructor(opts: LocalObserverTransportOpts | EventEmitter) {
    let { observer, messageEventName } = (opts || {}) as any;
    // @ts-ignore
    observer = observer || opts;
    if (!_isEventEmitter(observer)) {
      throw new Error('InvalidArgument constructing LocalObserverTransport');
    }
    this.observer = observer;
    this.messageEventName = messageEventName || DefaultOpts.messageEventName;
    this.debugHandler = (opts as any).debugHandler;
  }

  listen(handler: (payload: RequestPayload | ResponsePayload) => void): void {
    this._removeExistingListener();
    this._payloadHandler = (payload: RequestPayload | ResponsePayload) => {
      if (!this._isStopped) {
        this._debug(LogActivity.TransportReceivingMessage, { payload });
        handler(payload);
      }
    };
    this.observer.on(this.messageEventName, this._payloadHandler);
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (!this._isStopped) {
      this._debug(LogActivity.TransportSendingPayload, { payload });
      this.observer.emit(this.messageEventName, payload);
    }
  }

  stopTransport(): void {
    this._isStopped = true;
    this._debug(LogActivity.TransportStopping, {});
    this._removeExistingListener();
  }

  _removeExistingListener() {
    this._payloadHandler && this.observer.removeListener(this.messageEventName, this._payloadHandler);
  }

  _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    this.debugHandler(Object.assign({
      activity,
      endpointSenderId: this.endpointSenderId,
      messageEventName: this.messageEventName,
    }, data));
  }
}

function _isEventEmitter(obj: any): boolean {
  return typeof obj === 'object' && [ 'on', 'emit', 'removeListener' ].every(m => typeof obj[m] === 'function');
}


registerTransport('localObserver', (opts: LocalObserverTransportOpts) => new LocalObserverTransport(opts));
