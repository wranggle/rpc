import {DelegatedRequestHandlerOpts, IDict, NamedRequestHandlerOpts, RpcOpts} from "../interfaces";
import buildPromiseResolver from "../util/promise-resolver";


interface IRequestHandlerDelegateHolder {
  delegate: object;
  opts: DelegatedRequestHandlerOpts;
}

const MissingMethodErrorCode = 'MethodNotFound'; // todo: move to constants or a custom error type

const DefaultDelegateOpts = {
  ignoreWithUnderscorePrefix: true,
  ignoreInherited: true,
};

interface NamedRequestHandlerHolder extends NamedRequestHandlerOpts {
  fn: (...args: any[]) => any;
}
export default class RequestHandler {
  private _rootOpts=<Partial<RpcOpts>>{};
  private _requestHandlerDelegateHolders=<IRequestHandlerDelegateHolder[]>[];
  private _namedRequestHandlerHolderByMethodName = <IDict<NamedRequestHandlerHolder>>{};


  requestHandlerOpts(opts: Partial<RpcOpts>) {
    this._rootOpts = opts;
  }

  addRequestHandlerDelegate(delegate: any, opts?: DelegatedRequestHandlerOpts): void {
    if (typeof delegate !== 'object') {
      throw new Error('Expecting an object containing request handlers');
    }
    opts = Object.assign({ context: delegate }, DefaultDelegateOpts, opts);
    if (Array.isArray(opts.shouldRun)) {
      opts.shouldRun = new Set(opts.shouldRun);
    }
    this._requestHandlerDelegateHolders.push({ delegate, opts });
  }

  addRequestHandler(methodName: string, fn: (...args: any[]) => any, opts=<NamedRequestHandlerOpts>{}): any {
    // note: intentionally accepts "_" prefix method names
    this._namedRequestHandlerHolderByMethodName[methodName] = { fn, ...opts };
  }

  addRequestHandlers(fnByMethodName: IDict<(...args: any[]) => any>, opts?: NamedRequestHandlerOpts): any {
    Object.keys(fnByMethodName).forEach((methodName) => {
      if (methodName.charAt(0) !== '_') {
        this.addRequestHandler(methodName, fnByMethodName[methodName], opts);
      }
    });
  }

  onValidatedRequest(methodName: string, userArgs: any[]): Promise<any> {
    if (!methodName || methodName === 'constructor') {
      return Promise.reject({ errorCode: MissingMethodErrorCode, methodName });
    }
    userArgs = userArgs || [];

    const namedHolder = this._namedRequestHandlerHolderByMethodName[methodName];
    let { fn, context, useCallback } = (namedHolder || {} as NamedRequestHandlerHolder);
    if (!fn) {
      const delegateHolder = this._requestHandlerDelegateHolders.find((holder: IRequestHandlerDelegateHolder): boolean => {
        const { delegate, opts } = holder;
        if (typeof (delegate as any)[methodName] !== 'function') {
          return false;
        }
        if (opts.ignoreWithUnderscorePrefix && methodName.charAt(0) === '_') {
          return false;
        }
        if (opts.ignoreInherited && !(delegate.hasOwnProperty(methodName) || Object.getPrototypeOf(delegate).hasOwnProperty(methodName))) {
          return false;
        }
        if (_isPermissionSet(opts.shouldRun) && !(opts.shouldRun as any).has(methodName)) {
          return false;
        } else if (typeof opts.shouldRun === 'function' && opts.shouldRun.call(null, methodName, delegate, ...userArgs) !== true) {
          return false;
        }
        return true;
      });
      if (delegateHolder) {
        fn = (<any>delegateHolder.delegate)[methodName];
        context = delegateHolder.opts.context === undefined ? delegateHolder.delegate : delegateHolder.opts.context;
      }
    }
    if (!fn) {
      return Promise.reject({errorCode: MissingMethodErrorCode, methodName});
    } else {
      try {
        if (useCallback) {
          const { promise, resolve, reject } = buildPromiseResolver();
          userArgs.push((err: any, ...results: any[]) => {
            if (err) {
              reject(err);
            } else {
              resolve(...results);
            }
          });
          fn.apply(context, userArgs);
          return promise;
        } else {
          return Promise.resolve(fn.apply(context, userArgs)).catch(reason => {
            if (typeof reason === 'object' && (reason.stack || reason instanceof Error)) {
              return Promise.reject(this._applyUncaughtErrorData(reason, {methodName}));
            } else {
              return Promise.reject(reason);
            }
          });
        }
      } catch (error) {
        // todo: use debugHandler { message: `Uncaught error in "${methodName}" request handler`, error }
        return Promise.reject(this._applyUncaughtErrorData(error, { methodName }));
      }
    }
  }

  get senderId() {
    return this._rootOpts.senderId;
  }

  _applyUncaughtErrorData(err: any, extra: any) {
    const { message, fileName, lineNumber } = err;
    return  Object.assign({
      errorCode: err.errorCode || (!err.name || err.name === 'Error' ? 'UncaughtError' : err.name),
      endpoint: this.senderId,
    }, err, { message, fileName, lineNumber }, extra);
  }
}

function _isPermissionSet(obj: any): boolean {
  return obj && [ 'has', 'keys' ].every(k => typeof obj[k] === 'function');
}

export {
  MissingMethodErrorCode,
}