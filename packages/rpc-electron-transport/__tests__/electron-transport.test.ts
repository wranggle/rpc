import ElectronTransport, {ElectronTransportOpts} from '../src/electron-transport';
import {RequestPayload, ResponsePayload} from "@wranggle/rpc-core/src/interfaces";
import { EventEmitter } from 'events';
import {buildFakeRequestPayload} from "@wranggle/rpc-core/__tests__/test-support/fake-payload-support";


const ChannelForTest = 'ElectronChannelForTest';

describe('@wranggle/rpc-core/local-observer-transport', () => {
  let fakeReceiver: EventEmitter;
  let lastReceived: any;
  let fakeSender: any;
  let lastSent: any;
  let transport: ElectronTransport;

  beforeEach(() => {
    lastSent = null;
    fakeSender = {
      send: (channel: string, payload: any) => {
        lastSent = { channel, payload };
      }
    };
    lastReceived = null;
    fakeReceiver = new EventEmitter();
    transport = new ElectronTransport({
      ipcSender: fakeSender,
      ipcReceiver: fakeReceiver,
      ipcChannel: ChannelForTest,
    });
    transport.listen((payload: RequestPayload | ResponsePayload) => {
      lastReceived = payload;
    })
  });


  test('send messages', () => {
    transport.sendMessage(buildFakeRequestPayload('usefulnessOfThisTest', [ 'barely' ]));
    expect(lastSent.channel).toBe(ChannelForTest);
    expect(lastSent.payload.methodName).toBe('usefulnessOfThisTest');
  });

  test('receive messages', () => {
    fakeReceiver.emit(ChannelForTest, { event: 'fake' }, { pretend: 'somePayload' });
    expect(lastReceived.pretend).toEqual('somePayload')
  });
  
});