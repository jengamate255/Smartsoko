const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080';
const OUT_DIR = path.join(__dirname, 'ui-shots');
const ROUTES = [
  'login', 'home', 'customer', 'merchant', 'driver', 'admin',
  'discovery', 'profile', 'cart', 'orders', 'product',
  'restaurant', 'chat', 'track-order', 'checkout', '404', 'wallet',
  'store', 'signup', 'main', 'seller', 'index', 'onboarding', 'check-user',
  'fleet-manager', 'admin-panel', 'supabase', 'seed-merchant',
  'smartsoko-home', 'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout',
  'wishlists', 'store-settings', 'social', 'social-profile', 'messages',
  'customers', 'create-store', 'discovery-feed', 'index_marketplace',
  'stores', 'setup'
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const results = [];
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message.slice(0, 200)));
    const url = `${BASE}/${route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2500));
      const file = path.join(OUT_DIR, `${route.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300).replace(/\s+/g, ' ') : '');
      results.push({ route, status: 'ok', title, bodyText: bodyText.slice(0, 150), errors: consoleErrors.slice(0, 3) });
    } catch (e) {
      results.push({ route, status: 'ERROR', error: e.message.slice(0, 150) });
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'scan-results.json'), JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status === 'ok');
  const err = results.filter(r => r.status !== 'ok');
  console.log(`\n=== SCAN COMPLETE: ${ok.length} OK, ${err.length} FAILED ===`);
  for (const r of err) console.log(`FAILED: ${r.route} -> ${r.error}`);
  console.log('\n=== PAGE TITLES + ERRORS ===');
  for (const r of ok) {
    console.log(`${r.route.padEnd(22)} | ${(r.title || '(no title)').padEnd(40)} | errors:${r.errors.length}`);
    for (const e of r.errors) console.log(`    ! ${e}`);
  }
})();
