
// todo: declare global "chrome".

type Callback = (...args: any[]) => void;

export function hasChromeExtensionApi() {
  // @ts-ignore
  return !!global.chrome || !!chrome.runtime;
}

export function getChromeRuntimeId() {
  // @ts-ignore
  return chrome.runtime.id;
}

export function isContentScript() {
// @ts-ignore
  return typeof chrome.runtime.sendMessage === 'function' && typeof chrome.runtime.getPlatformInfo !== 'function';
}

export function sendRuntimeMessage(payload: any, cb?: Callback) {
  // @ts-ignore
  chrome.runtime.sendMessage(payload, cb);
}

export function sendMessageToTab(tabId: number, payload: any, cb?: Callback) {
  // @ts-ignore
  chrome.tabs.sendMessage(tabId, payload, cb);
}

export function addMessageListener(listener: Callback) {
  // @ts-ignore
  chrome.runtime.onMessage.addListener(listener)
}

export function removeMessageListener(listener: Callback) {
  // @ts-ignore
  chrome.runtime.onMessage.removeListener(listener);
}

// export function warnIfErrorCb() {
//   return (err: any) => {
//     // @ts-ignore
//     if (chrome.runtime.lastError || err) {
//       // @ts-ignore
//       console.warn(chrome.runtime.lastError || err);
//     }
//     // @ts-ignore
//     return Promise.resolve();
//   }
// }
