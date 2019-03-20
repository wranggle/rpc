import ElectronTransport, { ElectronTransportOpts } from "./electron-transport";
import registerShortcuts from './register-shortcuts';

registerShortcuts();

export default ElectronTransport;
export {
  ElectronTransport,
  ElectronTransportOpts,
}
