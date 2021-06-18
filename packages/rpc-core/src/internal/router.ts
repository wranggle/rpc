import RemoteRequest from "./remote-request";
import {buildTransport} from "./transport-construction";
import {
  IDict,
  RequestPayload,
  ResponsePayload,
  RemotePromise,
  RpcOpts,
  RpcTransport,
  ConnectionStatus,
  ConnectionStatusOpts,
  EndpointInfo,
  DebugHandler,
  LogActivity,
  DebugHandlerActivityData,
  RpcChannel
} from "../interfaces";
import {buildDebugHandler} from "../util/logging-support";
// @ts-ignore
import kvid from "kvid";


const Protocol = 'WranggleRpc-1';

export interface CommonPayload {
  protocol: string;
  senderId: string;
  channel: string;
  methodName: string;
  transportMeta: IDict<any>;
  // perhaps add option: forEndpoint?: string;
}
interface IRouterOpts {
  onValidatedRequest: (methodName: string, userArgs: any[]) => Promise<any>;
}

type PreparseFilter = (rawPayload: RequestPayload | ResponsePayload) => boolean | RequestPayload | ResponsePayload;

export default class Router {
  private _pendingRequests = <IDict<RemoteRequest>>{};
  private _finishedRequestIds = new Set<string>(); // todo: @wranggle/rotating-cache to clear/expire (not very big but a memory leak as written.)
  transport?: RpcTransport | void;
  private _stopped = false;
  private _rootOpts = <Partial<RpcOpts>>{};
  private _onValidatedRequest: (methodName: string, userArgs: any[]) => Promise<any>;
  private _preparseFilters = <PreparseFilter[]>[];
  private debugHandler?: DebugHandler | false;

  constructor(opts: IRouterOpts) {
    this._onValidatedRequest = opts.onValidatedRequest;
  }

  useTransport(transportOpts: RpcTransport | object | string, channel: RpcChannel) {
    const transport = this.transport = buildTransport(transportOpts);
    transport.endpointSenderId = transport.endpointSenderId || `transport:${kvid(12)}`; // only used for debug output. todo: rename endpointSenderId to transportUid
    if (transport.debugHandler === void(0)) {
      transport.debugHandler = buildDebugHandler(transport.constructor.name, this._rootOpts.debug);
    }
    transport.listen(this._onMessage.bind(this), channel);
    // todo: send handshake message?
  }


  stopEndpoint() {
    this._stopped = true;
  }

  stopTransport(): void {
    if (this.transport) {
      this.transport.stopTransport();
      this.transport = void(0);
    }
  }

  sendRemoteRequest(req: RemoteRequest): RemotePromise<any> {
    if (req.isRsvp()) {
      this._pendingRequests[req.requestId] = req;
    }
    const requestPayload = req.buildPayload(this._basePayloadData());
    const receipt = req.flightReceipt();
    setTimeout(() => { // using nextTick so receipt will be able to update requestOpts like rsvp before it's already sent
      if (this.transport) {
        req.markAsSent();
        this.transport.sendMessage(requestPayload);
      } else {
        throw new Error('Rpc transport not set up');
      }
    }, 0);
    return receipt as RemotePromise<any>;
  }

  checkConnectionStatus(opts=<ConnectionStatusOpts>{}): Promise<ConnectionStatus> {
    // todo: implement (do ping-pong check, making sure router does not call onValidatedRequest)
    // do not Reject for timeout, just mark data as bad connection. (Default timeout? 500?)
    // some data to include: isConnected; response time; lastMessageReceivedAt; pingPongResponseTime; endpoint data (senderId, protocol, channel) for local and for remote; timestamp;
    return Promise.resolve({ todo: 'implement this' });
  }

  routerOpts(opts: Partial<RpcOpts>) {
    this._rootOpts = Object.assign(this._rootOpts, opts);
    opts.transport && this.useTransport(opts.transport, this.channel);
    if (typeof opts.preparseAllIncomingMessages === 'function') {
      this._preparseFilters.push(opts.preparseAllIncomingMessages);
    }
    if (opts.hasOwnProperty('debug')) {
      this.debugHandler = buildDebugHandler('WranggleRpc:core', opts.debug as any);
    }
  }

