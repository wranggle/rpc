import {IDict, RpcTransport} from "./interfaces";


export type TransportFactory = (opts: any) => RpcTransport;

export function registerTransport(transportType: string, transportFactory: TransportFactory): void {
  getTransportRegistry()[transportType] = transportFactory;
}



// am currently having build trouble... this registry belongs on @wranggle/rpc-core but importing it in a way that makes ts
// happy is breaking jest and there's no time for configurations right now, so putting it on global for now.
export function getTransportRegistry(container?: any): IDict<TransportFactory> {
  if (typeof container !== 'object') {
    // @ts-ignore
    container = (global.wranggle = global.wranggle || {});
  }
  container.__rpcTransportShortcuts__ = container.__wranggleRpcTransportShortcuts__ || {};
  return container.__rpcTransportShortcuts__;
}
