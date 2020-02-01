# PostMessageTransport

A WranggleRpc transport for browser windows (including iframes and web/service workers), sending and receiving messages with [message events](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent). 


## Setup 

If you are using the full [@wranggle/rpc](https://www.npmjs.com/package/@wranggle/rpc) package, the PostMessageTransport is already bundled within. You can import/require it with: 

```javascript
import { WranggleRpc, PostMessageTransport } from '@wranggle/rpc';
// or
const { WranggleRpc, PostMessageTransport } = require('@wranggle/rpc');
```

#### Unbundled Alternative
If you prefer using just the packages you need, the unbundled es6 is also available on NPM:

```bash
yarn add @wranggle/rpc-core @wranggle/rpc-post-message-transport
# or
npm install @wranggle/rpc-core @wranggle/rpc-post-message-transport 
```


Unbundled import:
```javascript
import WranggleRpc from '@wranggle/rpc-core';
import PostMessageTransport from '@wranggle/rpc-post-message-transport';
```

### Construction

When creating your WranggleRpc endpoint, you can use the `postMessage` shortcut to also construct this transport. Eg:

```javascript
const rpc = new WranggleRpc({
  postmessage: opts,
  channel: 'some-channel'
});
```
Or create a new instance yourself:

```javascript
const rpc = new WranggleRpc({
  transport: new PostMessageTransport(opts),
  channel: 'some-channel'
});
```

## Options

### Send/receive windows

To be able to use postMessage, you need to specify which window to use for sending and for listening.

Note: if using an iframe, remember to pass in its `contentWindow` (eg, `myIframe.contentWindow`) not the iframe DOM element.

* **sendingWindow** a reference to the window for sending messages. It is the *window* in: `window.postMessage()`. 

* **receivingWindow** a reference to the window that listens for messages. The *window* in: `window.addEventListener('message', listener)`

* **targetWindow** a shortcut that sets both *sendingWindow* and *receivingWindow* options to the same window. (Using the current window/global is common.) 


### Filtering/security

* **sendToOrigin** The `targetOrigin` value used when calling `targetWindow.postMessage`. Set it the origin / base url of the **receiving** window. (Eg, `https://example.edu`) If this option is not set, it will use the current origin (meaning both communicating windows must be on the same origin.)

* **shouldReceive** Filter that determines if a received message should be used or ignored. It a function is passed, it is passed the event.origin string of the received message, accepting the message only if the function returns `true`. 
If a string is passed, it will expect the message origin to match it exactly. (Eg, `https://example.edu`)
If this option is not set, the transport will only accept messages originating from the same origin.


### Example

#### parent window and iframe on the same origin:

Endpoint for parent window:
```javascript
const iframe = document.querySelector('#my-iframe');
const rpc = new WranggleRpc({
  channel: 'our-same-origin-frames-channel',
  postMessage: {
    targetWindow: iframe.contentWindow,
  }
});
```  

Endpoint inside iframe:
```javascript
const rpc = new WranggleRpc({
  channel: 'our-same-origin-frames-channel',
  postMessage: {
    targetWindow: window,
  }
});
```  
