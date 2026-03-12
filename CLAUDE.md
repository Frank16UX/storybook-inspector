# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Storybook Inspector** is a Chrome extension (Manifest V3) that inspects CSS properties on web pages — particularly Storybook component previews — and compares extracted design tokens against a baseline SCSS design system.

There is no build process, package manager, or transpilation. All code is vanilla JavaScript that runs directly in the browser.

## Loading the Extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select this directory
4. Reload after any changes to `manifest.json`, `background/`, or `content/` files
5. Side panel changes take effect after closing and reopening the panel

## Architecture

### Message-Passing System

All communication uses Chrome's `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`. Message types are defined in `shared/constants.js` and exported as `globalThis.__SBI_MSG` (accessible to both content scripts and ES module contexts).

**Message flow:**
```
Side Panel ──sendMessage──► Service Worker ──sendMessage──► Content Script (active tab)
Content Script ──sendMessage──► Service Worker ──sendMessage──► Side Panel
```

The service worker (`background/service-worker.js`) is the central router. It also handles fallback injection if the content script wasn't auto-loaded.

### Module Loading Pattern

Because content scripts can't use ES module `import`, shared modules use a globals pattern:
- `shared/constants.js` → `globalThis.__SBI_MSG`
- `shared/scss-parser.js` → `globalThis.__SBI_SCSSParser`
- `shared/token-comparator.js` → `globalThis.__SBI_TokenComparator`

The side panel (`sidepanel/sidepanel.js`) loads these via `<script>` tags in `sidepanel.html` and accesses them through the same globals.

### Content Script (`content/inspector.js`)

Runs inside the inspected page (all frames). Responsible for:
- **Element picker**: Adds mousemove/click overlay, sends `ELEMENT_DATA` on click
- **Style extraction** (`extractStyles(el)`): Computes typography, colors, box model, layout, and CSS custom properties
- **Token discovery** (`extractAllTokens()`): Scans all page elements and stylesheets; detects Storybook preview iframes via `window.frameElement`

### SCSS Parser (`shared/scss-parser.js`)

Parses SCSS text with regex, resolves variable references recursively, and normalizes values (hex shorthand expansion, rgb→hex, zero-unit stripping). Used only in the side panel.

### Token Comparator (`shared/token-comparator.js`)

Two-pass comparison:
1. **Name match**: SCSS `$color-primary` ↔ CSS `--color-primary`
2. **Value match**: Unmatched SCSS vars checked against all page values

Output categories: `matches`, `mismatches`, `missingOnPage`, `extraOnPage`, `summary`.

### Side Panel (`sidepanel/`)

Three tabs: **Element** (inspect picked element), **Tokens** (extract all tokens from page), **Compare** (paste SCSS baseline and diff against page tokens). Styled with GitHub-inspired light/dark theme via CSS custom properties.

## Key Files

| File | Role |
|------|------|
| `manifest.json` | Extension config, permissions, entry points |
| `background/service-worker.js` | Message router, panel opener, fallback script injection |
| `content/inspector.js` | Element picker and token extraction (runs in page context) |
| `shared/constants.js` | Message type constants |
| `shared/scss-parser.js` | SCSS variable parser and normalizer |
| `shared/token-comparator.js` | Two-pass token comparison engine |
| `sidepanel/sidepanel.js` | Panel UI logic and rendering |
