import LocalObserverTransport, {LocalObserverTransportOpts} from '../../src/local-observer-transport';
import WranggleRpc from '../../src/core';
import {EventEmitter} from 'events';
import {DelegatedRequestHandlerOpts} from "../../src/interfaces";
import {IDict, RpcOpts} from "../../src/interfaces";


export interface IFakeConnection<T> {
  remoteControl: T;
  remoteEndpoint: IMockEndpoint<any>;
  localEndpoint: IMockEndpoint<T>;
  addRequestHandlerToRemoteEndpoint: (methodName: string, fn: (...args: any[]) => any) => void;
}

export interface IMockEndpointOpts {
  observer?: EventEmitter;
  addFixturingGroup?: string;

  rpcOpts?: Partial<RpcOpts>;
  requestHandlers?: IDict<(...args: any[]) => any>;
  requestDelegate?: object;
  requestDelegateOpts?: DelegatedRequestHandlerOpts;
}

export interface IMockEndpoint<T> {
  rpc: WranggleRpc<T>,
  observer: EventEmitter,
  transport: LocalObserverTransport,
  remote: T,
}

export interface IAnyAddedHandler  {
  [ key: string ]: (...args: any[]) => any;
}

export function mockEndpoint<T>(opts=<IMockEndpointOpts>{}): IMockEndpoint<T> {
  const observer = opts.observer || new EventEmitter();
  const transport = new LocalObserverTransport(observer);
  const rpc = new WranggleRpc<T>(Object.assign({ transport }, opts.rpcOpts));
  rpc.addRequestHandlers(opts.requestHandlers || {});
  opts.requestDelegate && rpc.addRequestHandlerDelegate(opts.requestDelegate, opts.requestDelegateOpts);
  return {
    rpc, observer, transport,
    remote: rpc.remoteInterface(),
  }
}

interface IMockConnectionOpts<T> {
  remoteRequestHandlerDelegate?: T;
  remoteRequestHandlers?: IAnyAddedHandler;
}
export function mockConnection<T>(opts=<IMockConnectionOpts<T>>{}): IFakeConnection<T> {
  const localEndpoint = mockEndpoint<T>({
    rpcOpts: { senderId: 'fakeLocalSender' },
  });
  const remoteEndpoint = mockEndpoint<any>({
    observer: localEndpoint.observer,
    rpcOpts: { senderId: 'fakeRemoteSender' },
  });
  opts.remoteRequestHandlerDelegate && remoteEndpoint.rpc.addRequestHandlerDelegate(opts.remoteRequestHandlerDelegate);
  opts.remoteRequestHandlers && remoteEndpoint.rpc.addRequestHandlers(opts.remoteRequestHandlers);

  return {
    remoteControl: localEndpoint.remote,
    addRequestHandlerToRemoteEndpoint: (methodName: string, fn: (...args: any[]) => any) => remoteEndpoint.rpc.addRequestHandler(methodName, fn),
    localEndpoint, remoteEndpoint
  }
}



