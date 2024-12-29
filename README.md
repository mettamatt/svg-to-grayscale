# SVG to Grayscale SVG

Convert any SVG into **HSL-based** or **luminance-based** grayscale SVGs — in **JavaScript**. This project leverages:

- [**svgson**](https://github.com/elrumordelaluz/svgson) for parsing the raw SVG into a manipulable AST  
- [**tinycolor**](https://github.com/bgrins/TinyColor) for color parsing and transformations

It includes:

1. A **library** (`grayscale-svg.js`) that works in **Node** (using local dependencies) or in the **browser** (via CDN imports).
2. An **example page** (`index.html`) hosted on GitHub Pages, letting users upload an SVG to produce two grayscale variants.
3. A **Node-based test suite** that processes a folder of edge-case SVGs (`test/svgs`) and produces HSL & luminance outputs in `test/output`.

## Features

- **Two Grayscale Approaches**  
  - **HSL**: Uses TinyColor’s `.greyscale()` (an HSL desaturation). Red/yellow may converge if their HSL lightness is similar.  
  - **Luminance**: Uses \(\text{Y} = 0.299R + 0.587G + 0.114B\). Distinguishes brightness differences (e.g. red vs. yellow).

- **Partial Desaturation** (HSL only):
  - `desaturationAmount = 0` → keep color, up to `100` → full grayscale.  
  - Luminance ignores partial amounts, always full grayscale.

- **Gradient Preservation**  
  - If `fill="url(#myGradient)"`, the shape references remain.  
  - `<stop stop-color="...">` stops are individually converted, yielding a grayscale gradient.

- **Inline Style Expansion**  
  - `style="fill: #f00; stroke: #000"` becomes direct attributes, then converted to grayscale.

## Repository Structure

```
svg-to-grayscale/
├─ README.md               # This file
├─ grayscale-svg.js        # Main library, environment detection inside
├─ index.html              # A sample page for GitHub Pages (upload & compare)
├─ package.json            # (Optional) for Node scripts / dev
└─ test/
   ├─ run-tests.js         # Node-based script that processes each .svg in /svgs
   ├─ generate-compare-html.js  # Generate an HTML side-by-side compare
   ├─ svgs/                # Edge-case input SVGs
   └─ output/              # Outputs of the grayscale conversions
```

## Quick Start

### 1) In the **Browser**

- Visit: <https://mettamatt.github.io/svg-to-grayscale/>  
- Upload an SVG.  
- You’ll see **Original**, **HSL** grayscale, and **Luminance** grayscale versions side by side.  
- Download either or both.

### 2) In **Node** (Local Scripts or Testing)

Install:
```bash
npm install svgson tinycolor2
```

Then:

```js
import { convertSvgToGrayscale } from './grayscale-svg.js';

(async () => {
  const originalSvg = '<svg> ... </svg>';
  // HSL approach
  const hslResult = await convertSvgToGrayscale(originalSvg, {
    grayscaleMethod: 'hsl',
    desaturationAmount: 100 // or partial
  });
  // Luminance approach
  const lumResult = await convertSvgToGrayscale(originalSvg, {
    grayscaleMethod: 'luminance'
  });

  console.log('HSL output:', hslResult);
  console.log('Luminance output:', lumResult);
})();
```

### 3) Testing & Examples

The results of the tests are here: https://mettamatt.github.io/svg-to-grayscale/test/compare.html

- **Run Tests**  
  ```bash
  cd test
  node run-tests.js
  ```
  - Reads each `.svg` in `test/svgs`
  - Outputs `grayscale-hsl-<filename>` & `grayscale-lum-<filename>` into `test/output`
  - Logs file sizes, success/errors

- **Compare**  
  ```bash
  node generate-compare-html.js
  ```
  Produces `test/compare.html` to view original & grayscale outputs side by side in a browser.

### 4 Hue, Saturation, Lightness (HSL) vs Luminance

Here’s a comparison table for the two grayscale methods:

| **Aspect**         | **HSL Grayscale**                          | **Luminance Grayscale**                          |
|---------------------|--------------------------------------------|-------------------------------------------------|
| **Conversion**     | Set Saturation = 0%, keep Lightness same.  | Weighted sum of RGB values (Y = 0.299R + 0.587G + 0.114B). |
| **Brightness**     | Based on **HSL lightness**.                | Based on **perceived brightness** (human vision). |
| **Perceived Differences** | Colors with the same lightness look similar (e.g., red and yellow). | Colors with different brightness are distinct. |
| **Red (#ff0000)**  | Medium gray (e.g., **#808080**).           | Dark gray (e.g., **#4c4c4c**).                  |
| **Yellow (#ffff00)** | Medium gray (e.g., **#808080**).         | Light gray (e.g., **#e2e2e2**).                 |
| **Use Case**       | Easier for designers, aligns with HSL editing. | Better for visual accuracy, perceptual graphics. |


### Known Limitations

- **No `<style>` Tag Parsing**: Inline or external CSS rules aren’t parsed.  
- **DTD Entities** (`&myEntity;`) or advanced references aren’t expanded.  
