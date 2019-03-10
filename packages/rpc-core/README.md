# WranggleRpc Misc

This `@wranggle/rpc-core` package supplies the main `WranggleRpc` class, used to create an RPC endpoint.

Its main documentation is in the [topmost README](/wranggle/rpc) of this monorepo. This rpc-core README holds odds and ends that don't belong there.


## Debugging

Setting the `{ debug: true }` option on WranggleRpc enables fairly verbose logging, intended to help when first setting up your transports and endpoints. You can refine what gets logged and where, either by providing a custom debug handler function or an object holding debug options.  

#### Custom debugHandler
WranggleRpc notes its activity by passing relevant data to a `debugHandler`: `(data: DebugHandlerActivityData) => void`. For maximum control, you can supply a replacement function to your WranggleRpc endpoint:      
```javascript
const rpc = new WranggleRpc({ debug: myDebugHandler });
```
The data object holds an `activity` value, useful for filtering, and a lot of information such as payload data when available, page location if applicable, etc. With a custom debugHandler, you decide what to with that data--you can log it or not.

You can also supply a *debugHandler* to a transport, eg:
```javascript
const rpc = new WranggleRpc({ 
  browserExtension: {
    forTabId: 22,
    debugHandler: myDebugHandler 
  }
});
```  
Note that when set on a transport, the attribute is `debugHandler` and not just *debug*. You can also set *debugHandler* directly on the transport object: `myTransport.debugHandler = myDebugHandler`.  

#### Built-in debugHandler with options 

When a custom debugHandler is not provided, WranggleRpc uses a default debugHandler. 

When a `DebugOpts` object is not provided, behaves as:
* `undefined` defaults to { minimal: true } debug options (warnings and errors only, to the console)
* `false` disables all output (even warnings and errors)
* `true` fairly verbose output to the console 

Or you can set`DebugOpts` with a an object:
* **logger** *`Logger`* A logging object that contains "log", "warn" and "error" functions. `console` is used by default.
* **messageEcho** *`string`* Determines how to treat RPC messages received by the same endpoint that sent them are. They can be common and harmless in some situations, or the sign of a misconfigured endpoint in other situations. When set to "ignore" they are silently dropped. When set to "summarize" a short message is logged, without showing payload data. When set to "display" they are logged fully. Default is "summarize".  
* **minimal** *`boolean`* When `true`, only warnings and errors are displayed.
 

## LocalObserverTransport

The LocalObserverTransport is used when both WranggleRpc endpoints are in the same window/process.

It can be used as syntactical sugar to replace event-based activities. For example, a project might use a shared observer to send `myObserver.emit('ShowErrorAlert', 'Server is offline')` and listen for that message in the view-related area that can display the message. You might set up WranggleRpc with a LocalObserverTransport to instead write `view.showAlert('Server is offline')`.

### LocalObserverTransport setup

The LocalObserverTransport is available in `@wranggle/rpc-core` and `@wranggle/rpc`. Eg:
```javascript
import { LocalObserverTransport } from `@wranggle/rpc-core`;
// or
const { LocalObserverTransport } = require(`@wranggle/rpc-core`);
```

### LocalObserverTransport construction

* **observer**: EventEmitter instance (*required*). Both endpoints must be passed the same observer. 

* **messageEventName** Optional string. The eventName used for sending and receiving rpc messages. 


## Custom Transport

They don't need to do much:

* `sendMessage(payload: RequestPayload | ResponsePayload): void`
  
* `listen(onMessage: (payload: RequestPayload | ResponsePayload) => void): void`;

* `stopTransport(): void;`

You can add additional methods, and the transport instance is available on `rpc.getTransport()`.

Consider registering a constructor shortcut so people can build the transport instance while creating their rpc endpoint. Eg:  
```javascript
import { WranggleRpc } from `@wranggle/rpc-core`;
WranggleRpc.registerTransport('myShortcut', (opts) => new MyCustomTransport(opts));
```
   
Other notes:
* Right after the WranggleRpc endpoint calls `listen` on the transport, it sets an `endpointSenderId` attribute on the transport object. 
* Consider supporting the same DebugHandler behaviors and options in your custom RpcTransport as do the bundled transports.

## Additional / secondary WranggleRpc methods

Secondary/uncommon methods:

* **makeRemoteRequest()** Sends a remote request directly from the `WrangglRpc` instance, rather than making the call on the `remoteInterface`. 
  ```javascript
  rpc.makeRemoteRequest('showUserMessage', [ 'Export complete' ], { rsvp: false });
  ```
  Type signature is `makeRemoteRequest(methodName: string, userArgs: any[], requestOpts = <RequestOpts>{}): RemotePromise`

* **getSenderId()** returns the *senderId* value the endpoint uses when sending requests

* **getTransport()** returns the *transport* model as set by `useTransport`

* **WranggleRpc.registerTransport(shortcut: string, (transportOpts: any) => RpcTransport)** static method for registering a shortcut and factory for a custom transport. 
