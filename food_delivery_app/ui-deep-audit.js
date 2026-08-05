const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const auditFn = require('./ui-audit-fn.js');

const BASE = 'http://localhost:8080';
const OUT_DIR = path.join(__dirname, 'ui-shots');
const ROUTES = [
  'login', 'home', 'customer', 'merchant', 'driver', 'admin',
  'discovery', 'profile', 'cart', 'orders', 'product',
  'restaurant', 'chat', 'track-order', 'checkout', '404', 'wallet',
  'store', 'signup', 'main', 'seller', 'index', 'onboarding', 'check-user',
  'fleet-manager', 'admin-panel', 'supabase', 'seed-merchant',
  'smartsoko-home', 'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout'
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const report = {};
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 180)); });
    try {
      await page.goto(`${BASE}/${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      const audit = await page.evaluate('(' + auditFn.runAudit.toString() + ')()');
      report[route] = { ...audit.stats, consoleErrors: consoleErrors.slice(0, 4), issues: audit.issues.slice(0, 40) };
    } catch (e) {
      report[route] = { error: e.message.slice(0, 120) };
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'deep-audit.json'), JSON.stringify(report, null, 2));
  console.log('=== DEEP AUDIT SUMMARY ===');
  for (const [route, r] of Object.entries(report)) {
    if (r.error) { console.log(route.padEnd(20) + ' ERROR: ' + r.error); continue; }
    const flags = [];
    if (r.docScrollWidth) flags.push('OVERFLOW+' + r.docScrollWidth);
    if (r.unnamedControls) flags.push('unnamed:' + r.unnamedControls);
    if (r.smallTargets) flags.push('targets:' + r.smallTargets);
    if (r.lowContrast) flags.push('contrast:' + r.lowContrast);
    if (r.brokenImages) flags.push('brokenImg:' + r.brokenImages);
    if (r.inlineStyles > 100) flags.push('inline:' + r.inlineStyles);
    if (r.emptyCards) flags.push('empty:' + r.emptyCards);
    if (r.headings && r.headings.length) flags.push('heads:' + r.headings.join('-'));
    if (r.placeholderOnlyInputs) flags.push('plchldrOnly:' + r.placeholderOnlyInputs);
    if (r.consoleErrors && r.consoleErrors.length) flags.push('CONSOLE: ' + r.consoleErrors[0].slice(0, 55));
    console.log(route.padEnd(20) + (flags.length ? flags.join(' | ') : 'ok') + ' | nav:' + r.hasNav + ' foot:' + r.hasFooter);
  }
})();
