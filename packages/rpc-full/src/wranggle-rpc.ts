import WranggleRpc from '@wranggle/rpc-core/src/core';
import BrowserExtensionTransport from '@wranggle/rpc-browser-extension-transport/src/browser-extension-transport';
import LocalObserverTransport from '@wranggle/rpc-core/src/local-observer-transport';
import PostMessageTransport from '@wranggle/rpc-post-message-transport/src/post-message-transport';
import ElectronTransport from '@wranggle/rpc-electron-transport/src/electron-transport';
import WebSocketTransport from '@wranggle/rpc-websocket-transport/src/websocket-transport';
import Relay from '@wranggle/rpc-relay/src/relay';


export default WranggleRpc;

// not sure if this is needed but the bundling and distributions are in flux and it might help..
Object.assign(WranggleRpc, {
  BrowserExtensionTransport,
  ElectronTransport,
  LocalObserverTransport,
  PostMessageTransport,
  Relay,
  WebSocketTransport,
  WranggleRpc,
});

export {
  BrowserExtensionTransport,
  ElectronTransport,
  LocalObserverTransport,
  PostMessageTransport,
  Relay,
  WebSocketTransport,
  WranggleRpc,
}


// type Klass = new (...args: any[]) => RpcTransport;
// todo: figure out how to extend/merge RpcOpts with transport shortcuts in typescript
// declare module "rpc-core/src/core" {
//   export class WranggleRpc {
//     protected constructor(rpcOpts?: Partial<RpcOptsWthTransports>);
//   }
// }
// export interface RpcOptsWthTransports extends RpcOpts {
//   localObserver?: LocalObserverTransportOpts;
// }
