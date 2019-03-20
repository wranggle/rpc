import PostMessageTransport, { PostMessageTransportOpts } from "./post-message-transport";
import registerShortcuts from './register-shortcuts';

registerShortcuts();


export default PostMessageTransport;
export {
  PostMessageTransport,
  PostMessageTransportOpts,
}
