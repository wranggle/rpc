import {RequestInfo, RequestPayload, RemotePromise, RequestStatus, RequestOpts} from "../interfaces";
import buildPromiseResolver, {PromiseResolver} from "../util/promise-resolver";
import { composeExtendedPromise } from '../util/composition-util';


const TimeoutErrorCode = 'RemoteMethodTimeoutError'; // todo: to constants or custom error

export interface FlightReceiptOpts {
  payload: RequestPayload;
  promiseSent: Promise<any>;
  updateRequestOpts: (opts: RequestOpts) => void;
  nodejsCallback?: (...args: any[]) => void;
}

export default class FlightReceipt {
  private readonly payload!: RequestPayload;
  private readonly updateRequestOpts!: (opts: RequestOpts) => void;
  private readonly nodejsCallback!: void | ((...args: any[]) => void);
  private readonly _promiseSent!: Promise<undefined>;
  private readonly responseResolver: PromiseResolver;
  private readonly requestedAt: number;

  private completedAt?: number;
  private status = RequestStatus.Pending;
  private _timer?: number | null;

  constructor(opts: FlightReceiptOpts) {
    const { payload, updateRequestOpts, nodejsCallback } = opts;
    Object.assign(this, { payload, updateRequestOpts, nodejsCallback });
    this._promiseSent = opts.promiseSent;
    this.requestedAt = Date.now();
    this.responseResolver = buildPromiseResolver();

    if (this.rsvp === false) {
      this._markResolution(RequestStatus.SkipRsvp, null);
    }
  }

  isPending(): boolean {
    return this.status === RequestStatus.Pending;
  }

  info(): RequestInfo {
    const { requestedAt, completedAt, status, payload } = this;

    return {
      requestId: payload.requestId,
      requestedAt: new Date(requestedAt),
      completedAt: completedAt ? new Date(completedAt) : void(0),
      status,
      requestPayload: payload
    };
  }


  forceResolve(...results: any[]): void {
    this._markResolution(RequestStatus.ForcedResult, null, ...results);
    // todo: _nodejsCallback case
  }

  forceReject(reason: any): void {
    this._markResolution(RequestStatus.ForcedError, reason);
    // todo: _nodejsCallback case
  }

  // todo: change rsvp / request opts. note: in next tick. Maybe RemoteRequest will pass in a callback for setting its own options, one that throws if already sent
  // opts(requestOpts: RequestOpts) {
  //
  // }

  updateTimeout(ms: number): void {
    if (typeof this._timer === 'number') {
      clearTimeout(this._timer);
    }
    if (typeof ms === 'number' && ms > 0) {
      // @ts-ignore
      this._timer = setTimeout(() => this._markResolution(RequestStatus.TimeoutError, TimeoutErrorCode), ms);
    }
  }

  get rsvp() {
    return this.payload.rsvp;
  }

  requestOpts(opts: RequestOpts) {
    this.updateRequestOpts(opts);
  }
  promiseSent(): Promise<undefined> {
    return this._promiseSent;
  }

  _decoratedPromise(): RemotePromise<any> {
    const promise = this.responseResolver.promise;
    this._ensurePromiseDecorated(promise);
    // @ts-ignore
    return promise;
  }

  _remoteResponseReceived(error: any, ...result: any[]): void {
    this._markResolution(error ? RequestStatus.RemoteError : RequestStatus.RemoteResult, error, ...result);
  }


  private _ensurePromiseDecorated(promise: Promise<any>): void {
    // @ts-ignore
    if (typeof promise.forceResolve === 'function') {
      return;
    }
    composeExtendedPromise(promise, this, FlightReceipt.prototype);

    // notes:
    // I first tried to make this class extend Promise. TypeScript made it awkward to stash the resolve/reject executor params
    // complaining about anything before super. Got past that with an extra superclass to do the stashing (alternatively it could
    // use plain js with prototype acrobatics) but the resulting behavior was broken. (eg, await would accept the promise but
    // would clobber any resulting value.) Lots posted on the subject but I decided to drop that line for now, just copying
    // the desired methods onto the promise.
    //
    // Alternatively, can maybe try `implements Promise`. ts declarations for them would be:
    // then!: <TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null) => Promise<TResult1 | TResult2>;
    // catch!: <TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null) => Promise<any | TResult>;
    // finally!: (onfinally?: (() => void) | undefined | null) => Promise<any>;
    // also: readonly [Symbol.toStringTag]: "Promise";
  }

  private _markResolution(status: RequestStatus, error: any, ...result: any[]): void {
    if (!this.isPending()) {
      return; // warn/error/throw if resolved more than once? Maybe only if forced locally? (when you prob want to ignore the late-arriving remote response.)
    }
    this.completedAt = this.rsvp ? Date.now() : this.requestedAt;
    this.status = status;

    // todo: track and use timeout only when needed (when request opts change after remote request created)
    setTimeout(() => { // needs to be in nextTick because sendRemoteRequest uses a nextTick and that should execute first.
      const { resolve, reject } = this.responseResolver;
      if (error) {
        try {
          reject(error);
        } catch (err) {
          // todo: use debugHandler
          console.error('Uncaught error in rejected RemotePromise', this.info(), err);
        }
      } else {
        try {
          resolve(...result);
        } catch (err) {
          // todo: use debugHandler
          console.error('Uncaught error in RemotePromise response handler', this.info(), err);
        }
      }
    }, 0);
  }

}

// aliases, just in case someone is actually using it (doubtful, very few downloads)
// @ts-ignore
FlightReceipt.prototype.resolveNow = FlightReceipt.prototype.forceResolve;
// @ts-ignore
FlightReceipt.prototype.rejectNow = FlightReceipt.prototype.rejectNow;

export {
  TimeoutErrorCode
}