import {CommonPayload} from "./internal/router";
import {DebugOpts} from "./util/logging-support";


export interface RpcOpts {
  /**
   * Channel name or id. Unless the remote endpoint uses the exact same *channel* value, WranggleRpc will ignore its remote requests. *channel*.
   */
  channel: RpcChannel;

  /**
   * A default
   */
  allRequestOpts: RequestOpts;

  /**
   * Function/hook to modify or filter RPC request and response messages. It runs after the transport receives the message (and possibly does its own
   * filtering) and after WranggleRpc verifies it is a properly formatted message but before the data is used.
   *
   * It can return a modified payload or a boolean. Return false to invalidate and ignore the received message, return true
   * to use the passed-in payload.
   *
   */
  preparseAllIncomingMessages: (rawPayload: RequestPayload | ResponsePayload) => boolean | RequestPayload | ResponsePayload;


  /**
   * A string included on message payload.  Generated randomly by default but can be specified here for debug purposes.
   * Value must be different from the other endpoint.
   */
  senderId: string;


  /**
   * Shortcut for calling `wranggleRpc.useTransport`.
   */
  transport: RpcTransport | object | string;

  debug?: DebugHandler | DebugOpts | boolean;


// ~~~~~~~~~~~~~~~~~ placeholder hack. todo: move to packages/rpc-full
  // I'm getting near my self-imposed time cap for this project and am hitting build/typescript problems. So throwing existing transports in here for now. Thought I'd use declarations-merging to extend RpcOpts for each transport but my first attempts haven't worked.
  /**
   * Shortcut for constructing BrowserExtensionTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  chrome: TransportConstructionOpts,
  /**
   * Shortcut for constructing BrowserExtensionTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  browserExtension: TransportConstructionOpts,

  /**
   * Shortcut for constructing ElectronTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  electron: TransportConstructionOpts,

  /**
   * Shortcut for constructing PostMessageTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  postMessage: TransportConstructionOpts,


  /**
   * Shortcut for constructing LocalObserverTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  localObserver: TransportConstructionOpts,

  /**
   * Shortcut for constructing LocalObserverTransport instance.
   * todo: figure out how to extend typescript RpcOpts interface with actual constructor opts in that package.
   */
  websocket: TransportConstructionOpts,
}
type TransportConstructionOpts = any;

export type RpcChannel = string;

export interface IDict<T> {
  [key: string]: T;
}

export interface RemotePromise<T> extends Promise<T> {

  /**
   * Set or update timeout for a single request.
   * Note: you can set a default timeout for all WranggleRpc requests using `rpc.opts` or by method name using `wranggleRpc.setDefaultRequestOptsForMethod`
   * @param ms Duration in milliseconds.
   */
  updateTimeout(ms: number): void;

  /**
   * Has a response been received yet/
   */
  isPending(): boolean;

  /**
   * Further details about the remote request. (See `RequestInfo`)
   */
  info(): RequestInfo;

  forceResolve(...results: any[]): void;

  forceReject(reason: any): void;
}

export interface RequestInfo {
  requestId: string;
  requestedAt: Date;
  completedAt?: Date;
  status: RequestStatus;
  requestPayload: RequestPayload;
  // include methodName and args?
}

export interface DelegatedRequestHandlerOpts {

  /**
   * Ignores inherited methods, using Object.hasOwnProperty checks.
   */
  ignoreInherited?: boolean;

  /**
   * Ignores methods beginning with an underscore "_".
   */
  ignoreWithUnderscorePrefix?: boolean;

  /**
   * Custom filter to determine if it's ok to call a method on the delegate object. It is applied after the above
   * built-in filters run/pass. When provided, the method runs if the filter returns `true`.
   * @param delegate
   * @param methodName
   * @param methodArgs
   */
  shouldRun?: Set<string> | string[] | ((methodName: string, delegate: object, ...methodArgs: any[]) => boolean);

  /**
   * Override `this` binding on the delegate object when it is called.
   */
  context?: any;
}

export interface NamedRequestHandlerOpts {

  /**
   * When true, a Node.js style callback is added as the last parameter. When false, the function's result is used for the response. Default is false.
   */
  useCallback?: boolean;

  /**
   * Set `this` binding on the function. Reminder: cannot set "this" for arrow functions.
   */
  context?: any;
}


export interface RequestOpts {
  /**
   * Time in ms. If set to a positive number, the request will result in a TimeoutError should it not receive a response in the specified time
   * Default -1, no timeout.
   */
  timeout?: number;

  /**
   * When true, expect a response from the remote RPC instance. A failure timeout will be set if that option was set.
   * When false, the request is immediately assumed to have succeeded or failed, based on if the rpc connection was established
   * or not.
   */
  rsvp?: boolean;
}

export type TransportMessageHandler = (payload: RequestPayload | ResponsePayload) => void;
/**
 * Shortcut to setting up both messageSender and messageReceiver
 */
export interface RpcTransport {
  sendMessage(payload: RequestPayload | ResponsePayload): void;

  listen(msgHandler: TransportMessageHandler, channel: RpcChannel): void;

  stopTransport(): void;

  endpointSenderId: string | void;

  /**
   * Multiplexing transports (ones where a single transport is shared by many WranggleRpc endpoints) will offer removeEndpointHandler
   *
   * @param channel
   */
  removeEndpointHandler?: (channel: RpcChannel) => void;

  debugHandler?: DebugHandler | false;
  // todo: reportDisconnect? connection status? decide where to keep features like heartbeat
}


export interface RequestPayload extends CommonPayload {
  requestId: string;
  userArgs: any[];
  rsvp: boolean;
}

export interface ResponsePayload extends CommonPayload {
  respondingTo: string;
  error?: any;
  resolveArgs?: any[];
}

export interface EndpointInfo {
  senderId: string;
}

export interface ConnectionStatus {

}
export interface ConnectionStatusOpts {
  timeout: number;
}



export enum RequestStatus {
  Pending = 'Pending',
  RemoteError = 'RemoteError',
  RemoteResult = 'RemoteResult',
  ForcedError = 'ForcedError',
  ForcedResult = 'ForcedResult',
  TimeoutError = 'TimeoutError',
  SkipRsvp = 'SkipRsvp',
}


export type DebugHandler = (data: DebugHandlerActivityData) => void;

export enum LogActivity {
  TransportSendingPayload = 'TransportSendingPayload',
  TransportReceivingMessage = 'TransportReceivingMessage',
  TransportStopping = 'TransportStopping',
  TransportIgnoringMessage = 'TransportIgnoringMessage',
  RelaySendingPayload = 'RelaySendingPayload',
  RelayIgnoringMessage = 'RelayIgnoringMessage ',

  ReceivedInvalidPayload = 'ReceivedInvalidPayload',
  IgnoringPayload = 'IgnoringPayload',

  Misc = 'MiscActivity',

  ReportWarning = 'Warning',
  ReportError = 'Error',
}

export interface DebugHandlerActivityData {
  activity?: LogActivity;
  payload?: RequestPayload | ResponsePayload;
  endpointSenderId?: string;
  originator?: string;
  message?: string;
  // todo: ignoreFilteredPayloads?: boolean;
  [key: string]: any;
}

