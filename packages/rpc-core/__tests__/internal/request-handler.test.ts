import RequestHandler, {MissingMethodErrorCode} from "../../src/internal/request-handler";
import {waitMs} from "../test-support/time-support";


describe('@wranggle/rpc-core/request-handler', () => {
  let requestHandler: RequestHandler;


  const fixturedBuild = () => {
    const handler = new RequestHandler();
    handler.addRequestHandlerDelegate(new SomeDelegatedClass());
    return handler;
  };

  beforeEach(() => {
    requestHandler = fixturedBuild();
  });

  test('use requested sync request handler', async () => {
    const result = await requestHandler.onValidatedRequest('hi', [ 'there' ]);
    expect(result).toBe('hi there');
  });

  test('async request handlers', async () => {
    const result = await requestHandler.onValidatedRequest('slowEcho', [ 2, 'hi' ]);
    expect(result).toBe('HI_hi');
  });

  test('prefer named handler over delegate', async () => {
    requestHandler.addRequestHandler('hi', (val) => `Higher ${val}`);
    const result = await requestHandler.onValidatedRequest('hi', [ 'priority' ]);
    expect(result).toBe('Higher priority');
  });

  test('pass along async/promise rejections', async () => {
    let err;
    await requestHandler.onValidatedRequest('slowReject', [ 1 ]).catch(reason => err = reason);
    expect(err).toBe('Halt!');
  });

  test('handle and decorate uncaught error in sync request handler', async () => {
    let err: any;
    requestHandler.requestHandlerOpts({ senderId: 'someEndpoint' });
    await requestHandler.onValidatedRequest('kaboom', []).catch(reason => err = reason);
    expect(err).toBeDefined();
    expect(err.endpoint).toBe('someEndpoint');
    expect(err.message).toBe('KABOOM!');
    expect(err.methodName).toBe('kaboom');
  });

  test('handle uncaught error in async request handler', async () => {
    let err: any;
    await requestHandler.onValidatedRequest('slowKaboom', [ 3 ]).catch(reason => err = reason);
    expect(err.message).toBe('kah...boom');
  });


  test('reject missing methods', () => {
    return requestHandler.onValidatedRequest('missing', []).catch(err => {
      expect(err.errorCode).toBe(MissingMethodErrorCode);
    });
  });

  describe('delegated handler', () => {
    test('search multiple delegates', async () => {
      requestHandler.addRequestHandlerDelegate(new AnotherDelegatedClass());
      const result = await requestHandler.onValidatedRequest('more', []);
      expect(result).toBe(true);
    });

    test('ignore inherited methods by default', async () => {
      requestHandler.addRequestHandlerDelegate(new ChildDelegateClass());
      let error;
      try {
        await requestHandler.onValidatedRequest('more', []);
      } catch (reason) {
        error = reason;
      }
      expect(error.errorCode).toBe(MissingMethodErrorCode);
    });

    test('ignore inherited methods by default', async () => {
      requestHandler.addRequestHandlerDelegate(new ChildDelegateClass());
      let error;
      try {
        await requestHandler.onValidatedRequest('more', []);
      } catch (reason) {
        error = reason;
      }
      expect(error.errorCode).toBe(MissingMethodErrorCode);
    });

    test('reject when shouldRun filter option returns false', () => {
      requestHandler.addRequestHandlerDelegate(new AnotherDelegatedClass(), { shouldRun: (...args: any) => false });
      return requestHandler.onValidatedRequest('more', []).catch(reason => {
        expect(reason.errorCode).toBe(MissingMethodErrorCode);
      });
    });

    test('permit method when shouldRun filter option returns true', async () => {
      requestHandler.addRequestHandlerDelegate(new AnotherDelegatedClass(), { shouldRun: () => true });
      const result = await requestHandler.onValidatedRequest('more', []);
      expect(result).toBe(true);
    });

    test('permit inherited methods when option enabled', async () => {
      requestHandler.addRequestHandlerDelegate(new ChildDelegateClass(), { ignoreInherited: false });
      const result = await requestHandler.onValidatedRequest('more', []);
      expect(result).toBe(true);
    });

    test('use delegate object as context by default', async () => {
      requestHandler.addRequestHandlerDelegate(new AnotherDelegatedClass());
      await requestHandler.onValidatedRequest('count', []);
      const result = await requestHandler.onValidatedRequest('count', []);
      expect(result).toBe(2);
    });

    test('accept passed in context as an option', async () => {
      requestHandler.addRequestHandlerDelegate(new AnotherDelegatedClass(), { context: { _count: 400 }});
      const result = await requestHandler.onValidatedRequest('count', []);
      expect(result).toBe(401);
    });

    test('do not permit calls to "constructor"', () => {
      return requestHandler.onValidatedRequest('constructor', [ 'val' ]).catch(reason => {
        expect(reason.errorCode).toBe(MissingMethodErrorCode);
      });
    });
  });

  describe('registering named/specific functions', () => {
    test('accept a "this" context', async () => {
      const fn = function () {
        // @ts-ignore
        this._count += 10;
        // @ts-ignore
        return this._count;
      };
      requestHandler.addRequestHandler('tenCount', fn, { context: { _count: 100 } });
      const result = await requestHandler.onValidatedRequest('tenCount', []);
      expect(result).toBe(110);
    });

    test('await callback when useCallback option present', async () => {
      const handler = (letter: string, cb: (err: any, result: any) => void) => {
        setTimeout(() => cb(null, `${letter}${letter}!`), 5);
      };
      requestHandler.addRequestHandler('oldschool', handler, { useCallback: true });
      const result = await requestHandler.onValidatedRequest('oldschool', [ 'n']);
      expect(result).toBe('nn!');
    });

    test('bulk register', async () => {
      const handlers = {
        aa: () => 11,
        bb: async () => 22,
      };
      requestHandler.addRequestHandlers(handlers);
      const res_aa = await requestHandler.onValidatedRequest('aa', []);
      const res_bb = await requestHandler.onValidatedRequest('bb', []);
      expect(res_aa).toBe(11);
      expect(res_bb).toBe(22);
    });
  });
});


class SomeDelegatedClass {

  constructor(val?: any) {
    if (val) {
      throw new Error('Should not call constructor');
    }
  }

  hi(val: string): string {
    return `hi ${val}`;
  }

  async slowEcho(ms: number, val: any): Promise<any> {
    await waitMs(ms);
    return `${val.toUpperCase()}_${val.toLowerCase()}`;
  }

  kaboom(): any {
    throw new Error('KABOOM!');
  }

  async slowReject(ms: number): Promise<any> {
    await waitMs(ms);
    return Promise.reject('Halt!')
  }

  async slowKaboom(ms: number, val: any): Promise<any> {
    await waitMs(ms);
    throw new Error('kah...boom');
  }
}


class AnotherDelegatedClass {
  _count = 0;

  hi(val: string) {
    return `goodbye ${val}`;
  }

  more(): boolean {
    return true;
  }

  count() {
    this._count += 1;
    return this._count;
  }
}

class ChildDelegateClass extends AnotherDelegatedClass {

}