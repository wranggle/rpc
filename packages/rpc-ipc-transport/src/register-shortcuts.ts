import WranggleRpc from '@wranggle/rpc-core';
import IpcTransport, { IpcTransportOpts } from "./ipc-transport";


export default function registerShortcuts() {
  WranggleRpc.registerTransport('ipc', (opts: IpcTransportOpts) => new IpcTransport(opts));
}