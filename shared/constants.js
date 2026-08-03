/**
 * Message types for communication between content script, service worker, and side panel.
 *
 * Wrapped in an IIFE with a global guard because this file can run more than once in the
 * same frame (manifest content_scripts plus the service worker's fallback injection).
 * A top-level `const` would throw "Identifier 'MSG' has already been declared".
 */
(function () {
  if (globalThis.__SBI_MSG) return;

  globalThis.__SBI_MSG = {
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
})();
