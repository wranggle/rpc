const { fork } = require('child_process');
const path = require('path');
const { IpcTransport } = require('../dist/cjs/ipc-transport.js');
const { WranggleRpc } = require('@wranggle/rpc-core');
const { IpcTestRpcChannel_1, IpcTestRpcChannel_2 } = require('./test-support/channels-for-tests');


// NOTE: typescript trouble. IPC messages wouldn't work using ts-node through jest. It seems to fork the process but turns
//  off ipc.
// Easier to test this transport with round-trip rpc calls anyway, so avoiding ts here.
// DOWNSIDE: need to build/watch on change before running this test. The above IpcTransport and WranggleRpc require statements use dist build.


describe('@wranggle/rpc-ipc-transport', () => {
  let rpc_1;
  let child;
  let handlerCalls;
  
  const buildHandler = (callTrackingArray) => ({
    subtractOne: async (val) => {
      callTrackingArray.push({ method: 'subtractOne', val });
      return val - 1;
    },
    subtractTwo: async (val) => {
      callTrackingArray.push({ method: 'subtractTwo', val });
      return val - 2;
    }
  });

  beforeEach(async () => {
    handlerCalls = [];
    // Switching from typescript to javascript because it either can't find the module or fork IPC doesn't work.
    const pathToChild = path.resolve(__dirname, './test-support/child-process-fixture-script.js');
    child = fork(pathToChild);


    child.on('uncaughtException', err => {
      console.log('uncaughtException in child process', err);
      // perhaps push to test data array and assert it is empty
    });
    child.on('error', err => {
      console.log('error in child process', err);
    });

    await new Promise((resolve) => {
      child.on('spawn', () => resolve(child.pid));
    });
    
    rpc_1 = new WranggleRpc({
      transport: new IpcTransport({
        ipc: child,
        debug: true,
      }),
      channel: IpcTestRpcChannel_1,
    });

    rpc_1.addRequestHandlerDelegate(buildHandler(handlerCalls));
  });

  afterEach(async () => {
    // await new Promise((resolve) => { // tmp - rm!
    //   setTimeout(() => resolve(true), 600)
    // });
    child && child.kill('SIGINT');
  });

  test('child does math', async () => {
    const remote = rpc_1.remoteInterface();
    const answer = await remote.addFive(4);
    expect(answer).toEqual(9);
    expect(handlerCalls).toHaveLength(0); // child does not make rpc calls to parent
  });

  test('child calls parent over rpc while resolving subtraction rpc call', async () => {
    const remote = rpc_1.remoteInterface();
    const answer = await remote.subtractThreeCallMeLazy(7);
    expect(answer).toEqual(4);
    expect(handlerCalls).toHaveLength(2); // note: child request handler makes two calls to parent (see child-process-fixture-script.js)
  });

  test("multiple endpoints sharing same transport", async () => {
    let callStack_2 = [];
    const rpc_2 = new WranggleRpc({
      transport: rpc_1.getTransport(),
      channel: IpcTestRpcChannel_2,
    });
    rpc_2.addRequestHandlerDelegate(buildHandler(callStack_2));
    
    const answer = await rpc_1.remoteInterface().subtractThreeCallMeLazy(4);
    expect(answer).toEqual(1);
    expect(handlerCalls).toHaveLength(2);
    expect(callStack_2).toHaveLength(0);

    await rpc_2.remoteInterface().subtractThreeCallMeLazy(5);
    expect(callStack_2).toHaveLength(2);
    expect(handlerCalls).toHaveLength(2);
  });

  test("optional sendMessageOverride", async () => {
    const sendOverrides = [];
    const rpc_2 = new WranggleRpc({
      transport: new IpcTransport({
        ipc: child,
        sendMessageOverride: (msg) => {
          sendOverrides.push(msg)
          child.send(msg);
        },
      }),
      channel: IpcTestRpcChannel_2,
    });
    const answer = await rpc_2.remoteInterface().addFive(5);
    expect(sendOverrides).toHaveLength(1);
    expect(answer).toEqual(10);
  });

});