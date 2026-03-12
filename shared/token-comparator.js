/**
 * Token Comparator — two-pass comparison of page tokens vs SCSS baseline.
 *
 * Pass 1: Name match — --color-primary (CSS) ↔ $color-primary (SCSS)
 * Pass 2: Value match — for unmatched SCSS vars, check if normalized value appears on page
 */
const TokenComparator = {
  /**
   * Compare extracted page tokens against SCSS baseline.
   * @param {Object} pageTokens - { cssVariables: {}, colors: [], fonts: [], sizes: [], spacing: [] }
   * @param {Object} scssVars - Parsed/normalized SCSS variables { name: value }
   * @returns {Object} Comparison report
   */
  compare(pageTokens, scssVars) {
    const normalizer = globalThis.__SBI_SCSSParser;
    const report = {
      matches: [],      // SCSS vars that match page values
      mismatches: [],   // SCSS vars present on page but with different values
      missingOnPage: [], // SCSS vars not found on page at all
      extraOnPage: [],  // CSS vars on page with no SCSS counterpart
      summary: {},
    };

    const matchedScss = new Set();
    const matchedCss = new Set();

    // Build a normalized map of page CSS variables
    const pageCssVars = {};
    for (const [prop, val] of Object.entries(pageTokens.cssVariables || {})) {
      pageCssVars[prop] = normalizer ? normalizer.normalizeValue(val) : val.toLowerCase();
    }

    // Collect all normalized page values for value-matching
    const allPageValues = new Set();
    for (const val of Object.values(pageCssVars)) {
      allPageValues.add(val);
    }
    for (const arr of [pageTokens.colors, pageTokens.fonts, pageTokens.sizes, pageTokens.spacing]) {
      if (!arr) continue;
      for (const v of arr) {
        allPageValues.add(normalizer ? normalizer.normalizeValue(v) : v.toLowerCase());
      }
    }

    // --- Pass 1: Name match ---
    // Convert SCSS $var-name to CSS --var-name for matching
    for (const [scssName, scssValue] of Object.entries(scssVars)) {
      const cssEquiv = '--' + scssName;

      if (cssEquiv in pageCssVars) {
        matchedScss.add(scssName);
        matchedCss.add(cssEquiv);

        if (pageCssVars[cssEquiv] === scssValue) {
          report.matches.push({
            scssVar: '$' + scssName,
            cssVar: cssEquiv,
            value: scssValue,
          });
        } else {
          report.mismatches.push({
            scssVar: '$' + scssName,
            cssVar: cssEquiv,
            expected: scssValue,
            actual: pageCssVars[cssEquiv],
          });
        }
      }
    }

    // --- Pass 2: Value match for unmatched SCSS vars ---
    for (const [scssName, scssValue] of Object.entries(scssVars)) {
      if (matchedScss.has(scssName)) continue;

      if (allPageValues.has(scssValue)) {
        report.matches.push({
          scssVar: '$' + scssName,
          cssVar: null,
          value: scssValue,
          matchType: 'value',
        });
        matchedScss.add(scssName);
      }
    }

    // --- Unmatched ---
    for (const [scssName, scssValue] of Object.entries(scssVars)) {
      if (!matchedScss.has(scssName)) {
        report.missingOnPage.push({
          scssVar: '$' + scssName,
          expectedValue: scssValue,
        });
      }
    }

    for (const [cssVar, cssValue] of Object.entries(pageCssVars)) {
      if (!matchedCss.has(cssVar)) {
        report.extraOnPage.push({
          cssVar,
          value: cssValue,
        });
      }
    }

    // Summary
    report.summary = {
      totalScss: Object.keys(scssVars).length,
      totalPageVars: Object.keys(pageCssVars).length,
      matches: report.matches.length,
      mismatches: report.mismatches.length,
      missingOnPage: report.missingOnPage.length,
      extraOnPage: report.extraOnPage.length,
    };

    return report;
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.__SBI_TokenComparator = TokenComparator;
}
