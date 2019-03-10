// @ts-ignore
const WranggleRpcCjs = require('../dist/wranggle-rpc.cjs.js').WranggleRpc;
import { EventEmitter } from 'events';

describe('@wranggle/rpc-full dist', () => {
  let localObserver;
  beforeEach(() => {
    localObserver = new EventEmitter();
  });


  test('cjs', () => {
    expect(typeof WranggleRpcCjs).toBe('function');
    // @ts-ignore
    const rpc = new WranggleRpcCjs<any>({ localObserver });
    expect(typeof rpc.remoteInterface).toBe('function');
  });

  // todo: fix... and after test, clear the global it sets
  // test('umd', () => {
  //   // @ts-ignore
  //   const WranggleRpcUmd = require('../dist/wranggle-rpc.min.js').WranggleRpc;
  //   expect(typeof WranggleRpcUmd).toBe('function');
  //   // @ts-ignore
  //   const rpc = new WranggleRpcUmd<any>({ localObserver });
  //   expect(typeof rpc.remoteInterface).toBe('function');
  // });

  // test('named and default import', () => {
  //   expect(WranggleRpc).toEqual(WranggleRpcDefault);
  // });

});

