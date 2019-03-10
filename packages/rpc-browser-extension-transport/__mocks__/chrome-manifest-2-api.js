

// jest.mock didn't like this file. Doing it inline. todo: fix or remove:

function hasChromeExtensionApi() {
  return true;
}

function getChromeRuntimeId() {
  return FakeChromeExtensionId;
}

function isContentScript() {
  return false;
}

function sendRuntimeMessage(payload, cb) {
}

function sendMessageToTab(tabId, payload, cb) {
}

function addMessageListener(listener) {
}

function removeMessageListener(listener) {
}

// function warnIfErrorCb() {
//   return () => {};
// }


module.exports = {
  addMessageListener,
  getChromeRuntimeId,
  hasChromeExtensionApi,
  isContentScript,
  removeMessageListener,
  sendMessageToTab,
  sendRuntimeMessage,
  // warnIfErrorCb,
};
