# Changelog

All notable changes to Storybook Inspector will be documented here.

---

## [1.0.0] — 2026-03-12

First release.

### Added

- **Element Inspector** — pick any element on the page with a crosshair cursor and see its computed styles: typography, colors, box model, layout, and CSS custom properties
- **Highlight overlay** — blue border and tooltip showing the element tag, class, and dimensions while hovering
- **Tokens tab** — scan the full page and extract all unique colors, font families, font sizes, spacing values, and CSS variables; export as JSON
- **Compare tab** — paste SCSS variables (`$var: value;`) or upload a `.scss` file and compare against live page tokens; results grouped as matches, mismatches, missing, and extra
- **Storybook iframe support** — content script runs inside the Storybook preview iframe so stories are inspected directly, not the surrounding shell
- **CSS variable discovery** — walks all stylesheets to find `--custom-property` declarations matching the selected element (cross-origin sheets are silently skipped)
- **SCSS parser** — strips comments, resolves `$variable` references, normalizes values (hex expansion, rgb→hex conversion, zero-unit stripping) for accurate comparison
- **Two-pass comparison** — name match (`--var` ↔ `$var`) first, then value match for any remaining unmatched tokens
- **Copy to clipboard** — click any value in the panel to copy it
- **Escape key** — cancels the element picker without locking a selection
- **JSON export** — download all extracted tokens from the Tokens tab
- **Dark / light mode** — panel theme follows the system preference
- **No build step** — plain HTML, CSS, and JavaScript; load directly as an unpacked Chrome extension
