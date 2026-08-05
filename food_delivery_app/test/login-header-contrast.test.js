const fs = require('fs');
const path = require('path');
const assert = require('assert');

const loginHtmlPath = path.join(__dirname, '..', 'web', 'login.html');
const html = fs.readFileSync(loginHtmlPath, 'utf8');

assert(
  html.includes('text-primary tracking-tight'),
  'Expected login title to use text-primary for reliable contrast.'
);

assert(
  html.includes('text-on-surface/70 text-sm mt-1 font-body'),
  'Expected login subtitle to use text-on-surface/70 for reliable contrast.'
);

console.log('Login header contrast assertions passed.');
