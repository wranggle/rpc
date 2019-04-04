import {RpcTransport, IDict, RpcOpts} from "../interfaces";
import {getTransportRegistry} from "../transport-shortcut-registration";



// todo: put transport shortcut directly on RpcOpts. Eg: `new WranggleRpc({ electron: myElectronOpts })`
//   I don't feel like a typescript research project at the moment.. need to check if each transport could declare the same module or whatever and add it own option
export function buildTransport(val: any): RpcTransport {
  if (!val) {
    throw new Error('Invalid transport options');
  }
  if (typeof val === 'string') {
    val = { transportType: val };
  }
  let transport;
  if (_isTransport(val)) {
    transport = val as RpcTransport;
  } else {
    let transportType, transportOpts;

    if (_hasTransportType(val.transportType || val.type)) {
      transportType = val.transportType || val.type;
      transportOpts = val;
    }
    if (transportOpts === true) {
      transportOpts = {};
    }
    if (transportType) {
      transport = getTransportRegistry()[transportType](transportOpts);
    }
  }
  if (!transport) {
    throw new Error('Unable to creat transport instance from passed in options');
  }
  return transport;
}

export function extractTransportOpts(rpcOpts: Partial<RpcOpts>): Partial<RpcOpts> {
  if (rpcOpts.transport) {
    return rpcOpts;
  }
  const transportType = Object.keys(rpcOpts).find(transportType => _hasTransportType(transportType));
  let transportOpts = transportType && (<any>rpcOpts)[transportType];
  if (transportOpts === true) {
    transportOpts = {};
  }
  if (typeof transportOpts === 'object') {
    transportOpts.transportType = transportType;
    rpcOpts.transport = transportOpts;
    // @ts-ignore
    delete rpcOpts[transportType];
  }
  return rpcOpts;
}

function _hasTransportType(transportType: string): boolean {
  return !!(transportType && getTransportRegistry()[transportType]);
}

function _isTransport(val: any): boolean {
  if (typeof val !== 'object') {
    return false;
  }
  return val && [ 'sendMessage', 'listen', 'stopTransport' ].every(m => typeof val[m] === 'function');
}

