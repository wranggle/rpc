# BrowserExtensionTransport

**DEPRECATED: {old/buggy; todo: drop in newer from cannery}**

A WranggleRpc transport for browser extensions, sending and receiving messages over either [chrome.runtime](https://developer.chrome.com/apps/runtime) or [chrome.tabs](https://developer.chrome.com/extensions/tabs).

Firefox and Edge also support these Chromium APIs. 


## Setup 

If you are using the full [@wranggle/rpc](https://www.npmjs.com/package/@wranggle/rpc) package, the BrowserExtensionTransport is already
 bundled within. You can import/require it with: 

```javascript
import { WranggleRpc, BrowserExtensionTransport } from '@wranggle/rpc';
// or
const { WranggleRpc, BrowserExtensionTransport } = require('@wranggle/rpc');
```

#### Unbundled Alternative
If you prefer using just the packages you need, the unbundled es6 is also available on NPM:

```bash
yarn add @wranggle/rpc-core @wranggle/rpc-browser-extension-transport
# or
npm install @wranggle/rpc-core @wranggle/rpc-browser-extension-transport 
```


Unbundled import:
```javascript
import WranggleRpc from '@wranggle/rpc-core';
import BrowserExtensionTransport from '@wranggle/rpc-browser-extension-transport';
```

### Construction

When creating your WranggleRpc endpoint, you can use the `browserExtension` shortcut to also construct this transport. Eg:

```javascript
const rpc = new WranggleRpc({
  browserExtension: opts,
  channel: 'some-channel'
});
```
Or:

```javascript
const rpc = new WranggleRpc({
  transport: new BrowserExtensionTransport(opts),
  channel: 'some-channel'
});
```

## Options

The options relate filtering and security.

#### Filtering
* **permitMessage** An optional filter function for inspecting incoming messages sender and payload. Return true to accept message, anything else to rejects. Here a background page ensures the message originates from popup as expected:
  ```javascript
  const rpc = new WranggleRpc({
    browserExtension: {
      permitMessage: (payload, sender) => sender.url === `chrome-extension://${chrome.runtime.id}/popup.html`      
  })
  ```
  
* **skipExtensionIdCheck** By default, messages received from other browser extensions are ignored. Set this option to true to permit them. **Note:** when set, the presence of a `permitMessage` filter is required.



#### Communicating with content scripts / tabs

These options are for the endpoint on the priviledged side (eg, a background page) that is communicating with a sandboxed content script (for a browser tab page.)

You'll need the tabId for these options. There are various ways to it in a chrome extension, such as:
```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => console.log('Tab id is: ', tabs[0].id));
```

* **sendToTabId** Sends messages from main extension to a single, specific content script (rather than broadcasting to any listening.) When set, messages are sent using [chrome.tabs.sendMessage](https://developer.chrome.com/extensions/tabs#method-sendMessage). Accepts tab id as a number.

* **receiveFromTabId** Checks tab id of received messages, and ignores all from other tabs. Accepts tab id as a number.

* **forTabId** Sets both sendToTabId and receiveFromTabId to the same tabId number.


