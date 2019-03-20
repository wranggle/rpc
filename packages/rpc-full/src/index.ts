import WranggleRpc, { LocalObserverTransport, LocalObserverTransportOpts } from '@wranggle/rpc-core';
import BrowserExtensionTransport, { BrowserExtensionTransportOpts } from '@wranggle/rpc-browser-extension-transport';
import PostMessageTransport, {PostMessageTransportOpts} from '@wranggle/rpc-post-message-transport';
import ElectronTransport, {ElectronTransportOpts} from '@wranggle/rpc-electron-transport';
import WebSocketTransport, {WebSocketTransportOpts} from '@wranggle/rpc-websocket-transport';
import Relay, {RelayOpts} from '@wranggle/rpc-relay';


export * from '@wranggle/rpc-core';
export default WranggleRpc;
export {
  BrowserExtensionTransport, BrowserExtensionTransportOpts,
  ElectronTransport, ElectronTransportOpts,
  PostMessageTransport, PostMessageTransportOpts,
  Relay, RelayOpts,
  WebSocketTransport, WebSocketTransportOpts,
  // should already be exported: WranggleRpc, LocalObserverTransport, LocalObserverTransportOpts,
}

// for UMD build, to permit references like: const { Relay } = WranggleRpc;
Object.assign(WranggleRpc, {
  BrowserExtensionTransport,
  ElectronTransport,
  LocalObserverTransport,
  PostMessageTransport,
  Relay,
  WebSocketTransport,
  WranggleRpc,
});

// @ts-ignore
global.WranggleRpc = WranggleRpc;

// todo: figure out how to extend/merge typescript RpcOpts in each transport shortcut
