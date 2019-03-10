import LocalObserverTransport from '../src/local-observer-transport';
import {DebugHandler, RequestPayload, ResponsePayload} from "../src/interfaces";
import {testTransportDebugHandlerReceive, testTransportDebugHandlerSend} from "./test-support/shared-debug-handler-behavior";
const EventEmitter = require('events');


describe('@wranggle/rpc-core/local-observer-transport', () => {
  let testData: any;

  beforeEach(() => {
    testData = null;
  });

  const testMessageHandler = (payload: RequestPayload | ResponsePayload) => {
    testData = payload;
  };

  test('sending itself messages', () => {
    const transport = new LocalObserverTransport(new EventEmitter());
    transport.listen(testMessageHandler);
    // @ts-ignore // todo: mock RequestPayload
    transport.sendMessage({ mockNeeded: true });
    expect(testData).not.toBe(null);
    expect(testData.mockNeeded).toBeTruthy();
  });

  test('sending another instance a message with shared observer', () => {
    const sharedObserver = new EventEmitter();
    const transport_1 = new LocalObserverTransport({ observer: sharedObserver });
    const transport_2 = new LocalObserverTransport(sharedObserver);
    transport_1.listen(testMessageHandler);
    transport_2.sendMessage({ aa: 11 } as any);
    expect(testData.aa).toBe(11);
  });

  testTransportDebugHandlerSend((debugHandler: DebugHandler, payload: RequestPayload) => {
    const transport = new LocalObserverTransport({
      observer: new EventEmitter(),
      messageEventName: 'someObserverEvent',
      debugHandler,
    });
    transport.sendMessage(payload);
  }, [ 'someObserverEvent' ]);

  testTransportDebugHandlerReceive((debugHandler: DebugHandler, payload: ResponsePayload) => {
    const observer = new EventEmitter();
    const transport = new LocalObserverTransport({
      observer, debugHandler
    });
    transport.listen(testMessageHandler);
    observer.emit(transport.messageEventName, payload);
  });

});