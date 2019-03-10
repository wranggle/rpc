import {DebugHandler, DebugHandlerActivityData, LogActivity, RequestPayload, ResponsePayload, RpcTransport} from "@wranggle/rpc-core/src/interfaces";
import {registerTransport} from "@wranggle/rpc-core/src/transport-shortcut-registration";


export interface ElectronTransportOpts {
  /**
   * A reference to the Electron IPC object responsible for sending messages.
   *
   * If WranggleRpc endpoint is in a renderer/ui process (sending to the main process) you would use the _ipcRenderer_ from: `const { ipcRenderer } = require('electron')`
   *
   * If endpoint in in the Main process (sending to a renderer) you would use _webContents_ (eg `myBrowserWindow.webContents`
   *   after creating the `new BrowserWindow()`)
   */
  ipcSender: SenderInstance;

  /**
   * A reference to the Electron IPC object responsible for receiving messages.
   *
   * If WranggleRpc endpoint is in a renderer/ui process, you would use the _ipcRenderer_ from: `const { ipcRenderer } = require('electron')`
   *
   * If endpoint is in the Main process, it would again be _ipcMain_ from: `const { ipcMain } = require('electron')`
   */
  ipcReceiver: ReceiverInstance;

  /**
   * Optional. Electron IPC channel name used for both sending and receiving messages.
   */
  ipcChannel?: string;

  /**
   * Optional. Minor. Electron IPC channel name used for sending messages. The other endpoint should use this channel as
   * its ipcChannelReceiving.
   */
  ipcChannelSending?: string;

  /**
   * Optional. Minor. Electron IPC channel name used for receiving messages. The other endpoint should use this channel as
   * its ipcChannelSending.
   */
  ipcChannelReceiving?: string;

  debugHandler?: DebugHandler | false;
}

const DefaultElectronChannel = 'ElectronTransportForWranggleRpc';


export default class ElectronTransport implements RpcTransport {
  private _isStopped = false;
  private readonly sender: SenderInstance;
  private readonly receiver: ReceiverInstance;
  private readonly ipcChannelSending: string;
  private readonly ipcChannelReceiving: string;
  private _listenHandler?: (payload: RequestPayload | ResponsePayload) => void;
  endpointSenderId!: string | void;
  debugHandler?: DebugHandler | false;

  constructor(opts: ElectronTransportOpts) {
    if (!opts || !_isIpcSender(opts.ipcSender)) {
      throw new Error('ElectronTransport expecting ipc reference with a function to "send"');
    }
    if (!_isIpcReceiver(opts.ipcReceiver)) {
      throw new Error('ElectronTransport expecting ipc receiver reference with functions "on" and "removeListener"');
    }
    this.sender = opts.ipcSender;
    this.receiver = opts.ipcReceiver;
    this.ipcChannelSending = opts.ipcChannelSending || opts.ipcChannel || DefaultElectronChannel;
    this.ipcChannelReceiving = opts.ipcChannelReceiving || opts.ipcChannel || DefaultElectronChannel;

  }

  listen(rpcHandler: (payload: (RequestPayload | ResponsePayload)) => void): void {
    this._removeExistingListener();
    this._listenHandler = (payload: RequestPayload | ResponsePayload) => {
      if (!this._isStopped) {
        this._debug(LogActivity.TransportReceivingMessage, { payload });
        rpcHandler(payload);
      }
    };

    this.receiver.on(this.ipcChannelReceiving, (evt: any, data: RequestPayload | ResponsePayload) => { // todo: Electron ts type for Event
      this._listenHandler && this._listenHandler(data)
    });
  }

  sendMessage(payload: RequestPayload | ResponsePayload): void {
    if (this._isStopped) {
      return;
    }
    this._debug(LogActivity.TransportSendingPayload, { payload });
    this.sender.send(this.ipcChannelSending, payload);
  }

  stopTransport(): void {
    this._isStopped = true;
    this._debug(LogActivity.TransportStopping, {});
    this._removeExistingListener();
  }

  _removeExistingListener() {
    this._listenHandler && this.receiver.removeListener(this.ipcChannelReceiving, this._listenHandler);
  }

  _debug(activity: LogActivity, data: Partial<DebugHandlerActivityData>) {
    if (!this.debugHandler) {
      return;
    }
    const { ipcChannelSending, ipcChannelReceiving, endpointSenderId } = this;
    this.debugHandler(Object.assign({
      activity, ipcChannelSending, ipcChannelReceiving, endpointSenderId
    }, data));
  }
}


function _isIpcReceiver(obj: any): boolean {
  return obj && [ 'on', 'removeListener'].every(m => typeof obj[m] === 'function')
}

function _isIpcSender(obj: any): boolean {
  return obj && typeof obj.send === 'function';
}


registerTransport('electron', (opts: ElectronTransportOpts) => new ElectronTransport(opts));


type ElectronListener = (evt: any, data: any) => void; // todo: Electron types (for Event)

interface SenderInstance {
  send: (channel: string, data: any) => void;
}

interface ReceiverInstance {
  on: (channel: string, listener: ElectronListener) => void;
  removeListener: (channel: string, listener: ElectronListener) => void;
}
