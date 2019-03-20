import WranggleRpc from './core';
import LocalObserverTransport, {LocalObserverTransportOpts} from "./local-observer-transport";

export default function registerShortcuts() {
  WranggleRpc.registerTransport('localObserver', (opts: LocalObserverTransportOpts) => new LocalObserverTransport(opts));
}
