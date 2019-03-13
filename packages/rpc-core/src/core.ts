import RemoteRequest from "./internal/remote-request";
import Router from "./internal/router";
import RequestHandler from "./internal/request-handler";
import { extractTransportOpts } from "./internal/transport-construction";
import {DelegatedRequestHandlerOpts, IDict, RequestOpts, RpcTransport, RpcOpts, RemotePromise, NamedRequestHandlerOpts} from "./interfaces";
// @ts-ignore
import kvid from 'kvid';
import {registerTransport} from "./transport-shortcut-registration";
import LocalObserverTransport from "./local-observer-transport";


const DefaultRpcOpts = {
  channel: 'CommonChannel',
  debug: { minimal: true },
};


export default class WranggleRpc<T> {
  private _rootOpts = <RpcOpts>{};
  private _requestOptsByMethod = <IDict<RequestOpts>>{};

  private readonly router: Router;
  private readonly requestHandler = new RequestHandler();

  constructor(rpcOpts?: Partial<RpcOpts>) {
    this.router = new Router({ onValidatedRequest: this.requestHandler.onValidatedRequest.bind(this.requestHandler) });
    if (typeof rpcOpts === 'string') { // hmm, not an especially useful constructor signature but looks good in the readme example
      rpcOpts = { transport: rpcOpts };
    }
    this.opts(Object.assign({ senderId: kvid(8) }, DefaultRpcOpts, rpcOpts));
  }

  /**
   * Incoming requests are passed to methods on the specified `delegate` object if it passes the `DelegateOpts` filters specified.
   *
   */
  addRequestHandlerDelegate(delegate: any, opts?: DelegatedRequestHandlerOpts): void {
    this.requestHandler.addRequestHandlerDelegate(delegate, opts);
  }

  /**
   * Add a function to handle incoming request messages.
   *
   * @param methodName. String that is a legitimate js variable name. (No spaces and such.)
   * @param fn Function that runs the remotely-passed arguments. This function can return a value or a promise.
   * @param context. Optional. Sets the "this" context of your function. Note/reminder: arrow functions do not have a "this" binding,
   *   so use a full "function" when setting this option.
   */
  addRequestHandler(methodName: string, fn: (...args: any[]) => any, opts?: NamedRequestHandlerOpts): void {
    this.requestHandler.addRequestHandler(methodName, fn, opts);
  }

  /**
   * Shortcut to addRequestHandler. Accepts an object of methodName-function pairs.
   * Note: methodName/keys starting with underscore "_" are skipped here, but can be added with a direct call to `addRequestHandler`
   * @param fnByMethodName
   * @param context
   */
  addRequestHandlers(fnByMethodName: IDict<(...args: any[]) => any>, opts?: NamedRequestHandlerOpts): void {
    this.requestHandler.addRequestHandlers(fnByMethodName, opts);
  }

  /**
   * Set the RpcTransport for sending and receiving messages.
   *
   * @param transportOrOpts: an instantiated RpcTransport or a construction-shortcut for creating one. (see docs)
   */
  useTransport(transportOpts: RpcTransport | object | string) {
    this.router.useTransport(transportOpts);
  }

  /**
   * Update options. Accepts same values as during WranggleRpc construction.
   * @param opts
   */
  opts(opts: Partial<RpcOpts>): void {
    opts = extractTransportOpts(opts);
    this.router.routerOpts(opts);
    this.requestHandler.requestHandlerOpts(opts);
    Object.assign(this._rootOpts, opts);
  }

  /**
   * Returns an object that you use to make your remote calls.
   * All remote calls return a `RemotePromise`.
   *
   * For example, if in the other window you added a request handler:
   *   ```
   *   otherRpc.addRequestHandler('sayHello', name => `Hello ${name}`)
   *   ```
   * You could then call it from the current window:
   *   ```
   *   const remoteControl = thisRpc.remoteInterface();
   *   const remotePromise = remoteControl.sayHello('Bob');
   *   remotePromise.useTimeout(500);
   *   console.log(remotePromise.info());
   *   ```
   *
   * The returned `RemotePromise` behaves as a normal Promise, with some additional features, such as
   * setting timeout and request options, and getting status info.
   */
  remoteInterface(): T {
    const itself = this;
    return new Proxy({}, {
      get: function (obj: any, methodName: string) {
        return (...userArgs: any[]) => itself.makeRemoteRequest(methodName, userArgs);
      }
    }) as T;
  }

  /**
   * An alternative way to call remote methods.
   * @param methodName
   * @param userArgs
   * @param requestOpts
   */
  makeRemoteRequest(methodName: string, userArgs: any[], requestOpts = <RequestOpts>{}): RemotePromise<any> {
    const rootOpts = this._rootOpts;
    requestOpts = Object.assign({}, rootOpts.allRequestOpts, this._requestOptsByMethod[methodName], requestOpts);
    const req = new RemoteRequest(methodName, userArgs, requestOpts);
    return this.router.sendRemoteRequest(req);
  }

  /**
   *
   * whenever a request to the passed-in methodName is called, it applies the supplied `RequestOpts` options
   * See also setting the `allRequestOpts` global option. And some options can be applied on `RemotePromise`.
   *
   * @param methodName
   * @param requestOpts
   */
  setDefaultRequestOptsForMethod(methodName: string, requestOpts: RequestOpts): void {
    this._requestOptsByMethod[methodName] = Object.assign((this._requestOptsByMethod[methodName] || {}), requestOpts);
  }

  // todo: checkConnectionStatus(opts = <IConnectionStatusOpts>{}): Promise<IConnectionStatus> {
  //   return this.router.checkConnectionStatus(opts); // TODO: not yet implemented
  // }

  getTransport(): RpcTransport | void {
    return this.router.transport;
  }

  stopTransport(): void {
    const transport = this.getTransport();
    transport && transport.stopTransport();
  }
  
  getSenderId(): string {
    return this._rootOpts.senderId;
  }

  get senderId(): string { // todo: deprecate/remove
    return this._rootOpts.senderId;
  }

  static registerTransport(transportType: string, transportFactory: (opts: any) => RpcTransport): void {
    registerTransport(transportType, transportFactory);
  }
}

export {
  LocalObserverTransport,
}
export * from './interfaces';