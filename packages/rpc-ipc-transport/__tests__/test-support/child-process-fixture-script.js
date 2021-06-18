const { WranggleRpc } = require('@wranggle/rpc-core');
const { IpcTransport } = require('../../dist/cjs/ipc-transport.js');
const { IpcTestRpcChannel_1, IpcTestRpcChannel_2 } = require('./channels-for-tests');


const logStderr = (...msg) => {
  process.stderr.write(`[child ${process.pid}]: ${msg.join(' ')}\n\n`);
}

class ChildMath {

  async addFive(val) {
    return val + 5;
  }

  /**
   * Makes two rpc calls itself to return a result that subtracts a total of 3 from the original value.
   * @param val
   * @returns {Promise<*>}
   */
  async subtractThreeCallMeLazy(val) {
    const remote = this._parentRemote;
    if (!remote) {
      throw new Error('expecting rpc remote for parent process');
    }
    const a1 = await remote.subtractTwo(val);
    return await remote.subtractOne(a1);
  }

  setParentRemoteForCheating(remote) {
    this._parentRemote = remote;
  }

}

// logStderr('Setting up IpcTransport for two endpoints in child-process-fixture-script.js');

const transport = new IpcTransport({
  ipc: process,
  debug: true,
});


const rpc_2 = new WranggleRpc({
  transport,
  channel: IpcTestRpcChannel_2,
});

const rpc_1 = new WranggleRpc({
  transport,
  channel: IpcTestRpcChannel_1,
});


const math_1 = new ChildMath();
math_1.setParentRemoteForCheating(rpc_1.remoteInterface());
rpc_1.addRequestHandlerDelegate(math_1);

const math_2 = new ChildMath();
math_2.setParentRemoteForCheating(rpc_2.remoteInterface());
rpc_2.addRequestHandlerDelegate(math_2);


process.on('uncaughtException', (err, origin) => {
  logStderr(`uncaughtException event: ${ JSON.stringify({ err, origin }) }`);
  process.exit();
});
process.on('error', (err, origin) => {
  logStderr(`error event: ${ JSON.stringify({ err, origin }) }`);
  process.exit();
});
