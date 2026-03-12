/**
 * Side Panel — Tab switching, rendering, comparison orchestration.
 */
(function () {
  const MSG = globalThis.__SBI_MSG;
  const SCSSParser = globalThis.__SBI_SCSSParser;
  const TokenComparator = globalThis.__SBI_TokenComparator;

  let pickerActive = false;
  let lastTokenData = null;

  // --- DOM References ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Toast ---
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1500);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
  }

  // --- Tab Switching ---
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      $$('.tab-content').forEach((tc) => tc.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // --- Pick Button ---
  $('#btn-pick').addEventListener('click', () => {
    pickerActive = !pickerActive;
    $('#btn-pick').classList.toggle('active', pickerActive);
    chrome.runtime.sendMessage({
      type: pickerActive ? MSG.ACTIVATE_PICKER : MSG.DEACTIVATE_PICKER,
    });
  });

  // --- Extract Tokens Button ---
  $('#btn-extract').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.EXTRACT_TOKENS });
    $('#tokens-empty').style.display = 'none';
  });

  // --- Export JSON Button ---
  $('#btn-export').addEventListener('click', () => {
    if (!lastTokenData) return;
    const blob = new Blob([JSON.stringify(lastTokenData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tokens.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- SCSS File Upload ---
  $('#scss-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $('#scss-input').value = reader.result;
    };
    reader.readAsText(file);
  });

  // --- Compare Button ---
  $('#btn-compare').addEventListener('click', () => {
    const scssText = $('#scss-input').value.trim();
    if (!scssText) {
      showToast('Paste SCSS variables first');
      return;
    }
    if (!lastTokenData) {
      // Auto-extract tokens if not done yet
      chrome.runtime.sendMessage({ type: MSG.EXTRACT_TOKENS });
      showToast('Extracting tokens first…');
      // Will re-trigger compare when data arrives
      window.__pendingCompare = true;
      return;
    }
    runComparison(scssText);
  });

  function runComparison(scssText) {
    const scssVars = SCSSParser.parse(scssText);
    const report = TokenComparator.compare(lastTokenData, scssVars);
    renderCompareResults(report);
  }

  // --- Message Handling ---
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case MSG.ELEMENT_DATA:
        renderElementData(message.data);
        // Deactivate picker after selection
        pickerActive = false;
        $('#btn-pick').classList.remove('active');
        break;

      case MSG.TOKEN_DATA:
        lastTokenData = message.data;
        renderTokenData(message.data);
        $('#btn-export').disabled = false;
        // If compare was pending, run it now
        if (window.__pendingCompare) {
          window.__pendingCompare = false;
          const scssText = $('#scss-input').value.trim();
          if (scssText) runComparison(scssText);
        }
        break;

      case MSG.DEACTIVATE_PICKER:
        pickerActive = false;
        $('#btn-pick').classList.remove('active');
        break;
    }
  });

  // --- Render: Element Data ---
  function renderElementData(data) {
    $('#element-empty').style.display = 'none';
    $('#element-data').style.display = 'block';

    // Selector
    $('#element-selector').textContent = data.selector;
    $('#element-selector').onclick = () => copyToClipboard(data.selector);

    // Typography
    renderPropGrid('#typography-grid', data.typography);

    // Colors
    renderColorGrid('#colors-grid', data.colors);

    // Box model
    renderBoxModel(data.boxModel, data.dimensions);

    // Layout
    renderPropGrid('#layout-grid', data.layout);

    // CSS Variables
    const varsEntries = Object.entries(data.cssVariables || {});
    if (varsEntries.length > 0) {
      $('#css-vars-card').style.display = 'block';
      renderPropGrid('#css-vars-grid', data.cssVariables);
    } else {
      $('#css-vars-card').style.display = 'none';
    }
  }

  function renderPropGrid(selector, obj) {
    const container = $(selector);
    container.innerHTML = '';
    for (const [key, value] of Object.entries(obj)) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<span class="prop-name">${formatPropName(key)}</span><span class="prop-value" title="${escapeHtml(value)}">${escapeHtml(value)}</span>`;
      row.addEventListener('click', () => copyToClipboard(value));
      container.appendChild(row);
    }
  }

  function renderColorGrid(selector, colors) {
    const container = $(selector);
    container.innerHTML = '';
    for (const [name, value] of Object.entries(colors)) {
      const item = document.createElement('div');
      item.className = 'color-swatch-item';
      item.innerHTML = `
        <div class="color-swatch" style="background:${value}"></div>
        <div>
          <div class="color-label">${escapeHtml(value)}</div>
          <div class="color-prop-name">${formatPropName(name)}</div>
        </div>`;
      item.addEventListener('click', () => copyToClipboard(value));
      container.appendChild(item);
    }
  }

  function renderBoxModel(box, dims) {
    const px = (v) => parseInt(v, 10) || 0;
    $('#bm-margin-top').textContent = px(box.marginTop);
    $('#bm-margin-right').textContent = px(box.marginRight);
    $('#bm-margin-bottom').textContent = px(box.marginBottom);
    $('#bm-margin-left').textContent = px(box.marginLeft);
    $('#bm-border-top').textContent = px(box.borderTopWidth);
    $('#bm-border-right').textContent = px(box.borderRightWidth);
    $('#bm-border-bottom').textContent = px(box.borderBottomWidth);
    $('#bm-border-left').textContent = px(box.borderLeftWidth);
    $('#bm-padding-top').textContent = px(box.paddingTop);
    $('#bm-padding-right').textContent = px(box.paddingRight);
    $('#bm-padding-bottom').textContent = px(box.paddingBottom);
    $('#bm-padding-left').textContent = px(box.paddingLeft);
    $('#bm-content-size').textContent = `${dims.width} × ${dims.height}`;
  }

  // --- Render: Token Data ---
  function renderTokenData(data) {
    $('#tokens-empty').style.display = 'none';
    $('#tokens-data').style.display = 'block';

    // Colors
    renderTokenColorGrid('#token-colors', data.colors);
    $('#token-colors-count').textContent = data.colors.length;

    // Fonts
    renderTokenList('#token-fonts', data.fonts);
    $('#token-fonts-count').textContent = data.fonts.length;

    // Sizes
    renderTokenList('#token-sizes', data.sizes);
    $('#token-sizes-count').textContent = data.sizes.length;

    // Spacing
    renderTokenList('#token-spacing', data.spacing);
    $('#token-spacing-count').textContent = data.spacing.length;

    // CSS Variables
    const varsEntries = Object.entries(data.cssVariables || {});
    renderPropGrid('#token-vars', data.cssVariables || {});
    $('#token-vars-count').textContent = varsEntries.length;
  }

  function renderTokenColorGrid(selector, colors) {
    const container = $(selector);
    container.innerHTML = '';
    for (const color of colors) {
      const item = document.createElement('div');
      item.className = 'color-swatch-item';
      item.innerHTML = `
        <div class="color-swatch" style="background:${color}"></div>
        <div class="color-label">${escapeHtml(color)}</div>`;
      item.addEventListener('click', () => copyToClipboard(color));
      container.appendChild(item);
    }
  }

  function renderTokenList(selector, items) {
    const container = $(selector);
    container.innerHTML = '';
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<span class="prop-value">${escapeHtml(item)}</span>`;
      row.addEventListener('click', () => copyToClipboard(item));
      container.appendChild(row);
    }
  }

  // --- Render: Compare Results ---
  function renderCompareResults(report) {
    $('#compare-empty').style.display = 'none';
    $('#compare-results').style.display = 'block';

    // Summary
    const s = report.summary;
    $('#compare-summary').innerHTML = `
      <div class="summary-stat stat-green">
        <div class="stat-value">${s.matches}</div>
        <div class="stat-label">Matches</div>
      </div>
      <div class="summary-stat stat-red">
        <div class="stat-value">${s.mismatches}</div>
        <div class="stat-label">Mismatches</div>
      </div>
      <div class="summary-stat stat-yellow">
        <div class="stat-value">${s.missingOnPage}</div>
        <div class="stat-label">Missing</div>
      </div>
      <div class="summary-stat stat-blue">
        <div class="stat-value">${s.extraOnPage}</div>
        <div class="stat-label">Extra</div>
      </div>`;

    // Matches
    renderCompareSection('matches', report.matches, (item) => {
      const matchNote = item.matchType === 'value' ? ' (value match)' : '';
      return `<span class="compare-var">${escapeHtml(item.scssVar)}</span>
        <span class="compare-values">${escapeHtml(item.value)}${matchNote}</span>`;
    });

    // Mismatches
    renderCompareSection('mismatches', report.mismatches, (item) =>
      `<span class="compare-var">${escapeHtml(item.scssVar)} → ${escapeHtml(item.cssVar)}</span>
       <span class="compare-values">
         <span class="val-expected">expected: ${escapeHtml(item.expected)}</span>
         <span class="val-actual">actual: ${escapeHtml(item.actual)}</span>
       </span>`
    );

    // Missing on page
    renderCompareSection('missing', report.missingOnPage, (item) =>
      `<span class="compare-var">${escapeHtml(item.scssVar)}</span>
       <span class="compare-values">${escapeHtml(item.expectedValue)}</span>`
    );

    // Extra on page
    renderCompareSection('extra', report.extraOnPage, (item) =>
      `<span class="compare-var">${escapeHtml(item.cssVar)}</span>
       <span class="compare-values">${escapeHtml(item.value)}</span>`
    );
  }

  function renderCompareSection(name, items, renderer) {
    const card = $(`#compare-${name}-card`);
    const list = $(`#compare-${name}`);
    const count = $(`#compare-${name}-count`);

    if (items.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    count.textContent = items.length;
    list.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'compare-item';
      el.innerHTML = renderer(item);
      el.addEventListener('click', () => copyToClipboard(JSON.stringify(item, null, 2)));
      list.appendChild(el);
    }
  }

  // --- Helpers ---
  function formatPropName(name) {
    // camelCase → kebab-case for display
    return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
