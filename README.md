# SVG to Grayscale

Convert any SVG to a grayscale SVG with two different methods—**HSL-based** or **luminance-based**—all in **JavaScript**. This project includes:

1. A **library** (`grayscale-svg.js`) that works in **Node** (local dependencies) or **the browser** (CDN imports).
2. An **example page** (`index.html`) hosted on GitHub Pages, letting users upload an SVG to generate grayscale derivatives.
3. A **Node-based test suite** that processes a folder of very difficult SVGs (`test/svgs`) and produces grayscale outputs in `test/output`.  

## Features

- **Two Grayscale Approaches**  
  - **HSL**: Uses [TinyColor](https://github.com/bgrins/TinyColor)'s `.greyscale()` (desaturation in HSL). Red and yellow become similar grays if their HSL lightness is close, for example.  
  - **Luminance**: Uses the formula \(\text{Y} = 0.299R + 0.587G + 0.114B\). Red and yellow remain different grays based on actual brightness.

- **Partial Desaturation** (for HSL only):  
  - `desaturationAmount = 0` → keep color, `50` → half, `100` → full grayscale, etc.  
  - *Luminance method* ignores partial amounts (always full grayscale).

- **Gradient Preservation**:  
  - Paint servers like `fill="url(#myGradient)"` are **kept**.  
  - Gradient stops (`<stop stop-color="..."/>`) are individually converted to grayscale, so you get a grayscale gradient.

- **Inline Style Expansion**:  
  - The code converts `style="fill: #f00; stroke: #000"` into direct attributes (`fill="#f00"`, `stroke="#000"`), then grayscales them if needed.  

## Repository Structure

```bash
svg-to-grayscale/
├─ README.md               # This file
├─ grayscale-svg.js        # The main library, environment detection inside
├─ index.html              # A sample page for GitHub Pages (upload & compare)
├─ package.json            # (Optional) for Node scripts / dev
└─ test/
   ├─ run-tests.js         # Node-based script that processes each .svg in /svgs
   ├─ generate-compare-html.js  # Optionally generate an HTML side-by-side
   ├─ svgs/                # Edge-case input SVGs
   └─ output/              # Outputs from the grayscale conversions
```

## Quick Start

### 1) Use in a **Browser** 

https://mettamatt.github.io/svg-to-grayscale/

### 2) Use in **Node** (Local Testing or Scripts)

Install:
```bash
npm install svgson tinycolor2
```
Then in your code:
```js
import { convertSvgToGrayscale } from './grayscale-svg.js';

(async () => {
  const originalSvg = '<svg> ... </svg>'; // a string
  const hslResult = await convertSvgToGrayscale(originalSvg, {
    grayscaleMethod: 'hsl', 
    desaturationAmount: 100
  });
  const lumResult = await convertSvgToGrayscale(originalSvg, {
    grayscaleMethod: 'luminance'
  });
  console.log('HSL output:', hslResult);
  console.log('Luminance output:', lumResult);
})();
```

### 3) Testing & Examples

- **Run Tests**:  
  ```bash
  cd test
  node run-tests.js
  ```
  This will:
  - Read each `.svg` in `test/svgs/`
  - Produce `grayscale-hsl-<filename>` and `grayscale-lum-<filename>` in `test/output/`
  - Log file sizes, successes, or errors.

- **Compare**:  
  If you have `generate-compare-html.js`, you can run:
  ```bash
  node generate-compare-html.js
  ```
  It produces `test/compare.html`, which shows original and grayscale results side by side.

### Known Limitations

- **No <style> Tag Support**: If your SVG has `<style>...</style>` blocks or external CSS references, these are **not** parsed. The library will warn and skip them.  
- **DTD Entities** (like `&myEntity;`) or advanced references are not expanded.  
