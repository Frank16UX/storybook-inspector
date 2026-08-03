/**
 * Service Worker — message router and side panel opener.
 */

// Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Track side panel connection so we can deactivate picker when it closes
let panelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return;
  panelPort = port;

  port.onDisconnect.addListener(() => {
    panelPort = null;
    // Panel closed — deactivate picker on the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DEACTIVATE_PICKER' }).catch(() => {});
    });
  });
});

// Route messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Messages from content script → forward to side panel
  if (sender.tab) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Side panel not open yet — ignore
    });
    return;
  }

  // Messages from side panel → forward to active tab's content scripts
  if (message.type === 'ACTIVATE_PICKER' ||
      message.type === 'DEACTIVATE_PICKER' ||
      message.type === 'EXTRACT_TOKENS' ||
      message.type === 'PING') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err && isMissingReceiver(err)) {
          // Content script really isn't there — try fallback injection
          injectContentScript(tabId, () => {
            chrome.tabs.sendMessage(tabId, message, () => void chrome.runtime.lastError);
          });
        }
        if (response) sendResponse(response);
      });
    });
    return true; // async sendResponse
  }
});

/**
 * Distinguish "no content script in this tab" from benign messaging errors such as
 * "The message port closed before a response was received", which fires whenever a
 * frame handles a message without calling sendResponse. Re-injecting on those would
 * run the content scripts a second time in frames that already have them.
 */
function isMissingReceiver(err) {
  const msg = err.message || '';
  return msg.includes('Receiving end does not exist') ||
         msg.includes('Could not establish connection');
}

/**
 * Fallback: inject content script if it wasn't auto-injected (e.g., page loaded before extension).
 */
function injectContentScript(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['shared/constants.js', 'content/inspector.js']
  }, () => {
    // Frames that can't be scripted (e.g. chrome:// or blocked origins) set lastError;
    // read it so it isn't reported as an unchecked runtime error.
    void chrome.runtime.lastError;
    chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: ['content/inspector.css']
    }, () => {
      void chrome.runtime.lastError;
      if (callback) callback();
    });
  });
}
