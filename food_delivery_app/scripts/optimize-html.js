/**
 * HTML Optimization Script for SmartSoko
 * Applies performance optimizations to all HTML files
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'web');

// Performance optimizations to apply
const optimizations = [
  // Add preconnect hints after <head>
  {
    name: 'Add preconnect hints',
    pattern: /<head>\s*\n\s*<meta charset/i,
    replacement: `<head>
  <!-- Performance: Preconnect to external domains -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com">
  <link rel="dns-prefetch" href="https://www.gstatic.com">
  <meta charset`
  },
  // Preload critical CSS
  {
    name: 'Preload critical CSS',
    pattern: /<link rel="stylesheet" href="dist\/tailwind\.css">/,
    replacement: `<link rel="preload" href="dist/tailwind.css" as="style">
  <link rel="stylesheet" href="dist/tailwind.css">`
  },
  // Defer Google Fonts
  {
    name: 'Async load Google Fonts',
    pattern: /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Plus\+Jakarta\+Sans[^"]*" rel="stylesheet"\/>/,
    replacement: (match) => match.replace('rel="stylesheet"', 'rel="stylesheet" media="print" onload="this.media=\'all\'"')
  },
  // Defer Material Symbols
  {
    name: 'Async load Material Symbols',
    pattern: /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^"]*" rel="stylesheet"\/>/,
    replacement: (match) => match.replace('rel="stylesheet"', 'rel="stylesheet" media="print" onload="this.media=\'all\'"')
  },
  // Defer scripts
  {
    name: 'Defer nav-component.js',
    pattern: /<script src="nav-component\.js"><\/script>/,
    replacement: '<script src="nav-component.js" defer></script>'
  },
  // Add lazy loading to images without it
  {
    name: 'Add lazy loading to images',
    pattern: /<img((?!.*?loading=)[^>]*)>/gi,
    replacement: '<img$1 loading="lazy">'
  },
  // Minify inline styles (simple whitespace removal)
  {
    name: 'Minify inline CSS',
    pattern: /<style>[\s\S]*?<\/style>/g,
    replacement: (match) => {
      // Don't minify if already minified (no newlines)
      if (!match.includes('\n')) return match;
      return match
        .replace(/\s+/g, ' ')
        .replace(/;\s*}/g, '}')
        .replace(/\{\s+/g, '{')
        .replace(/;\s+/g, ';')
        .replace(/,\s+/g, ',')
        .replace(/>\s+</g, '><')
        .trim();
    }
  }
];

function optimizeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let optimized = content;
  let applied = [];

  optimizations.forEach(opt => {
    if (opt.pattern.test(optimized)) {
      optimized = optimized.replace(opt.pattern, opt.replacement);
      applied.push(opt.name);
    }
  });

  if (applied.length > 0) {
    fs.writeFileSync(filePath, optimized, 'utf8');
    console.log(`✅ ${path.basename(filePath)}: ${applied.join(', ')}`);
    return true;
  }
  return false;
}

function main() {
  const files = fs.readdirSync(webDir)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(webDir, f));

  console.log('🚀 Optimizing HTML files for performance...\n');

  let optimized = 0;
  files.forEach(file => {
    if (optimizeFile(file)) optimized++;
  });

  console.log(`\n✨ Optimized ${optimized} files`);
}

main();