  pendingRequestIds(): string[] {
    return Object.keys(this._pendingRequests);
  }

  get senderId() {
    return this._rootOpts.senderId;
  }

  get channel(): RpcChannel {
    return this._rootOpts.channel as RpcChannel;
  }
  
  private _onMessage(payload: any): void {
    if (this._stopped) {
      return;
    }
    if (!this._isForUs(payload)) {
      this._debug(LogActivity.IgnoringPayload, { message: `Ignoring payload intended for other recipient`, payload });
      return;
    }
    let parsedPayload = payload;
    this._preparseFilters.forEach(filter => {
      let current;
      if (parsedPayload === false) {
        this._debug(LogActivity.ReceivedInvalidPayload, { message: `Payload failed to pass optional preparseFilter`, payload });
        return;
      }
      try {
        current = filter.call(null, parsedPayload);
      } catch (error) {
        this._debug(LogActivity.ReportError, { message: `Error in preparseAllIncomingMessages filter: ${error.message}`, error });
        current = false;
      }
      if (typeof current === 'object') {
        parsedPayload = current;
      } else if (current !== true) {
        parsedPayload = false;
      }
    });
    if (parsedPayload.requestId) {
      this._receiveRequest(parsedPayload as RequestPayload);
    } else if (parsedPayload.respondingTo) {
      this._receiveResponse(parsedPayload as ResponsePayload);
    }
  }

  private _receiveRequest(payload: RequestPayload): void {
    const requestId = payload.requestId;
    if (this._finishedRequestIds.has(requestId)) {
      return; // warn/error of duplicate message?
    }
    this._finishedRequestIds.add(requestId);
    this._onValidatedRequest(payload.methodName, payload.userArgs)
      .then((...resolveArgs: any[]) => this._handleRsvp(payload, null, resolveArgs))
      .catch((reason: any) => this._handleRsvp(payload, reason, []));
  }

  private _handleRsvp(requestPayload: RequestPayload, error: any, resolveArgs: any[] | void): void {
    if (!requestPayload.rsvp) {
      return; // todo: log/debug option
    }
    if (!this.transport) {
      return;
    }
    const { requestId, methodName } = requestPayload;
    const response = Object.assign(this._basePayloadData(), {
      methodName,
      error, resolveArgs: resolveArgs,
      senderId: this.senderId,
      respondingTo: requestId,
    }) as ResponsePayload;
    this.transport.sendMessage(response);
  }

  private _receiveResponse(response: ResponsePayload): void {
    const requestId = response.respondingTo;
    const req = this._pendingRequests[requestId];
    if (!req || !req.isRsvp()) { // todo: log/warn?
      return;
    }
    delete this._pendingRequests[requestId];
    req.responseReceived(response.error, ...(response.resolveArgs || []));
  }

  private _basePayloadData(): Partial<RequestPayload | ResponsePayload> {
    const { channel, senderId } = this;
    return {
      channel, senderId,
      protocol: Protocol,
      transportMeta: {},
    };
  }

  private _isForUs(payload: CommonPayload): boolean {
    if (typeof payload !== 'object' || payload.protocol !== Protocol) {
      return false;
    }
    const { senderId, channel } = this;
    if (!payload.senderId || payload.senderId === senderId) { // ignore echos on channel. todo: option to log/warn?
      return false;
    }
    if (!payload.channel || payload.channel !== channel) {
      return false;
    }
    // todo: forEndpoint option? if (payload.forEndpoint && payload.forEndpoint !== senderId) { return false; }
    return true;
  }

  private endpointInfo(): EndpointInfo {
    return {
      senderId: this.senderId as string
    };
  }

  private _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    this.debugHandler(Object.assign({
      activity,
      endpointSenderId: this.senderId,
      channel: this.channel,
    }, data));
  }
}

export {
  Protocol
};