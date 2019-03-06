import WranggleRpc from '../../src/core';
import {RequestPayload} from "../../src/interfaces";
import {ResponsePayload, RpcTransport, EndpointInfo} from "rpc-core/src/interfaces";
import { EventEmitter } from 'events';
import {extractTransportOpts} from "../../src/internal/transport-construction";


describe('@wranggle/rpc-core/transport-construction', () => {

  beforeEach(() => {
    WranggleRpc.registerTransport('something', (opts: any) => new SomeTransport(opts));
  });

  const getTransport = (rpc: WranggleRpc<any>): SomeTransport => {
    // @ts-ignore
    return rpc.router.transport;
  };
  const getTransportConfig = (rpc: WranggleRpc<any>): any => {
    return (getTransport(rpc) || {} as any).constructorOpts;
  };
  const expectValidTransport = (rpc: WranggleRpc<any>) => {
    const transport = getTransport(rpc);
    expect(transport).toBeDefined();
    expect(transport.isSomeTransport).toBe(true);
    expect(typeof transport.constructorOpts).toBe('object');
  };

  test('transport shortcut as top-level rpc option using extractTransportOpts', () =>{
    // @ts-ignore
    const rpc = new WranggleRpc(extractTransportOpts({ something: { config_1: 'info' } }));
    expectValidTransport(rpc);
    expect(getTransportConfig(rpc).config_1).toBe('info');
  });

  test('permit late creation of transport', () => {
    const rpc = new WranggleRpc();
    const transport = new SomeTransport({ abc: true });
    rpc.useTransport(transport);
    expectValidTransport(rpc);
    expect(getTransportConfig(rpc).abc).toBe(true);
  });

  test('update transport as rpc option', () => {
    const rpc = new WranggleRpc({ transport: 'something' });
    expectValidTransport(rpc);
    const transport2 = new SomeTransport({ another: 2 });
    rpc.opts({ transport: transport2 });
    expectValidTransport(rpc);
    expect(getTransportConfig(rpc).another).toBe(2);
  });

  test('accepts "transportType" as an attrib in the options data', () => {
    const transportOpts_1 = {
      transportType: 'something',
      data: 'one',
    };
    const transportOpts_2 = {
      type: 'something',
      data: 'two',
    };
    const rpc = new WranggleRpc({ transport: transportOpts_1 });
    expectValidTransport(rpc);
    expect(getTransportConfig(rpc).data).toBe('one');
    rpc.opts({ transport: transportOpts_2 });
    expectValidTransport(rpc);
    expect(getTransportConfig(rpc).data).toBe('two');
  });

  test('transportType string', () => { // for drop this signature?
    // @ts-ignore
    const rpc = new WranggleRpc('something');
    expectValidTransport(rpc);
  });

});

class SomeTransport implements RpcTransport {
  constructorOpts: any;
  isSomeTransport = true;
  endpointSenderId!: string | void;

  constructor(opts: any) {
    this.constructorOpts = opts;
  }

  listen(onMessage: (payload: (RequestPayload | ResponsePayload)) => void): void {
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
  }

  stopTransport(): void {
  }


}

