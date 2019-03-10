// import WranggleRpc from '@wranggle/rpc-core';
import BrowserExtensionTransport from '../src/browser-extension-transport';
import { fakeSender, FakeChromeExtensionId } from './test-support/fake-sender-support';
import {
  testTransportDebugHandlerReceive,
  testTransportDebugHandlerSend
} from "@wranggle/rpc-core/__tests__/test-support/shared-debug-handler-behavior";
import {DebugHandler, RequestPayload} from "@wranggle/rpc-core/src/interfaces";


jest.mock('../src/chrome-manifest-2-api.ts', () => _setupCustomMock());

const noop = () => {};


describe('@wranggle/rpc-browser-extension-transport', () => {
  let lastSend: any, lastReceived: any;
  let fakeChromeListener: any;

  beforeEach(() => {
    _restoreMockSwitches();
    lastSend = null;
    lastReceived = null;
    fakeChromeListener = null;
    
    _setMockFunction('sendMessageToTab', (tabId: any, payload: any) => {
      lastSend = { tabId, payload, sendApi: 'chrome.tabs' };
    });
    _setMockFunction('sendRuntimeMessage', (payload: any) => {
      lastSend = { payload, sendApi: 'chrome.runtime' };
    });
    _setMockFunction('addMessageListener', (listener: any) => {
      fakeChromeListener = listener
    });
  });

  const fakeSend = (transport: BrowserExtensionTransport, payload: any) => {
    transport.sendMessage(payload);
  };
  const fakeReceive = (transport: BrowserExtensionTransport, payload: any, sender: any) => {
    if (!fakeChromeListener) {
      transport.listen((payload: any) => lastReceived = payload);
    }
    fakeChromeListener(payload, sender);
  };


  test('error if not in a chromium-compatible extension', () => {
    _setMockFunction('hasChromeExtensionApi', () => false);
    expect(() => new BrowserExtensionTransport({})).toThrow(/extension/);
  });

  test('sending from main to specified tab', () => {
    const transport = new BrowserExtensionTransport({ forTabId: 5 });
    expect(!!lastSend).toBe(false);
    fakeSend(transport, { hello: 'niceTab' });
    expect(lastSend.tabId).toBe(5);
    expect(lastSend.payload.hello).toBe('niceTab');
    expect(lastSend.sendApi).toBe('chrome.tabs');
  });

  test('sending from tab to main', () => {
    const transport = new BrowserExtensionTransport({ forTabId: 4 });
    fakeReceive(transport, { some: 'info'}, fakeSender(4));
    expect(lastReceived.some).toBe('info')
  });

  test('ignores messages from other tabs', () => {
    const transport = new BrowserExtensionTransport({ forTabId: 4 });
    fakeReceive(transport, { some: 'info'}, fakeSender(6));
    expect(!!lastReceived).toBe(false)
  });

  test('ignores messages from other extensions', () => {
    const transport = new BrowserExtensionTransport({ forTabId: 4 });
    fakeReceive(transport, { some: 'info'}, fakeSender(4, 'otherExtensionId'));
    expect(!!lastReceived).toBe(false)
  });

  test('requires messages pass custom permitMessage when provided', () => {
    const transport = new BrowserExtensionTransport({
      forTabId: 4,
      permitMessage: (payload, sender) => payload.transportMeta.allow === 'ok',
    });
    fakeReceive(transport, { aa: 11, transportMeta: { allow: 'ok' }}, fakeSender(4));
    expect(!!lastReceived).toBe(true);
    lastReceived = null;
    fakeReceive(transport, { bb: 22, transportMeta: { allow: 'no' }}, fakeSender(4));
    expect(!!lastReceived).toBe(false);
  });

  testTransportDebugHandlerSend((debugHandler: DebugHandler, payload: RequestPayload) => {
    const transport = new BrowserExtensionTransport({ debugHandler, forTabId: 9 });
    transport.sendMessage(payload);
  }, [ '"sendToTabId": 9', '"receiveFromTabId": 9' ]);

  testTransportDebugHandlerReceive((debugHandler: DebugHandler, payload: RequestPayload) => {
    const transport = new BrowserExtensionTransport({ debugHandler });
    transport.endpointSenderId = 'myBrowserTransportId003'
    fakeReceive(transport, { something: 'received321' }, fakeSender(4));
  }, [ 'received321', 'myBrowserTransportId003' ]);
});


function _setupCustomMock() {
  const myCustomShittyMock = <any>{};
  [
    'hasChromeExtensionApi',
    'getChromeRuntimeId',
    'isContentScript',
    'addMessageListener',
    'removeMessageListener',
    'sendMessageToTab',
    'sendRuntimeMessage',
    // 'warnIfErrorCb'
  ].forEach(m => {
    myCustomShittyMock[m] = (...args: any) => _getMockFn(m).apply(null, args);
  });
  return myCustomShittyMock;
}

const __chromeApiMockFunctions = {
};
function _getMockFn(field: any): any {
  return (__chromeApiMockFunctions as any)[field];
}
function _setMockFunction(field: string, fn: any) {
  if (typeof fn !== 'function') {
    throw new Error(`Expecting a function as mock replacement for "${field}"'`);
  }
  (__chromeApiMockFunctions as any)[field] = fn;
}
function _restoreMockSwitches() {
  Object.assign(__chromeApiMockFunctions, {
    hasChromeExtensionApi: () => true,
    isContentScript: () => false,
    getChromeRuntimeId: () => FakeChromeExtensionId,
    addMessageListener: noop,
    removeMessageListener: noop,
    sendMessageToTab: noop,
    sendRuntimeMessage: noop,
    // warnIfErrorCb: noop,
  });

}