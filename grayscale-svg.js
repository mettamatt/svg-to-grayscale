// grayscale-svg.js

let svgson, tinycolor;

// 1) Environment detection:
if (typeof process !== 'undefined' && process?.versions?.node) {
  // Node environment → local imports from node_modules
  const svgsonModule = await import('svgson');
  svgson = svgsonModule;
  const tinyModule = await import('tinycolor2');
  tinycolor = tinyModule.default;
} else {
  // Browser environment → import from CDNs
  svgson = await import('https://cdn.jsdelivr.net/npm/svgson@5.3.1/+esm');
  const tinyModule = await import('https://cdn.jsdelivr.net/npm/tinycolor2@1.6.0/+esm');
  tinycolor = tinyModule.default;
}

// 2) De-structure parseSync, stringify from svgson
const { parseSync, stringify } = svgson;

/**
 * Convert an SVG string to grayscale, with two possible methods:
 *   - HSL-based (tinycolor's .greyscale()) (default)
 *   - Luminance-based (#RRGGBB using 0.299*R + 0.587*G + 0.114*B)
 *
 * Options:
 *   - desaturationAmount (0-100):
 *       * If using HSL, 100 => full .greyscale(), else partial .desaturate(amount).
 *       * If using luminance, partial amounts are ignored (always full luminance).
 *   - grayscaleMethod: 'hsl' | 'luminance'
 *       * 'hsl' => original approach with .greyscale() / .desaturate().
 *       * 'luminance' => uses the Y = 0.299R + 0.587G + 0.114B formula.
 */
export async function convertSvgToGrayscale(svgString, options = {}) {
  const {
    desaturationAmount = 100,  // 0-100 (only affects HSL method)
    grayscaleMethod = 'hsl',   // 'hsl' or 'luminance'
  } = options;

  // Parse the SVG into an AST
  const ast = parseSync(svgString);

  // Detect <style> (unsupported, we just warn)
  detectStyleElements(ast);

  // Expand inline style=... attributes
  expandStyleAttributes(ast);

  // Traverse & convert fill/stroke-like properties to grayscale
  const colorCache = new Map();
  traverseAndGrayscale(ast, {
    desaturationAmount,
    grayscaleMethod,
    colorCache,
  });

  // Re-stringify the modified AST
  return stringify(ast);
}

/**
 * If we see a <style> element, warn. We don't parse inline or external CSS rules.
 */
function detectStyleElements(node) {
  if (node.name === 'style') {
    console.warn(
      'Detected <style> element. Inline/external CSS rules are not fully supported by this converter.'
    );
  }
  if (node.children) {
    node.children.forEach(detectStyleElements);
  }
}

/**
 * Expand style="fill:..., stroke:..., stop-color:..." into direct attributes.
 */
function expandStyleAttributes(node) {
  if (node.attributes?.style) {
    const styleStr = node.attributes.style;
    const decls = styleStr.split(';').map((d) => d.trim());
    decls.forEach((decl) => {
      if (!decl) return;
      const [prop, val] = decl.split(':').map((x) => x.trim());
      switch (prop) {
        case 'fill':
        case 'stroke':
        case 'color':
        case 'stop-color':
          node.attributes[prop] = val;
          break;
        // Add more recognized style props if needed (e.g. stroke-opacity)
        default:
          // unrecognized style
          break;
      }
    });
    delete node.attributes.style;
  }

  if (node.children) {
    node.children.forEach(expandStyleAttributes);
  }
}

/**
 * Traverse the AST, converting known color attributes to grayscale,
 * while preserving 'url(#...)' references (gradients).
 */
function traverseAndGrayscale(node, config) {
  if (node.attributes) {
    // fill
    if (node.attributes.fill && node.attributes.fill !== 'none') {
      const fillVal = node.attributes.fill;
      // skip if it's a paint server ref like url(#id)
      if (!fillVal.startsWith('url(')) {
        node.attributes.fill = toGray(fillVal, config);
      }
    }
    // stroke
    if (node.attributes.stroke && node.attributes.stroke !== 'none') {
      const strokeVal = node.attributes.stroke;
      if (!strokeVal.startsWith('url(')) {
        node.attributes.stroke = toGray(strokeVal, config);
      }
    }
    // color
    if (node.attributes.color && node.attributes.color !== 'none') {
      const colorVal = node.attributes.color;
      if (!colorVal.startsWith('url(')) {
        node.attributes.color = toGray(colorVal, config);
      }
    }
    // gradient stop-color
    if (node.name === 'stop' && node.attributes['stop-color'] && node.attributes['stop-color'] !== 'none') {
      node.attributes['stop-color'] = toGray(node.attributes['stop-color'], config);
    }
  }

  if (node.children) {
    node.children.forEach((child) => traverseAndGrayscale(child, config));
  }
}

/**
 * Convert a single color to grayscale while preserving alpha.
 */
function toGray(originalColor, config) {
  const { desaturationAmount, grayscaleMethod, colorCache } = config;
  const cacheKey = `${originalColor}:${desaturationAmount}:${grayscaleMethod}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }

  // TinyColor parse (handles RGBA, HSLA, #RGBA, etc.)
  const c = tinycolor(originalColor);
  if (!c.isValid()) {
    // Return as-is if invalid
    return originalColor;
  }

  // Keep alpha from original color
  const alpha = c.getAlpha(); // range 0..1

  let converted;
  if (grayscaleMethod === 'luminance') {
    // Luminance-based
    const { r, g, b } = c.toRgb();
    const Y = 0.299 * r + 0.587 * g + 0.114 * b; // in [0..255]
    const grayVal = Math.round(Y);
    converted = tinycolor({ r: grayVal, g: grayVal, b: grayVal, a: alpha });
  } else {
    // HSL-based
    if (desaturationAmount === 100) {
      converted = c.greyscale();
    } else {
      converted = c.desaturate(desaturationAmount);
    }
    // Ensure the alpha remains
    converted.setAlpha(alpha);
  }

  // Use .toHex8String() => #RRGGBBAA or #RRGGBB if alpha=1
  const finalColor = converted.toHex8String();

  colorCache.set(cacheKey, finalColor);
  return finalColor;
}
