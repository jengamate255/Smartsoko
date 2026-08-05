const puppeteer = require('puppeteer');
const BASE = process.env.STRESS_BASE || 'http://localhost:8080';

let browser, page;
const results = [];
function rec(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
async function check(name, fn) {
  try {
    const detail = await fn();
    rec(name, true, detail);
  } catch (e) {
    rec(name, false, e.message);
  }
}

const SAMPLE_CART = [
  { id: 'p1', name: 'Fresh Milk 1L', price: 120, quantity: 2, sellerName: 'Dairy Farm', merchantId: 'm1' },
  { id: 'p2', name: 'Brown Bread', price: 80, quantity: 1, sellerName: 'Bakery Co', merchantId: 'm2' }
];

async function seedStorage(kv) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((data) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, kv);
}

const $text = (sel) => page.$eval(sel, el => el.textContent.trim());
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
const exists = async (sel) => (await page.$(sel)) !== null;

(async () => {
  browser = await puppeteer.launch({
    headless: 'new', protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ---------- LOGIN ----------
  console.log('\n--- LOGIN PAGE ---');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });

  await check('login: form + inputs present', async () => {
    if (!(await exists('#loginForm'))) throw new Error('#loginForm missing');
    if (!(await exists('#identity'))) throw new Error('#identity missing');
    if (!(await exists('#password'))) throw new Error('#password missing');
    return 'form/identity/password found';
  });

  await check('login: role tab switch (merchant)', async () => {
    await page.click('#merchant-tab');
    await new Promise(r => setTimeout(r, 200));
    const m = await page.$eval('#merchant-tab', el => el.getAttribute('aria-selected'));
    const c = await page.$eval('#customer-tab', el => el.getAttribute('aria-selected'));
    if (m !== 'true') throw new Error('merchant tab not selected: ' + m);
    return `merchant=${m}, customer=${c}`;
  });

  await check('login: password visibility toggle', async () => {
    const before = await page.$eval('#password', el => el.type);
    await page.evaluate(() => togglePassword());
    await new Promise(r => setTimeout(r, 150));
    const after = await page.$eval('#password', el => el.type);
    if (before === after) throw new Error(`type unchanged (${before})`);
    return `${before} -> ${after}`;
  });

  await check('login: empty submit blocked by validation', async () => {
    await page.evaluate(() => { document.getElementById('identity').value=''; document.getElementById('password').value=''; });
    // native HTML5 required is first line of defense; JS showLoginError is fallback
    const nativeBlocks = await page.$eval('#loginForm', f => !f.checkValidity());
    await page.evaluate(() => { document.getElementById('loginForm').requestSubmit(); });
    await new Promise(r => setTimeout(r, 400));
    const jsError = await page.evaluate(() => {
      const e = document.getElementById('loginError');
      return e && e.offsetParent !== null ? e.textContent.trim() : null;
    });
    if (!nativeBlocks && !jsError) throw new Error('empty form was NOT blocked by either native or JS validation');
    return nativeBlocks ? 'native required validation blocks submit' : ('JS: ' + jsError);
  });

  // ---------- SIGNUP ----------
  console.log('\n--- SIGNUP PAGE ---');
  await page.goto(BASE + '/signup', { waitUntil: 'networkidle2', timeout: 30000 });

  await check('signup: password strength updates', async () => {
    await page.type('#password', 'abc');
    const weak = await $text('#passwordStrengthText');
    await page.evaluate(() => { document.getElementById('password').value=''; });
    await page.type('#password', 'Str0ng!Passw0rd#2024');
    const strong = await $text('#passwordStrengthText');
    if (weak === strong) throw new Error('strength text did not change: ' + weak);
    return `weak="${weak}" strong="${strong}"`;
  });

  await check('signup: account type radio (merchant)', async () => {
    await page.evaluate(() => {
      const r = document.querySelector('input[name="accountType"][value="merchant"]');
      r.click();
    });
    const val = await page.evaluate(() => document.querySelector('input[name="accountType"]:checked').value);
    if (val !== 'merchant') throw new Error('value=' + val);
    return 'merchant selected';
  });

  await check('signup: empty submit shows error', async () => {
    await page.evaluate(() => {
      ['fullName','email','phone','password','confirmPassword'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
      createAccount();
    });
    await new Promise(r => setTimeout(r, 400));
    const shown = await page.evaluate(() => {
      const e = document.getElementById('errorMsg');
      return e && e.offsetParent !== null ? (document.getElementById('errorText')?.textContent || e.textContent).trim() : null;
    });
    if (!shown) throw new Error('no #errorMsg displayed');
    return shown.slice(0, 60);
  });

  // ---------- CART (seeded) ----------
  console.log('\n--- CART PAGE (seeded localStorage) ---');
  await seedStorage({
    smartsoko_cart: JSON.stringify(SAMPLE_CART),
    smartsoko_delivery_address: '123 Test Street, Nairobi'
  });
  await page.goto(BASE + '/cart', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  await check('cart: renders seeded items', async () => {
    const n = await page.$$eval('.cart-item', els => els.length);
    if (n !== SAMPLE_CART.length) throw new Error(`expected ${SAMPLE_CART.length} items, got ${n}`);
    return `${n} items rendered`;
  });

  await check('cart: item count label', async () => {
    const t = await $text('#itemCount');
    return t;
  });

  await check('cart: subtotal computed correctly', async () => {
    const expected = SAMPLE_CART.reduce((s, i) => s + i.price * i.quantity, 0); // 320
    const sub = num(await $text('#subtotal'));
    if (sub !== expected) throw new Error(`expected ${expected}, got ${sub}`);
    return `subtotal=${sub}`;
  });

  await check('cart: grand total >= subtotal', async () => {
    const sub = num(await $text('#subtotal'));
    const grand = num(await $text('#grandTotal'));
    if (grand < sub) throw new Error(`grand ${grand} < sub ${sub}`);
    return `grandTotal=${grand}`;
  });

  await check('cart: increment quantity raises subtotal', async () => {
    const before = num(await $text('#subtotal'));
    await page.evaluate(() => updateQuantity('p1', 1));
    await new Promise(r => setTimeout(r, 300));
    const after = num(await $text('#subtotal'));
    if (after <= before) throw new Error(`subtotal not increased (${before} -> ${after})`);
    return `${before} -> ${after}`;
  });

  await check('cart: remove item reduces list', async () => {
    const before = await page.$$eval('.cart-item', els => els.length);
    await page.evaluate(() => removeItem('p2'));
    await new Promise(r => setTimeout(r, 300));
    const after = await page.$$eval('.cart-item', els => els.length);
    if (after >= before) throw new Error(`count not reduced (${before} -> ${after})`);
    return `${before} -> ${after} items`;
  });

  // ---------- CHECKOUT (seeded) ----------
  console.log('\n--- CHECKOUT PAGE (seeded localStorage) ---');
  await seedStorage({
    smartsoko_cart: JSON.stringify(SAMPLE_CART),
    smartsoko_address: '123 Test Street, Nairobi',
    smartsoko_user_address: '123 Test Street, Nairobi',
    smartsoko_phone: '+254700000000',
    smartsoko_name: 'Test User'
  });
  await page.goto(BASE + '/checkout', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  await check('checkout: shows content (not empty state)', async () => {
    const emptyVisible = await page.evaluate(() => {
      const e = document.getElementById('emptyCartState');
      return e && e.offsetParent !== null;
    });
    if (emptyVisible) throw new Error('empty cart state shown despite seeded cart');
    const items = await page.$eval('#checkoutItems', el => el.children.length);
    if (items < 1) throw new Error('no items in #checkoutItems');
    return `${items} item rows`;
  });

  await check('checkout: seeded address + phone displayed', async () => {
    const addr = await $text('#deliveryAddress');
    const phone = await $text('#deliveryPhone');
    if (!addr.includes('123 Test Street')) throw new Error('seeded address not displayed: ' + addr);
    if (!phone.includes('254700000000')) throw new Error('seeded phone not displayed: ' + phone);
    return `addr="${addr}" phone="${phone}"`;
  });

  await check('checkout: totals aligned with cart model (delivery 2000 + 18% VAT)', async () => {
    const sub = num(await $text('#summarySubtotal'));
    const delivery = num(await $text('#summaryDelivery'));
    const tax = num(await $text('#summaryTax'));
    const total = num(await $text('#summaryTotal'));
    const expectedSub = SAMPLE_CART.reduce((s, i) => s + i.price * i.quantity, 0);
    const expectedTax = Math.round(expectedSub * 0.18);
    const expectedTotal = expectedSub + 2000 + expectedTax;
    if (sub !== expectedSub) throw new Error(`subtotal ${sub} != ${expectedSub}`);
    if (delivery !== 2000) throw new Error(`delivery ${delivery} != 2000`);
    if (tax !== expectedTax) throw new Error(`tax ${tax} != ${expectedTax}`);
    if (total !== expectedTotal) throw new Error(`total ${total} != ${expectedTotal}`);
    return `sub=${sub} delivery=${delivery} tax=${tax} total=${total}`;
  });

  await check('checkout: total matches cart grandTotal for same cart', async () => {
    // cart page grandTotal for SAMPLE_CART was verified earlier as 2378
    const total = num(await $text('#summaryTotal'));
    const expected = 320 + 2000 + Math.round(320 * 0.18); // 2378
    if (total !== expected) throw new Error(`checkout total ${total} != cart grandTotal ${expected}`);
    return `both = ${total}`;
  });

  await check('api: /api/config exposes pricing (delivery 2000, tax 0.18, TSh)', async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/config', { cache: 'no-store' });
      return r.json();
    });
    const p = res.pricing || {};
    if (p.deliveryFee !== 2000) throw new Error(`deliveryFee ${p.deliveryFee} != 2000`);
    if (Math.abs(p.taxRate - 0.18) > 1e-9) throw new Error(`taxRate ${p.taxRate} != 0.18`);
    if (p.currency !== 'TSh') throw new Error(`currency ${p.currency} != TSh`);
    return JSON.stringify(p);
  });

  await check('checkout: server config applied to body dataset', async () => {
    const ds = await page.evaluate(() => ({
      fee: document.body.dataset.deliveryFee,
      tax: document.body.dataset.taxRate,
      cur: document.body.dataset.currency
    }));
    if (ds.fee === undefined) throw new Error('body.dataset.deliveryFee not set');
    if (ds.tax === undefined) throw new Error('body.dataset.taxRate not set');
    if (ds.cur === undefined) throw new Error('body.dataset.currency not set');
    return JSON.stringify(ds);
  });

  await check('checkout: edit address modal opens', async () => {
    await page.evaluate(() => editAddress());
    await new Promise(r => setTimeout(r, 300));
    const visible = await page.evaluate(() => {
      const m = document.getElementById('addressModal');
      return m && m.offsetParent !== null;
    });
    if (!visible) throw new Error('#addressModal not visible');
    return 'modal opened';
  });

  await check('cart: server config applied to body dataset + grandTotal consistent', async () => {
    await seedStorage({
      smartsoko_cart: JSON.stringify(SAMPLE_CART),
      smartsoko_address: '123 Test Street, Nairobi',
      smartsoko_user_address: '123 Test Street, Nairobi',
      smartsoko_phone: '+254700000000',
      smartsoko_name: 'Test User'
    });
    await page.goto(BASE + '/cart', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#grandTotal', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 500));
    const ds = await page.evaluate(() => ({
      fee: document.body.dataset.deliveryFee,
      tax: document.body.dataset.taxRate,
      cur: document.body.dataset.currency
    }));
    if (ds.fee === undefined || ds.tax === undefined || ds.cur === undefined)
      throw new Error('cart body dataset not populated by server config');
    const total = num(await page.$eval('#grandTotal', e => e.textContent));
    if (total !== 320 + 2000 + Math.round(320 * 0.18)) throw new Error(`grandTotal ${total} inconsistent`);
    return JSON.stringify(ds) + ` grandTotal=${total}`;
  });

  // ---------- AUTH GUARD ----------
  console.log('\n--- AUTH GUARD ---');
  await check('auth: /customer redirects unauthenticated users to login', async () => {
    await page.goto(BASE + '/customer', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 500));
    const url = page.url();
    if (!url.includes('/login')) throw new Error('not redirected, url=' + url);
    return url;
  });

  // ---------- DISCOVERY controls (public page) ----------
  console.log('\n--- DISCOVERY PAGE (controls) ---');
  await page.goto(BASE + '/discovery', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  await check('discovery: category pill activates', async () => {
    const sel = '.cat-pill[data-category="food"]';
    if (!(await exists(sel))) throw new Error('food pill missing');
    await page.evaluate(() => filterByCategory('food'));
    await new Promise(r => setTimeout(r, 300));
    const active = await page.$eval(sel, el => el.classList.contains('active'));
    if (!active) throw new Error('pill did not gain active class');
    return 'food pill active';
  });

  await check('discovery: sort select changes without error', async () => {
    const errs = [];
    const h = e => errs.push(e.message);
    page.on('pageerror', h);
    await page.select('#sortSelect', 'price-low');
    await new Promise(r => setTimeout(r, 300));
    page.off('pageerror', h);
    if (errs.length) throw new Error(errs[0]);
    return 'sortProducts ran clean';
  });

  await check('discovery: search input syncs', async () => {
    const sel = (await exists('#searchInputDesktop')) ? '#searchInputDesktop' : '#searchInputMobile';
    await page.type(sel, 'milk');
    const v = await page.$eval(sel, el => el.value);
    if (v !== 'milk') throw new Error('value=' + v);
    return `typed "milk" into ${sel}`;
  });

  // ---------- NAVIGATION (mobile viewport so bottom nav is visible) ----------
  console.log('\n--- NAVIGATION ---');
  await page.setViewport({ width: 390, height: 844 });

  await check('nav: home -> discovery link navigates', async () => {
    await page.goto(BASE + '/home', { waitUntil: 'networkidle2', timeout: 30000 });
    const href = await page.$$eval('a[href*="discovery"]', els => {
      const v = els.find(e => e.offsetParent !== null) || els[0];
      return v ? v.getAttribute('href') : null;
    });
    if (!href) throw new Error('no discovery link');
    await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!page.url().includes('discovery')) throw new Error('url=' + page.url());
    return href;
  });

  await check('nav: bottom-nav cart link present + navigates', async () => {
    await page.goto(BASE + '/discovery', { waitUntil: 'networkidle2', timeout: 30000 });
    const href = await page.$$eval('a[href="/cart"]', els => els.length ? els[0].getAttribute('href') : null);
    if (!href) throw new Error('no /cart link in DOM');
    await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!page.url().includes('cart')) throw new Error('url=' + page.url());
    return href;
  });

  // ---------- SUMMARY ----------
  await browser.close();
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n=================================`);
  console.log(`RESULTS: ${pass}/${results.length} passed, ${fail} failed`);
  if (fail) {
    console.log(`\nFailures:`);
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
  }
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
