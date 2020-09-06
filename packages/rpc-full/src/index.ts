import WranggleRpc, { LocalObserverTransport, LocalObserverTransportOpts } from '@wranggle/rpc-core';
import BrowserExtensionTransport, { BrowserExtensionTransportOpts } from '@wranggle/rpc-browser-extension-transport';
import ElectronTransport, {ElectronTransportOpts} from '@wranggle/rpc-electron-transport';
import IpcTransport, { IpcTransportOpts } from "@wranggle/rpc-ipc-transport";
import PostMessageTransport, {PostMessageTransportOpts} from '@wranggle/rpc-post-message-transport';
import WebSocketTransport, {WebSocketTransportOpts} from '@wranggle/rpc-websocket-transport';
import Relay, {RelayOpts} from '@wranggle/rpc-relay';


export * from '@wranggle/rpc-core';
export default WranggleRpc;
export {
  BrowserExtensionTransport, BrowserExtensionTransportOpts,
  ElectronTransport, ElectronTransportOpts,
  IpcTransport, IpcTransportOpts,
  PostMessageTransport, PostMessageTransportOpts,
  Relay, RelayOpts,
  WebSocketTransport, WebSocketTransportOpts,
  // should already be exported: WranggleRpc, LocalObserverTransport, LocalObserverTransportOpts,
}

// for UMD build, to permit references like: const { Relay } = WranggleRpc;
Object.assign(WranggleRpc, {
  BrowserExtensionTransport,
  ElectronTransport,
  IpcTransport,
  LocalObserverTransport,
  PostMessageTransport,
  Relay,
  WebSocketTransport,
  WranggleRpc,
});

// @ts-ignore
global.WranggleRpc = WranggleRpc;

// todo: figure out how to extend/merge typescript RpcOpts in each transport shortcut
