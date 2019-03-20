import WranggleRpc from './core';
import LocalObserverTransport, {LocalObserverTransportOpts} from "./local-observer-transport";
import registerShortcuts from './register-shortcuts';

registerShortcuts();

export default WranggleRpc;
export {
  WranggleRpc,
  LocalObserverTransport, LocalObserverTransportOpts,
}
export * from './interfaces';