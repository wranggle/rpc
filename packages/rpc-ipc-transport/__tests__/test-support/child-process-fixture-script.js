const { WranggleRpc } = require('@wranggle/rpc-core');
const { IpcTransport } = require('../../dist/cjs/ipc-transport.js');

const IpcTestRpcChannel = 'IpcTestRpcChannel';

class ChildMath {

  async addFive(val) {
    return val + 5;
  }

  async subtractThree(val) {
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


const rpc = new WranggleRpc({
  transport: new IpcTransport({
    ipc: process,
  }),
  channel: IpcTestRpcChannel,
});

const math = new ChildMath();
math.setParentRemoteForCheating(rpc.remoteInterface());
rpc.addRequestHandlerDelegate(math);


setTimeout(() => {
  console.warn('child-process-fixture-script should not still be running');
  process.exit(1);
}, 3000);


module.exports = {
  IpcTestRpcChannel,
}