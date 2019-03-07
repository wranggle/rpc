import WranggleRpc from '@wranggle/rpc-core/src/core';
import BrowserExtensionTransport from '@wranggle/rpc-browser-extension-transport/src/browser-extension-transport';
import LocalObserverTransport from '@wranggle/rpc-core/src/local-observer-transport';
import PostMessageTransport from '@wranggle/rpc-post-message-transport/src/post-message-transport';
import ElectronTransport from '@wranggle/rpc-electron-transport/src/electron-transport';
import WebSocketTransport from '@wranggle/rpc-websocket-transport/src/websocket-transport';
import Relay from '@wranggle/rpc-relay/src/relay';

// I am fighting with Rollup on this... want to support WranggleRpc as a constructor, and also keep references to transports
//   and such on it in UMD build. (to support `new WranggleRpc()` and also `const { Relay } = WranggleRpc`
// This seems to work:
Object.assign(WranggleRpc, {
  BrowserExtensionTransport,
  ElectronTransport,
  LocalObserverTransport,
  PostMessageTransport,
  Relay,
  WebSocketTransport,
  WranggleRpc,
});
export default WranggleRpc;

// @ts-ignore
global.WranggleRpc = WranggleRpc;


// todo: figure out how to extend/merge typescript RpcOpts in each transport shortcut
// type Klass = new (...args: any[]) => RpcTransport;
// declare module "rpc-core/src/core" {
//   export class WranggleRpc {
//     protected constructor(rpcOpts?: Partial<RpcOptsWthTransports>);
//   }
// }
// export interface RpcOptsWthTransports extends RpcOpts {
//   localObserver?: LocalObserverTransportOpts;
// }
