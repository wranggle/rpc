import {IDict, RpcTransport} from "./interfaces";

const WranggleRpcRegistryAttrib = '__rpcTransportShortcuts__';

export type TransportFactory = (opts: any) => RpcTransport;

export function registerTransport(transportType: string, transportFactory: TransportFactory): void {
  getTransportRegistry()[transportType] = transportFactory;
}

export function getKnownTransportTypes(): string[] {
  return Object.keys(getTransportRegistry());
}

// Was thinking to keep the shortcut registration data in a required module's private variable, but having trouble with dist vs src imports (mainly with tests)
// So leaving it on global for now, until that shakes out. note: can be changed easily later because the shortcut registration is internal and occurs before construction.
export function getTransportRegistry(): IDict<TransportFactory> {
  // @ts-ignore
  global[WranggleRpcRegistryAttrib] = global[WranggleRpcRegistryAttrib] || {};
  // @ts-ignore
  return global[WranggleRpcRegistryAttrib];
}

