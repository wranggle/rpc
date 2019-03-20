import WranggleRpc from "@wranggle/rpc-core";
import PostMessageTransport, { PostMessageTransportOpts } from "./post-message-transport";


export default function registerShortcuts() {
  WranggleRpc.registerTransport('postMessage', (opts: PostMessageTransportOpts) => new PostMessageTransport(opts));
}

