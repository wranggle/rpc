import BrowserExtensionTransport, { BrowserExtensionTransportOpts } from './browser-extension-transport';
import registerShortcuts from './register-shortcuts';

registerShortcuts();

export default BrowserExtensionTransport;
export {
  BrowserExtensionTransport,
  BrowserExtensionTransportOpts
}
