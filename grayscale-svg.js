// grayscale-svg.js

let svgson, tinycolor;
if (typeof process !== 'undefined' && process?.versions?.node) {
  // Node environment
  // local imports from node_modules
  const svgsonModule = await import('svgson');
  svgson = svgsonModule;
  const tinyModule = await import('tinycolor2');
  tinycolor = tinyModule.default;
} else {
  // Browser environment
  // CDN imports
  svgson = await import('https://cdn.jsdelivr.net/npm/svgson@5.3.1/+esm');
  const tinyModule = await import('https://cdn.jsdelivr.net/npm/tinycolor2@1.6.0/+esm');
  tinycolor = tinyModule.default;
}

const { parseSync, stringify } = svgson;

/**
 * Convert an SVG string to grayscale, with two possible methods:
 *   - HSL-based (tinycolor's .greyscale()) (default)
 *   - Luminance-based (#RRGGBB using 0.299*R + 0.587*G + 0.114*B)
 *
 * Options:
 *   - desaturationAmount (0-100):
 *        * If using HSL, 100 => full .greyscale(), else partial .desaturate(amount).
 *        * If using luminance, we ignore partial amounts and just do full luminance per channel.
 *   - grayscaleMethod: 'hsl' | 'luminance'
 *        * 'hsl' => original approach with .greyscale() or .desaturate().
 *        * 'luminance' => uses a pixel-luminance formula for each color, ignoring partial desat.
 */
export async function convertSvgToGrayscale(svgString, options = {}) {
  const {
    desaturationAmount = 100,  // 0-100 (only affects HSL method)
    grayscaleMethod = 'hsl',   // 'hsl' or 'luminance'
  } = options;

  // 1) Parse the SVG into an AST
  const ast = parseSync(svgString);

  // 2) Detect <style> (unsupported, we just warn)
  detectStyleElements(ast);

  // 3) Expand inline style="..." properties into direct attributes
  expandStyleAttributes(ast);

  // 4) Traverse & convert all fill/stroke-like properties to grayscale
  const colorCache = new Map();
  traverseAndGrayscale(ast, {
    desaturationAmount,
    grayscaleMethod,
    colorCache,
  });

  // 5) Re-stringify
  return stringify(ast);
}

/**
 * If we see a <style> element, just warn. We don't parse inline CSS rules.
 */
function detectStyleElements(node) {
  if (node.name === 'style') {
    console.warn(
      'Detected <style> element. Inline/external CSS rules are not supported by this converter.'
    );
  }
  if (node.children) {
    node.children.forEach(detectStyleElements);
  }
}

/**
 * Expand style="fill:..., stroke:..., stop-color:..., etc." into direct attributes.
 */
function expandStyleAttributes(node) {
  if (node.attributes?.style) {
    const styleStr = node.attributes.style;
    const decls = styleStr.split(';').map(d => d.trim());
    decls.forEach(decl => {
      if (!decl) return;
      const [prop, val] = decl.split(':').map(x => x.trim());
      switch (prop) {
        case 'fill':
        case 'stroke':
        case 'color':
        case 'stop-color':
          node.attributes[prop] = val;
          break;
        // Add more recognized props if needed
        default:
          // unrecognized style
          break;
      }
    });
    delete node.attributes.style;
  }
  // Recurse into children
  if (node.children) {
    node.children.forEach(expandStyleAttributes);
  }
}

/**
 * Traverse the AST, converting fill/stroke/etc. to grayscale.
 */
function traverseAndGrayscale(node, config) {
  if (node.attributes) {
    // fill
    if (node.attributes.fill && node.attributes.fill !== 'none') {
      const fillVal = node.attributes.fill;
      // if fill is a paint server ref like url(#id), skip direct color parse
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
    if (
      node.name === 'stop' &&
      node.attributes['stop-color'] &&
      node.attributes['stop-color'] !== 'none'
    ) {
      node.attributes['stop-color'] = toGray(node.attributes['stop-color'], config);
    }
  }

  // Recurse
  if (node.children) {
    node.children.forEach((child) => traverseAndGrayscale(child, config));
  }
}

/**
 * Convert a single color to grayscale, using either:
 *   - HSL-based approach (tinycolor)
 *   - Luminance-based approach
 */
function toGray(originalColor, config) {
  const { desaturationAmount, grayscaleMethod, colorCache } = config;
  // Check cache
  const cacheKey = `${originalColor}:${desaturationAmount}:${grayscaleMethod}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }

  const c = tinycolor(originalColor);
  if (!c.isValid()) {
    // Return as-is if invalid
    return originalColor;
  }

  let finalHex;

  if (grayscaleMethod === 'luminance') {
    // Luminance-based grayscale => 0.299*R + 0.587*G + 0.114*B
    const { r, g, b } = c.toRgb();
    const Y = 0.299 * r + 0.587 * g + 0.114 * b; // in [0..255]
    const gray = Math.round(Y).toString(16).padStart(2, '0');
    finalHex = `#${gray}${gray}${gray}`;
  } else {
    // Default to 'hsl' approach
    if (desaturationAmount === 100) {
      // Full HSL greyscale
      finalHex = c.greyscale().toHexString();
    } else {
      // Partial desaturation
      finalHex = c.desaturate(desaturationAmount).toHexString();
    }
  }

  colorCache.set(cacheKey, finalHex);
  return finalHex;
}
