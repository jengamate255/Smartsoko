const tailwindcss = require('tailwindcss');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const fs = require('fs');
const path = require('path');

const inputFile = './web/tailwind.css';
const outputFile = './web/dist/tailwind.css';

// Ensure dist directory exists
const distDir = path.dirname(outputFile);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const css = fs.readFileSync(inputFile, 'utf8');

postcss([tailwindcss, autoprefixer])
  .process(css, { from: inputFile, to: outputFile })
  .then(result => {
    fs.writeFileSync(outputFile, result.css);
    console.log('✅ CSS built successfully: ' + outputFile);
  })
  .catch(err => {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  });
