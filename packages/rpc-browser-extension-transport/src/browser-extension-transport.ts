import {
  RequestPayload,
  ResponsePayload,
  RpcTransport,
  RpcChannel,
  LogActivity,
  DebugHandlerActivityData,
  DebugHandler,
  TransportMessageHandler
} from "@wranggle/rpc-core";
import * as chromeApi from './chrome-manifest-2-api';

type ChromeListener = (payload: (RequestPayload | ResponsePayload), sender: any) => void;


export interface BrowserExtensionTransportOpts {
  /**
   * Shortcut to set both `sendToTabId` and `receiveFromTabId` options. Use this in the main extension (not the content script / tab)
   * when you want your WranggleRpc instance to communicate with only a single tab.
   *
   * There are various ways to get the tabId in a chrome extension. For example, if in the extension popup you can do something like:
   *     `chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => console.log(tabs[0]);`
   */
  forTabId?: number;

  /**
   * Sends messages from main extension only to content script of the passed-in tab.
   * This option cannot be set in a content script / tab, only in the context of your full extension.
   * When set, messages are sent using `chrome.tabs.sendMessage`. See https://developer.chrome.com/extensions/tabs#method-sendMessage
   * If not set, messages are sent using `chrome.runtime.sendMessage`. See https://developer.chrome.com/apps/runtime#method-sendMessage
   *
   */
  sendToTabId?: number;

  /**
   * When set, messages not originating from the specified tab are ignored.
   */
  receiveFromTabId?: number;

  /**
   * By default, messages received from other browser extensions are ignored. Set this option to true to permit them.
   * The presence of a "permitMessage" filter is required in this case.
   */
  skipExtensionIdCheck?: boolean;

  /**
   * An optional filter for ignoring incoming messages. Return true to accept message, anything else to reject.
   * @param payload
   */
  permitMessage?: (payload: (RequestPayload | ResponsePayload), chromeSender: any) => boolean;

  debugHandler?: DebugHandler | false;
}


export default class BrowserExtensionTransport implements RpcTransport {
  private _stopped = false;
  private _opts: BrowserExtensionTransportOpts;
  private readonly _isContentScript: boolean;
  private readonly _chromeExtensionId!: string;
  private _messageHandler?: ChromeListener;
  debugHandler?: DebugHandler | false;
  endpointSenderId!: string | void;

  constructor(opts=<BrowserExtensionTransportOpts>{}) {
    if (!chromeApi.hasChromeExtensionApi()) {
      throw new Error('Invalid environment: expecting a Chromium extension');
    }
    // TODO: use firefox `browser` API directly. (but they're also compatible w/ Chrome API so just using that in first pass)
    this._isContentScript = chromeApi.isContentScript();
    this._chromeExtensionId = chromeApi.getChromeRuntimeId();
    this._opts = this._initOpts(opts);
    this.debugHandler = opts.debugHandler;
  }

  listen(onMessage: TransportMessageHandler, channel: RpcChannel): void {
    if (typeof onMessage !== 'function') {
      throw new Error('Invalid message handler');
    }
    this._removeListener();
    const { skipExtensionIdCheck, receiveFromTabId, permitMessage } = this._opts;
    const chromeRuntimeId = this._chromeExtensionId;
    this._messageHandler = (payload, sender) => {
      const senderId = (sender || {}).id;
      if (skipExtensionIdCheck || chromeRuntimeId !== senderId) {
        this._debug(LogActivity.TransportIgnoringMessage, { message: `Ignoring message because sender.id "${ senderId }" does not match chrome.runtime.id "${chromeRuntimeId}"`, payload });
        return;
      }
      if (receiveFromTabId) {
        const tabId = sender && sender.tab && sender.tab.id;
        if (receiveFromTabId !== tabId) {
          this._debug(LogActivity.TransportIgnoringMessage, { message: `Ignoring message intended for tab ${tabId}, filtering out all but tab ${receiveFromTabId}`, payload });
          return;
        }
      }
      if (typeof permitMessage === 'function' && permitMessage(payload, sender) !== true) {
        this._debug(LogActivity.TransportIgnoringMessage, { message: `Custom "permitMessage" filter rejected message`, payload });
        return;
      }
      payload.transportMeta = payload.transportMeta || {};
      payload.transportMeta.sender = sender;

      this._debug(LogActivity.TransportReceivingMessage, { payload });
      onMessage(payload);
    };
    
    chromeApi.addMessageListener(this._messageHandler);
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._stopped) {
      return;
    }
    const sendToTabId = this._opts.sendToTabId;
    if (sendToTabId) {
      this._debug(LogActivity.TransportSendingPayload, { sendToTabId, payload });
      chromeApi.sendMessageToTab(sendToTabId, payload);
    } else {
      this._debug(LogActivity.TransportSendingPayload, { payload });
      chromeApi.sendRuntimeMessage(payload);
    }
  }

  stopTransport(): void {
    this._stopped = true;
    this._debug(LogActivity.TransportStopping, {});
    this._removeListener();
  }

  _removeListener(): void {
    this._messageHandler && chromeApi.removeMessageListener(this._messageHandler);
  }

  _initOpts(opts: BrowserExtensionTransportOpts) {
    if (opts.skipExtensionIdCheck && typeof opts.permitMessage !== 'function') {
      throw new Error('When "skipExtensionIdCheck" is enabled, you must provide a custom "permitMessage" filter function');
    }
    opts.receiveFromTabId = opts.receiveFromTabId || opts.forTabId;
    opts.sendToTabId = opts.sendToTabId || opts.forTabId;
    if (this._isContentScript && (opts.receiveFromTabId || opts.sendToTabId)) {
      this._debug(LogActivity.ReportWarning, { message: 'The "forTabId", "sendToTabId", and "receiveFromTabId" options can only be applied in the main browser extension context, not in a content script. Ignoring.' });
    }
    return opts;
  }

  _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    const { sendToTabId, receiveFromTabId, skipExtensionIdCheck, permitMessage } = this._opts;
    this.debugHandler(Object.assign({
      activity, sendToTabId, receiveFromTabId, skipExtensionIdCheck,
      endpointSenderId: this.endpointSenderId,
      hasPermitMessageFilter: !!permitMessage
    }, data));
  }
}

