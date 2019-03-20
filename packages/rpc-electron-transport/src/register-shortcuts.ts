import WranggleRpc from '@wranggle/rpc-core';
import ElectronTransport, { ElectronTransportOpts } from "./electron-transport";


export default function registerShortcuts() {
  WranggleRpc.registerTransport('electron', (opts: ElectronTransportOpts) => new ElectronTransport(opts));
}