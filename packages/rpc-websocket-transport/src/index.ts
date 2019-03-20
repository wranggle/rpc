import WebSocketTransport, {WebSocketTransportOpts} from "./websocket-transport";
import registerShortcuts from './register-shortcuts';

registerShortcuts();

export default WebSocketTransport;
export {
  WebSocketTransport,
  WebSocketTransportOpts
}