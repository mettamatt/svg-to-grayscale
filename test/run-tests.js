// test/run-tests.js
import fs from 'fs';
import path from 'path';
import url from 'url';
import { convertSvgToGrayscale } from '../grayscale-svg.js';

// __dirname for ESM
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgInputDir = path.join(__dirname, 'svgs');
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function runTests() {
  try {
    const files = fs.readdirSync(svgInputDir).filter(f => f.endsWith('.svg'));
    if (files.length === 0) {
      console.warn('No SVG files found in', svgInputDir);
      return;
    }

    // For each file, we'll do two runs: HSL + luminance
    for (const file of files) {
      const inputPath = path.join(svgInputDir, file);
      const svgContent = fs.readFileSync(inputPath, 'utf8');

      console.log(`\n=== Processing: ${file} ===`);
      const oldSizeKB = (svgContent.length / 1024).toFixed(2);

      try {
        // 1) HSL grayscale (full desaturation)
        const hslResult = await convertSvgToGrayscale(svgContent, {
          desaturationAmount: 100,  // or partial if you want
          grayscaleMethod: 'hsl',
        });
        const hslPath = path.join(outputDir, `grayscale-hsl-${file}`);
        fs.writeFileSync(hslPath, hslResult, 'utf8');
        const hslSizeKB = (hslResult.length / 1024).toFixed(2);

        console.log(`HSL grayscale: ${file} → grayscale-hsl-${file}`);
        console.log(`    original size: ${oldSizeKB} KB, HSL out: ${hslSizeKB} KB`);

        // 2) Luminance-based grayscale
        const lumResult = await convertSvgToGrayscale(svgContent, {
          grayscaleMethod: 'luminance',
        });
        const lumPath = path.join(outputDir, `grayscale-lum-${file}`);
        fs.writeFileSync(lumPath, lumResult, 'utf8');
        const lumSizeKB = (lumResult.length / 1024).toFixed(2);

        console.log(`Luminance grayscale: ${file} → grayscale-lum-${file}`);
        console.log(`    original size: ${oldSizeKB} KB, Lum out: ${lumSizeKB} KB`);

      } catch (err) {
        console.error(`Error converting ${file}:`, err);
      }
    }
  } catch (err) {
    console.error('Test run error:', err);
  }
}

runTests();
