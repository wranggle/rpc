const { fork } = require('child_process');
const path = require('path');
const { IpcTransport } = require('../dist/cjs/ipc-transport.js');
const { WranggleRpc } = require('@wranggle/rpc-core');
const { IpcTestRpcChannel } = require('./test-support/child-process-fixture-script.js');


// NOTE: typescript trouble. IPC messages wouldn't work using ts-node through jest. It seems to fork the process but turns
//  off ipc.
// Easier to test this transport with round-trip rpc calls anyway, so avoiding ts here.
// DOWNSIDE: need to build/watch on change before runnign this test. The above IpcTransport and WranggleRpc require statements use dist build.


describe('@wranggle/rpc-ipc-transport', () => {
  let rpc;
  let child;

  beforeEach(() => {

    // Switching from typescript to javascript because it either can't find the module or fork IPC doesn't work.
    const pathToChild = path.resolve(__dirname, './test-support/child-process-fixture-script.js');

    child = fork(pathToChild);

    rpc = new WranggleRpc({
      transport: new IpcTransport({
        ipc: child,
      }),
      channel: IpcTestRpcChannel,
    });

    rpc.addRequestHandlerDelegate({
      subtractOne: async (val) => {
        return val - 1;
      },
      subtractTwo: async (val) => {
        return val - 2;
      }
    });

  });

  afterEach(() => {
    child && child.kill('SIGINT');
  });

  test('child does math', async () => {
    const remote = rpc.remoteInterface();
    const answer = await remote.addFive(4);
    expect(answer).toBe(9);
  });

  test('child calls parent over rpc while resolving subtraction rpc call', async () => {
    const remote = rpc.remoteInterface();
    const answer = await remote.subtractThree(7);
    expect(answer).toBe(4);
  });


});