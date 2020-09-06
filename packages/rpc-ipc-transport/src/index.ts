import IpcTransport, { IpcTransportOpts } from "./ipc-transport";
import registerShortcuts from './register-shortcuts';

registerShortcuts();

export default IpcTransport;
export {
  IpcTransport,
  IpcTransportOpts,
}
