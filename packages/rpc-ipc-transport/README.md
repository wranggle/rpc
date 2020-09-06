# IpcTransport

A WranggleRpc transport using the [Node IPC](https://nodejs.org/api/child_process.html#child_process_child_process) communication channel.
Node sets this up automatically between parent and child processes when child_process.fork() is used.  


## Setup 

1. Install the packages: 

```bash
yarn add @wranggle/rpc
# or
yarn add @wranggle/rpc-core @wranggle/rpc-ipc-transport 
# or
npm i @wranggle/rpc
# or 
npm i @wranggle/rpc-core @wranggle/rpc-ipc-transport 
```                                                 


1. Import/require WranggleRpc and IpcTransport in your code:


```javascript
const { WranggleRpc, IpcTransport } = require('@wranggle/rpc');
````

or 

```javascript
import { WranggleRpc, IpcTransport } from '@wranggle/rpc';
````

or 

```javascript
const { WranggleRpc } = require('@wranggle/rpc-core');
const { IpcTransport } = require('@wranggle/rpc-rpc-ipc-transport');
````

or 

```javascript
import { WranggleRpc, IpcTransport } from '@wranggle/rpc-core';
import { IpcTransport, IpcTransport } from '@wranggle/rpc-rpc-ipc-transport';
````


 
### Example / using 


## Example / use

In the parent Node program:

```javascript
const { fork } = require('child_process');
const { WranggleRpc, IpcTransport } = require('@wranggle/rpc');

const child = fork(pathToSomeChildScript, [ ], {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ],
  });

const rpc = new WranggleRpc({
  transport: new IpcTransport({ 
    ipc: child,
  }),
  channel: 'some-channel'
});

const remote = rpc.remoteInterface();


// Can now add method handlers that the child can call with rpc.addRequestHandlerDelegate / rpc.addRequestHandler 
// Can call method handlers defined the child process with `remote`   
```

In the child (pathToSomeChildScript) program:

```javascript
const { WranggleRpc, IpcTransport } = require('@wranggle/rpc');


const rpc = new WranggleRpc({
  transport: new IpcTransport({ 
    ipc: process,
  }),
  channel: 'some-channel'
});

const remote = rpc.remoteInterface();

// Can now add method handlers that the parent can call with rpc.addRequestHandlerDelegate / rpc.addRequestHandler 
// Can call method handlers defined on the parent process with `remote`   
```

