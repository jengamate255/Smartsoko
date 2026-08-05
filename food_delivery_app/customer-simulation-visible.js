const puppeteer = require('puppeteer');
const BASE = process.env.STRESS_BASE || 'http://localhost:8080';
const CHROME = 'C:\\Users\\Dave\\.cache\\puppeteer\\chrome\\win64-148.0.7778.97\\chrome-win64\\chrome.exe';
const SHOT_DIR = __dirname + '\\screenshots';
const fs = require('fs');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR);

const TIMESTAMP = Date.now();
const email = `sim.customer.${TIMESTAMP}@smartsoko.test`;
const password = 'SimPass#2024';
const fullName = 'Simba Customer';
const phone = '+255712345678';

const SELLER_ID = 'YG1BCXEFmG3tTmqCitiW';
const SELLER_NAME = 'Kunduchi Fresh Store';
const cart = [
  { id: 'V6DtVwGaDhD5onC2tQbz', name: 'Tuna Fish', price: 15000, quantity: 2, sellerId: SELLER_ID, sellerName: SELLER_NAME },
  { id: 'l2UpP6bU752LPJuw67bx', name: 'Swordfish', price: 25000, quantity: 1, sellerId: SELLER_ID, sellerName: SELLER_NAME }
];
const address = '123 Kunduchi Beach Road, Dar es Salaam';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,                 // REAL visible Chrome
    executablePath: CHROME,          // actual chrome.exe
    protocolTimeout: 180000,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  const shot = async (name) => { try { await page.screenshot({ path: `${SHOT_DIR}\\${name}.png` }); log('  [shot]', name); } catch (e) {} };

  // ---------- 1. SIGN UP (visible) ----------
  log('\n=== 1. SIGN UP (real Chrome, visible) ===');
  log('email:', email);
  await page.goto(BASE + '/signup', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#fullName', { timeout: 15000 });
  await page.type('#fullName', fullName);
  await page.type('#email', email);
  await page.type('#phone', phone);
  await page.type('#password', password);
  await page.type('#confirmPassword', password);
  await page.click('#agreeTerms');
  await page.evaluate(() => { const r = document.querySelector('input[name="accountType"][value="customer"]'); if (r) r.checked = true; });
  await shot('1-signup-form');
  await sleep(800);
  await page.click('#signupBtn');
  await sleep(4000);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await sleep(1500);
  const authInfo = await page.evaluate(async () => {
    const u = window.auth && window.auth.currentUser;
    return u ? { uid: u.uid, email: u.email } : null;
  });
  log('signed up -> uid:', authInfo && authInfo.uid);
  await shot('2-after-signup');

  // ---------- 2. CART + CHECKOUT ----------
  log('\n=== 2. CART & CHECKOUT ===');
  await page.evaluate((cart, address, name, phone) => {
    localStorage.setItem('smartsoko_cart', JSON.stringify(cart));
    localStorage.setItem('smartsoko_address', address);
    localStorage.setItem('smartsoko_user_address', address);
    localStorage.setItem('smartsoko_name', name);
    localStorage.setItem('smartsoko_user_name', name);
    localStorage.setItem('smartsoko_phone', phone);
    localStorage.setItem('smartsoko_user_phone', phone);
  }, cart, address, fullName, phone);
  await page.goto(BASE + '/checkout', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1800);
  const checkoutState = await page.evaluate(() => ({
    items: document.getElementById('checkoutItems')?.children.length,
    total: document.getElementById('summaryTotal')?.textContent,
    address: document.getElementById('deliveryAddress')?.textContent
  }));
  log('checkout:', JSON.stringify(checkoutState));
  await shot('3-checkout');

  // ---------- 3. PLACE ORDER (visible) ----------
  log('\n=== 3. PLACE ORDER ===');
  await page.evaluate(() => {
    window.__capturedOrderId = null;
    const _orig = window.completeOrder;
    window.completeOrder = function (orderId) {
      window.__capturedOrderId = orderId;
      if (_orig) return _orig(orderId);
      window.location.href = `/track-order?orderId=${encodeURIComponent(orderId)}`;
    };
  });
  await page.evaluate(() => { if (typeof placeOrder === 'function') placeOrder(); });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await sleep(2500);
  const capturedId = await page.evaluate(() => window.__capturedOrderId);
  const finalUrl = page.url();
  log('order id:', capturedId, '| final url:', finalUrl);
  await shot('4-after-order');

  // ---------- 4. VERIFY IN FIRESTORE ----------
  log('\n=== 4. VERIFY ORDER ===');
  const admin = require('firebase-admin');
  const sa = JSON.parse(fs.readFileSync(__dirname + '/serviceAccountKey.json', 'utf8'));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();
  if (capturedId) {
    const doc = await db.collection('orders').doc(capturedId).get();
    const o = doc.data();
    log('VERIFIED:', doc.id, '| seller:', o.sellerName, '| merchantId:', o.merchantId,
        '| total:', o.total, '| coords:', o.deliveryLat, o.deliveryLng, '| status:', o.status);
  }
  const all = await db.collection('orders').get();
  log('Total orders in Firestore:', all.size);
  if (pageErrors.length) log('Page errors:', pageErrors.slice(0, 8));

  log('\nBrowser left open for 20s for inspection, then closes...');
  await sleep(20000);
  await browser.close();
  log('Done. Screenshots in', SHOT_DIR);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
