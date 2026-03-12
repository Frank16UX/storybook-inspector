/**
 * SCSS Variable Parser — regex-based parser for $variable declarations.
 * Resolves simple variable references and normalizes values.
 */
const SCSSParser = {
  /**
   * Parse SCSS text and return a map of variable name → normalized value.
   * @param {string} scss - Raw SCSS text
   * @returns {Object} Map of { variableName: normalizedValue }
   */
  parse(scss) {
    // Strip comments
    const cleaned = scss
      .replace(/\/\/.*$/gm, '')    // single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments

    const varMap = {};
    const regex = /\$([\w-]+)\s*:\s*(.+?)(?:\s*!default)?\s*;/g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const name = match[1];
      const rawValue = match[2].trim();
      varMap[name] = rawValue;
    }

    // Resolve simple variable references ($link-color: $primary)
    const resolved = {};
    for (const [name, value] of Object.entries(varMap)) {
      resolved[name] = this._resolveRefs(value, varMap, new Set());
    }

    // Normalize all values
    const normalized = {};
    for (const [name, value] of Object.entries(resolved)) {
      normalized[name] = this.normalizeValue(value);
    }

    return normalized;
  },

  /**
   * Resolve $variable references within a value.
   */
  _resolveRefs(value, varMap, visited) {
    return value.replace(/\$([\w-]+)/g, (full, refName) => {
      if (visited.has(refName) || !varMap[refName]) return full;
      visited.add(refName);
      return this._resolveRefs(varMap[refName], varMap, visited);
    });
  },

  /**
   * Normalize a CSS value for comparison.
   * - Lowercase
   * - Expand shorthand hex (#abc → #aabbcc)
   * - Convert rgb/rgba to hex
   * - Strip trailing zero-units (0px → 0)
   */
  normalizeValue(value) {
    if (!value || typeof value !== 'string') return '';
    let v = value.trim().toLowerCase();

    // Expand shorthand hex
    v = v.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])(?![0-9a-f])/gi, '#$1$1$2$2$3$3');

    // Convert rgb()/rgba() to hex
    v = v.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g,
      (_, r, g, b) => {
        return '#' + [r, g, b].map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
      });

    // Strip zero-units (0px, 0em, 0rem → 0)
    v = v.replace(/\b0(?:px|em|rem|%|vh|vw|pt)\b/g, '0');

    return v;
  },
};

// Export for different contexts
if (typeof globalThis !== 'undefined') {
  globalThis.__SBI_SCSSParser = SCSSParser;
}
