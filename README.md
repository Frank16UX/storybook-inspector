# Storybook Inspector

A Chrome extension for inspecting design tokens on any web page — built especially for Storybook.

Pick any element, see its colors, fonts, spacing, and CSS variables at a glance. Then compare what's actually on the page against your baseline SCSS design tokens to catch inconsistencies fast.

---

## What it does

**Element tab** — Click any element on the page to inspect it:
- Typography (font, size, weight, line height)
- Colors with visual swatches
- Box model (margin, border, padding, content size)
- Layout properties
- CSS custom properties (`--variable-name`)

**Tokens tab** — Scan the entire page and collect:
- All unique colors
- Font families and sizes
- Spacing values
- Every CSS variable defined on the page
- Export everything as a JSON file

**Compare tab** — Paste your SCSS design tokens and compare them against what's actually on the page:
- Green = token matches
- Red = value is different from what it should be
- Yellow = token is missing from the page entirely
- Blue = extra CSS variables found on page with no SCSS counterpart

Works on any page, and is specifically built to work inside **Storybook's preview iframe** — so you're always inspecting the real story, not the Storybook shell.

---

## How to install

> No Node.js or terminal required. You just load the folder directly into Chrome.

### Step 1 — Download the extension

Click the green **Code** button on this page → **Download ZIP** → unzip it anywhere on your computer (Desktop, Downloads, wherever).

### Step 2 — Open Chrome Extensions

In Chrome, go to this address in your browser bar:

```
chrome://extensions
```

### Step 3 — Enable Developer Mode

In the top-right corner of the Extensions page, flip the **Developer mode** toggle on.

### Step 4 — Load the extension

Click **Load unpacked** → navigate to the folder you unzipped → select the `storybook-inspector` folder → click **Open**.

The Storybook Inspector icon will appear in your Chrome toolbar.

> Tip: Pin it for easy access — click the puzzle piece icon in the toolbar and pin Storybook Inspector.

---

## How to use

1. Open any web page or Storybook instance (e.g. `localhost:6006`)
2. Click the **Storybook Inspector** icon in the toolbar — the side panel opens on the right
3. Click **Pick** and hover over elements on the page — click one to inspect it
4. Switch to the **Tokens** tab and click **Extract All Tokens** to scan the whole page
5. Switch to the **Compare** tab, paste your `.scss` variables, and click **Compare**

### For Storybook

Navigate to a story in Storybook, then use **Pick** to click elements inside the story preview. The extension reads styles directly from the story iframe.

---

## Supported token format

The Compare tab accepts standard SCSS variable syntax:

```scss
$color-primary: #3366ff;
$font-size-base: 16px;
$spacing-md: 24px;
$border-radius: 8px;
```

You can paste the content directly into the text area, or upload a `.scss` file.

---

## Tips

- Click any value in the panel to copy it to your clipboard
- Press **Escape** while picking to cancel without selecting
- Use **Export JSON** in the Tokens tab to save all found tokens to a file
- The panel supports dark and light mode automatically

---

## Feedback & issues

Found a bug or have a suggestion? Open an issue on GitHub.
