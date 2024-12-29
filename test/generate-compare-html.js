// test/generate-compare-html.js
import fs from 'fs';
import path from 'path';
import url from 'url';

// ESM-friendly __dirname
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const svgsDir = path.join(__dirname, 'svgs');
const outputDir = path.join(__dirname, 'output');

// We'll output an HTML file in `test/`
const compareHtmlPath = path.join(__dirname, 'compare.html');

// 1) Gather original .svg filenames
const originalFiles = fs.readdirSync(svgsDir).filter((f) => f.endsWith('.svg'));

// 2) Build the HTML content
let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SVG Comparison: Original vs. HSL vs. Luminance</title>
  <style>
    body {
      font-family: sans-serif;
      margin: 2rem auto;
      max-width: 1200px;
      background: #f5f5f5;
    }
    h1 {
      text-align: center;
    }
    .item {
      margin-bottom: 2rem;
    }
    .compare-box {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    figure {
      margin: 0;
      text-align: center;
      border: 1px solid #ccc;
      background: #fff;
      padding: 1rem;
      flex: 1 1 33%;
    }
    figure img {
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      margin-bottom: 0.5rem;
    }
    figcaption {
      font-style: italic;
      font-size: 0.9rem;
      color: #666;
    }
    h2 {
      font-size: 1.1rem;
      margin-bottom: 0.2rem;
    }
    .no-file {
      color: red;
    }
  </style>
</head>
<body>
  <h1>SVG Comparison: Original vs. HSL vs. Luminance</h1>
  <p>
    This page shows each original SVG (from <code>svgs</code>) alongside its 
    HSL-based and Luminance-based grayscale outputs (from <code>output</code>).
  </p>
`;

// 3) For each original file, find the corresponding HSL and Luminance files
originalFiles.forEach((file) => {
  // e.g. "grayscale-hsl-FILENAME.svg" and "grayscale-lum-FILENAME.svg"
  const hslName = `grayscale-hsl-${file}`;
  const lumName = `grayscale-lum-${file}`;

  const hslPath = path.join(outputDir, hslName);
  const lumPath = path.join(outputDir, lumName);

  const hasHsl = fs.existsSync(hslPath);
  const hasLum = fs.existsSync(lumPath);

  html += `
    <div class="item">
      <h2>${file}</h2>
      <div class="compare-box">
        <!-- Original -->
        <figure>
          <img src="./svgs/${file}" alt="Original: ${file}" />
          <figcaption>Original: ${file}</figcaption>
        </figure>

        <!-- HSL Grayscale -->
        <figure>
          ${
            hasHsl
              ? `<img src="./output/${hslName}" alt="HSL: ${file}" />
                 <figcaption>HSL Grayscale: ${hslName}</figcaption>`
              : `<p class="no-file">No HSL file found for ${file}</p>`
          }
        </figure>

        <!-- Luminance Grayscale -->
        <figure>
          ${
            hasLum
              ? `<img src="./output/${lumName}" alt="Lum: ${file}" />
                 <figcaption>Luminance Grayscale: ${lumName}</figcaption>`
              : `<p class="no-file">No Luminance file found for ${file}</p>`
          }
        </figure>
      </div>
    </div>
  `;
});

html += `
</body>
</html>
`;

// 4) Write the final HTML
fs.writeFileSync(compareHtmlPath, html, 'utf8');

console.log(`compare.html generated at: ${compareHtmlPath}`);
console.log(`Open "test/compare.html" in a browser (via "http-server" or similar).`);
