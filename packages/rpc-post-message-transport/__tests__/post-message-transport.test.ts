// import WranggleRpc from 'rpc-core/src/core';
import {RequestPayload, IDict, ResponsePayload, DebugHandler, RpcChannel} from "@wranggle/rpc-core/src/interfaces";
import PostMessageTransport, {PostMessageTransportOpts} from "../src/post-message-transport";
import { EventEmitter } from 'events';
import {testTransportDebugHandlerReceive, testTransportDebugHandlerSend} from "@wranggle/rpc-core/__tests__/test-support/shared-debug-handler-behavior";


const SomeOrigin = 'https://test.local';


describe('@wranggle/rpc-post-message-transport', () => {
  let mockWindow: any;

  beforeEach(()=> {
    mockWindow = null;
  });

  const buildMockWindowAndTransport = (opts=<Partial<PostMessageTransportOpts>>{}) => {
    mockWindow = new MockWindow();
    return new PostMessageTransport(Object.assign({
      targetWindow: mockWindow,
      sendToOrigin: SomeOrigin,
    }, opts));
  };

  describe('shouldReceive', () => {
    let lastMessage: any;

    beforeEach(()=> {
      lastMessage = null;
    });

    const buildTransportAndFixturing = (shouldReceive: any) => {
      const transport = buildMockWindowAndTransport({ shouldReceive });
      transport.listen((payload: RequestPayload | ResponsePayload) => {
        lastMessage = payload;
      }, 'notUsedInPostMessageTransport' as RpcChannel);
      return transport;
    };

    test('origin string', () => {
      buildTransportAndFixturing(SomeOrigin);
      mockWindow.fakeReceive({ aa: 11 }, 'otherOrigin');
      expect(!!lastMessage).toBe(false);
      mockWindow.fakeReceive({ bb: 22 }, SomeOrigin);
      expect(lastMessage.bb).toBe(22);
    });

    test('origin function filter', () => {
      const myOriginFilter = (origin: string) => !!([ 'https://test.local', 'http://test.local' ].find(val => val === origin));
      buildTransportAndFixturing(myOriginFilter);
      mockWindow.fakeReceive({ aa: 11 }, 'https://other.local');
      expect(!!lastMessage).toBe(false);
      mockWindow.fakeReceive({ bb: 22 }, 'http://test.local');
      expect(lastMessage.bb).toBe(22);
    });

    testTransportDebugHandlerReceive((debugHandler: DebugHandler, payload: RequestPayload) => {
      const transport = buildTransportAndFixturing(SomeOrigin);
      transport.debugHandler = debugHandler;
      transport.endpointSenderId = 'thisWindowEndpoint0202';
      mockWindow.fakeReceive(payload, SomeOrigin);
    }, [ SomeOrigin, 'thisWindowEndpoint0202' ]);
  });

  test('includes correct targetOrigin when calling postMessage', () => {
    const transport = buildMockWindowAndTransport({
      sendToOrigin: 'https://iframes.test.local',
      shouldReceive: SomeOrigin,
    });
    mockWindow.postMessage = jest.fn();
    const payload = { hi: 5 };
    // @ts-ignore
    transport.sendMessage(payload);
    expect(mockWindow.postMessage).toHaveBeenCalledWith(payload, 'https://iframes.test.local');
  });

  testTransportDebugHandlerSend((debugHandler: DebugHandler, payload: RequestPayload) => {
    const transport = buildMockWindowAndTransport();
    transport.debugHandler = debugHandler;
    transport.sendMessage(payload);
  });


  // todo: test both sendToOrigin and shouldReceive default to location.origin. (need to mock and restore global.location.origin)

});


class MockWindow {
  observer = new EventEmitter();
  _remoteWindowByOrigin = <IDict<MockWindow>>{};

  fakeReceive(data: any, origin: string) {
    this.observer.emit('message', { data, origin } )
  }

  addEventListener(name: string, listener: any) {
    this.observer.on(name, listener);
  }
  postMessage(data: any, origin: string) {
    const mockWindow = this._remoteWindowByOrigin[origin];
    mockWindow && mockWindow.fakeReceive(data, origin);
  }
  removeEventListener(methodName: string, cb: any) {
    this.observer.removeListener(methodName, cb);
  }

}
