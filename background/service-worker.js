/**
 * Service Worker — message router and side panel opener.
 */

// Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
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
        if (chrome.runtime.lastError) {
          // Content script not injected — try fallback injection
          injectContentScript(tabId, () => {
            chrome.tabs.sendMessage(tabId, message);
          });
        }
        if (response) sendResponse(response);
      });
    });
    return true; // async sendResponse
  }
});

/**
 * Fallback: inject content script if it wasn't auto-injected (e.g., page loaded before extension).
 */
function injectContentScript(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['shared/constants.js', 'content/inspector.js']
  }, () => {
    chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: ['content/inspector.css']
    }, callback);
  });
}
