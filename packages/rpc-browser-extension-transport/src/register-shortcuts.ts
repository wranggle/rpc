import WranggleRpc from "@wranggle/rpc-core";
import BrowserExtensionTransport, { BrowserExtensionTransportOpts } from './browser-extension-transport';


export default function registerShortcuts() {
  WranggleRpc.registerTransport('browserExtension', (opts: BrowserExtensionTransportOpts) => new BrowserExtensionTransport(opts));
}