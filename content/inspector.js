/**
 * Content Script — Element picker, highlight overlay, style extraction.
 * Runs in all frames including Storybook's preview iframe.
 */
(function () {
  // Guard against double-injection. Truthy build marker — read `__sbiInjected` in the
  // page console to confirm which version of this script is live in a given frame.
  if (window.__sbiInjected) return;
  window.__sbiInjected = 'raf-track';

  const MSG = globalThis.__SBI_MSG;
  let pickerActive = false;
  let lockedElement = null;
  let highlightedElement = null;
  let trackRafId = 0;
  let lastRectKey = '';

  // --- Overlay & Tooltip ---
  const overlay = document.createElement('div');
  overlay.id = 'sbi-highlight-overlay';
  document.documentElement.appendChild(overlay);

  const tooltip = document.createElement('div');
  tooltip.id = 'sbi-highlight-tooltip';
  document.documentElement.appendChild(tooltip);

  function drawOverlay(el, force) {
    const rect = el.getBoundingClientRect();

    // Bail out unless the geometry actually moved, so the per-frame tracker doesn't
    // touch the DOM 60 times a second while the page sits still.
    const rectKey = `${rect.top}|${rect.left}|${rect.width}|${rect.height}`;
    if (!force && rectKey === lastRectKey) return;
    lastRectKey = rectKey;

    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';

    // Tooltip
    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).join('.')
      : '';
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    tooltip.innerHTML =
      `<span class="sbi-tag">${tag}</span><span class="sbi-class">${cls}</span><span class="sbi-dims">${dims}</span>`;
    tooltip.style.display = 'block';

    // Position tooltip above element, or below if no room
    let tooltipTop = rect.top - 28;
    if (tooltipTop < 4) tooltipTop = rect.bottom + 4;
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = Math.max(4, rect.left) + 'px';
  }

  function hideOverlay() {
    highlightedElement = null;
    lastRectKey = '';
    if (trackRafId) {
      cancelAnimationFrame(trackRafId);
      trackRafId = 0;
    }
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
  }

  /**
   * Re-measure the highlighted element every frame.
   *
   * Listening for `scroll` is not enough: the rect also moves on nested container
   * scrolls, sticky/animated layout, browser zoom, and — in Storybook — when the
   * preview iframe itself shifts inside its parent, which fires no scroll event in
   * this frame at all. Re-measuring is a single getBoundingClientRect() per frame,
   * and drawOverlay() no-ops unless the geometry changed.
   */
  function trackOverlay() {
    trackRafId = requestAnimationFrame(trackOverlay);
    if (!highlightedElement) return;
    if (!highlightedElement.isConnected) {
      hideOverlay();
      return;
    }
    drawOverlay(highlightedElement, false);
  }

  function positionOverlay(el) {
    highlightedElement = el;
    drawOverlay(el, true);
    if (!trackRafId) trackOverlay();
  }

  // --- Style Extraction ---
  function extractStyles(el) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    return {
      selector: buildSelector(el),
      tagName: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className : '',
      id: el.id || '',
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      typography: {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        textTransform: cs.textTransform,
        fontStyle: cs.fontStyle,
        textDecoration: cs.textDecoration,
      },
      colors: {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
        outlineColor: cs.outlineColor,
      },
      boxModel: {
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
      },
      layout: {
        display: cs.display,
        position: cs.position,
        flexDirection: cs.flexDirection,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        gap: cs.gap,
        overflow: cs.overflow,
        opacity: cs.opacity,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
      },
      cssVariables: discoverCSSVariables(el),
    };
  }

  function buildSelector(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).filter(Boolean).join('.')
      : '';
    return tag + cls;
  }

  // --- CSS Custom Property Discovery ---
  function discoverCSSVariables(el) {
    const variables = {};
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (const rule of rules) {
            if (!rule.selectorText || !rule.style) continue;
            try {
              if (!el.matches(rule.selectorText)) continue;
            } catch { continue; }
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                variables[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        } catch {
          // Cross-origin stylesheet — skip silently
        }
      }
    } catch {
      // No stylesheets accessible
    }

    // Also check inline style for CSS variables
    if (el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        if (prop.startsWith('--')) {
          variables[prop] = el.style.getPropertyValue(prop).trim();
        }
      }
    }

    return variables;
  }

  // --- Token Extraction (all elements on page) ---
  function extractAllTokens() {
    const colors = new Set();
    const fonts = new Set();
    const sizes = new Set();
    const spacing = new Set();
    const cssVars = {};

    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      try {
        const cs = getComputedStyle(el);

        // Colors
        for (const prop of ['color', 'backgroundColor', 'borderColor', 'outlineColor']) {
          const val = cs[prop];
          if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
            colors.add(val);
          }
        }

        // Fonts
        fonts.add(cs.fontFamily);

        // Sizes
        sizes.add(cs.fontSize);

        // Spacing (padding/margin)
        for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
          const pad = cs['padding' + side];
          const mar = cs['margin' + side];
          if (pad && pad !== '0px') spacing.add(pad);
          if (mar && mar !== '0px') spacing.add(mar);
        }
      } catch {
        // Skip inaccessible elements
      }
    }

    // Collect CSS custom properties from all stylesheets
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (const rule of rules) {
            if (!rule.style) continue;
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                cssVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        } catch {
          // Cross-origin stylesheet
        }
      }
    } catch { /* no sheets */ }

    return {
      colors: [...colors].sort(),
      fonts: [...fonts].sort(),
      sizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
      spacing: [...spacing].sort((a, b) => parseFloat(a) - parseFloat(b)),
      cssVariables: cssVars,
      isStorybookPreview: isInStorybookPreview(),
    };
  }

  function isInStorybookPreview() {
    try {
      return window.frameElement &&
        (window.frameElement.id === 'storybook-preview-iframe' ||
         window.frameElement.title === 'storybook-preview-iframe');
    } catch {
      return false;
    }
  }

  // --- Picker Event Handlers ---
  function onMouseMove(e) {
    if (!pickerActive || lockedElement) return;
    const target = e.target;
    if (target === overlay || target === tooltip) return;
    positionOverlay(target);
  }

  function onMouseClick(e) {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target === overlay || target === tooltip) return;

    lockedElement = target;
    positionOverlay(target);

    const data = extractStyles(target);
    chrome.runtime.sendMessage({ type: MSG.ELEMENT_DATA, data });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && pickerActive) {
      deactivatePicker();
      chrome.runtime.sendMessage({ type: MSG.DEACTIVATE_PICKER });
    }
  }

  function activatePicker() {
    pickerActive = true;
    lockedElement = null;
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onMouseClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'crosshair';
  }

  function deactivatePicker() {
    pickerActive = false;
    lockedElement = null;
    hideOverlay();
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onMouseClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = '';
  }

  // --- Message Listener ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ type: 'PONG', frame: window.location.href });
        break;

      case 'ACTIVATE_PICKER':
        activatePicker();
        // Always acknowledge: an unanswered message closes the port, which sets
        // lastError in the service worker and used to trigger a redundant re-injection.
        sendResponse({ ok: true });
        break;

      case 'DEACTIVATE_PICKER':
        deactivatePicker();
        sendResponse({ ok: true });
        break;

      case 'EXTRACT_TOKENS':
        // Only respond from Storybook preview frame, or main frame if not in Storybook
        if (isInStorybookPreview() || window === window.top) {
          const tokens = extractAllTokens();
          chrome.runtime.sendMessage({ type: 'TOKEN_DATA', data: tokens });
        }
        sendResponse({ ok: true });
        break;
    }
  });
})();
