import WebSocketTransport, {WebSocketTransportOpts} from "./websocket-transport";
import WranggleRpc from '@wranggle/rpc-core';


export default function registerShortcuts() {
  WranggleRpc.registerTransport('websocket', (opts: WebSocketTransportOpts) => new WebSocketTransport(opts));
}