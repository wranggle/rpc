# ElectronTransport

A WranggleRpc transport for Electron apps, sending and receiving messages over messaging over its [ipc system](https://electronjs.org/docs/api). 


## Setup 

If you are using the full [@wranggle/rpc](https://www.npmjs.com/package/@wranggle/rpc) package, the ElectronTransport is already
 bundled within. You can import/require it with: 

```javascript
import { WranggleRpc, ElectronTransport } from '@wranggle/rpc';
// or
const { WranggleRpc, ElectronTransport } = require('@wranggle/rpc');
```

#### Unbundled Alternative
If you prefer using just the packages you need, the unbundled es6 is also available on NPM:

```bash
yarn add @wranggle/rpc-core @wranggle/rpc-electron-transport
# or
npm install @wranggle/rpc-core @wranggle/rpc-electron-transport 
```


Unbundled import:
```javascript
import WranggleRpc from '@wranggle/rpc-core';
import ElectronTransport from '@wranggle/rpc-electron-transport';
```

### Construction

When creating your WranggleRpc endpoint, you can use the `electron` shortcut to also construct this transport. Eg:

```javascript
const rpc = new WranggleRpc({
  electron: opts,
  channel: 'some-channel'
});
```
Or create a new instance yourself:

```javascript
const rpc = new WranggleRpc({
  transport: new ElectronTransport(opts),
  channel: 'some-channel'
});
```

## Options

This transport has two required options: `ipcSender` and `ipcReceiver`. 

### Endpoint in the Main process

* **ipcReceiver** Set it to _ipcMain_, from the import: `const { ipcMain } = require('electron')`

* **ipcSender** If communicating with a browser window / renderer process, use the _webContents_ reference after creating the `new BrowserWindow()`. 

Example:

```javascript
const { WranggleRpc } = require('@wranggle/core');
const { ElectronTransport } = require('@wranggle/rpc-electron-transport');
const { ipcMain } = require('electron')

const rpc = new WranggleRpc({
  electron: {
    ipcReceiver: ipcMain,
    ipcSender: uiRenderer.webContents
  }
});
uiRenderer.webContents.on('did-finish-load', startUsingIt(rpc));
```


### Endpoint in a renderer/browser process

Set both *ipcReceiver* and *ipcSender* to Electron's `ipcRenderer`.

```javascript
import WranggleRpc = from '@wranggle/core';
import ElectronTransport from '@wranggle/rpc-electron-transport';
const { ipcRenderer } = require('electron')

const rpc = new WranggleRpc({
  electron: {
    ipcReceiver: ipcRenderer,
    ipcSender: ipcRenderer,
  }
});
```


### Additional options

You can optionally set *ipcChannel* on the transport, used when sending and listening for ipc messages. It has nothing to do with the WranggleRpc channel option--take care to avoid confusing the two with each other. 

