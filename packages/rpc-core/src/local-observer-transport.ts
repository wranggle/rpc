import {EventEmitter} from "events"; 
import {EndpointInfo, RequestPayload, ResponsePayload, RpcOpts, RpcTransport} from "./interfaces";
import {registerTransport} from "./transport-shortcut-registration";


export interface LocalObserverTransportOpts {
  observer: EventEmitter;
  messageEventName?: string;
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

  constructor(opts: LocalObserverTransportOpts | EventEmitter) {
    let { observer, messageEventName } = (opts || {}) as any;
    // @ts-ignore
    observer = observer || opts;
    if (!_isEventEmitter(observer)) {
      console.error('LocalObserverTransport expecting an EventEmitter.', opts);
      throw new Error('InvalidArgument constructing LocalObserverTransport');
    }
    this.observer = observer;
    this.messageEventName = messageEventName || DefaultOpts.messageEventName;
  }

  listen(handler: (payload: RequestPayload | ResponsePayload) => void): void {
    this._removeExistingListener();
    this._payloadHandler = (payload: RequestPayload | ResponsePayload) => {
      if (!this._isStopped) {
        handler(payload);
      }
    };
    this.observer.on(this.messageEventName, this._payloadHandler);
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (!this._isStopped) {
      this.observer.emit(this.messageEventName, payload);
    }
  }

  stopTransport(): void {
    this._isStopped = true;
    this._removeExistingListener();
  }

  _removeExistingListener() {
    this._payloadHandler && this.observer.removeListener(this.messageEventName, this._payloadHandler);
  }
}

function _isEventEmitter(obj: any): boolean {
  return typeof obj === 'object' && [ 'on', 'emit', 'removeListener' ].every(m => typeof obj[m] === 'function');
}


registerTransport('localObserver', (opts: LocalObserverTransportOpts) => new LocalObserverTransport(opts));
