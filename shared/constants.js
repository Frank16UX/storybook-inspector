/**
 * Message types for communication between content script, service worker, and side panel.
 */
const MSG = {
  // Picker
  ACTIVATE_PICKER: 'ACTIVATE_PICKER',
  DEACTIVATE_PICKER: 'DEACTIVATE_PICKER',
  ELEMENT_DATA: 'ELEMENT_DATA',

  // Token extraction
  EXTRACT_TOKENS: 'EXTRACT_TOKENS',
  TOKEN_DATA: 'TOKEN_DATA',

  // Health check
  PING: 'PING',
  PONG: 'PONG',

  // Side panel ready
  PANEL_READY: 'PANEL_READY',
};

// Make available in both content script and ES module contexts
if (typeof globalThis !== 'undefined') {
  globalThis.__SBI_MSG = MSG;
}
