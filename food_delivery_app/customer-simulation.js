const puppeteer = require('puppeteer');
const BASE = process.env.STRESS_BASE || 'http://localhost:8080';

const TIMESTAMP = Date.now();
const email = `sim.customer.${TIMESTAMP}@smartsoko.test`;
const password = 'SimPass#2024';
const fullName = 'Simba Customer';
const phone = '+255712345678';

// Real products from Kunduchi Fresh Store (Firestore)
const SELLER_ID = 'YG1BCXEFmG3tTmqCitiW';
const SELLER_NAME = 'Kunduchi Fresh Store';
// Allow the merchant's uid to be injected so the lifecycle test can update the order
// (Firestore rules require merchantId == auth.uid for merchant updates).
const MERCHANT_UID = process.env.MERCHANT_UID || SELLER_ID;
const cart = [
  { id: 'V6DtVwGaDhD5onC2tQbz', name: 'Tuna Fish', price: 15000, quantity: 2, sellerId: MERCHANT_UID, sellerName: SELLER_NAME },
  { id: 'l2UpP6bU752LPJuw67bx', name: 'Swordfish', price: 25000, quantity: 1, sellerId: MERCHANT_UID, sellerName: SELLER_NAME }
];
const address = '123 Kunduchi Beach Road, Dar es Salaam';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new', protocolTimeout: 180000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  // ---------- 1. SIGN UP ----------
  log('\n=== 1. CUSTOMER SIGN UP ===');
  log('email:', email);
  await page.goto(BASE + '/signup', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#fullName', { timeout: 15000 });
  await page.type('#fullName', fullName);
  await page.type('#email', email);
  await page.type('#phone', phone);
  await page.type('#password', password);
  await page.type('#confirmPassword', password);
  await page.click('#agreeTerms');
  // ensure customer radio selected
  await page.evaluate(() => {
    const r = document.querySelector('input[name="accountType"][value="customer"]');
    if (r) { r.checked = true; }
  });
  await page.click('#signupBtn');
  await sleep(4000);
  // onboarding guard may navigate; wait for it to settle
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await sleep(1500);
  const signedUp = await page.evaluate(() => !!(window.auth && window.auth.currentUser));
  log('signed up (window.auth.currentUser present):', signedUp);
  if (!signedUp) {
    log('Signup failed. Page errors:', pageErrors.slice(0, 5));
    const errText = await page.evaluate(() => {
      const e = document.getElementById('errorText');
      return e ? e.textContent : '(no errorText)';
    });
    log('errorText:', errText);
  }

  // Capture auth state + id token
  const authInfo = await page.evaluate(async () => {
    const u = window.auth && window.auth.currentUser;
    if (!u) return null;
    const token = await u.getIdToken();
    return { uid: u.uid, email: u.email, token: token.slice(0, 20) + '...' };
  });
  log('auth uid:', authInfo && authInfo.uid);

  // ---------- 2. SEED CART + ADDRESS, OPEN CHECKOUT ----------
  log('\n=== 2. BUILD CART & OPEN CHECKOUT ===');
  // Set cart/address while logged in, then go to checkout (do NOT clear after, or cart is lost).
  await page.evaluate((cart, address, name, phone) => {
    localStorage.setItem('smartsoko_cart', JSON.stringify(cart));
    localStorage.setItem('smartsoko_address', address);
    localStorage.setItem('smartsoko_user_address', address);
    localStorage.setItem('smartsoko_name', name);
    localStorage.setItem('smartsoko_user_name', name);
    localStorage.setItem('smartsoko_phone', phone);
    localStorage.setItem('smartsoko_user_phone', phone);
  }, cart, address, fullName, phone);

  // ensure still logged in (Firebase auth persists in IndexedDB, not localStorage)
  const stillAuth = await page.evaluate(() => !!(window.auth && window.auth.currentUser));
  log('authenticated before checkout:', stillAuth);
  if (!stillAuth) {
    log('Re-authenticating via UI...');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#identity', { timeout: 10000 });
    await page.type('#identity', email);
    await page.type('#password', password);
    await page.click('#demoLoginBtn');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await sleep(1500);
  }

  await page.goto(BASE + '/checkout', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const checkoutState = await page.evaluate(() => ({
    items: document.getElementById('checkoutItems')?.children.length,
    total: document.getElementById('summaryTotal')?.textContent,
    address: document.getElementById('deliveryAddress')?.textContent,
    uid: window.auth?.currentUser?.uid || null
  }));
  log('checkout loaded:', JSON.stringify(checkoutState));

  // ---------- 3. PLACE ORDER via the real UI (placeOrder) ----------
  log('\n=== 3. PLACE ORDER (UI) ===');
  const uid = authInfo && authInfo.uid;
  const admin = require('firebase-admin');
  const fs = require('fs');
  const sa = JSON.parse(fs.readFileSync(__dirname + '/serviceAccountKey.json', 'utf8'));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();
  const preCount = (await db.collection('orders').get()).size;

  // Capture the order id from completeOrder, but still let it navigate to /track-order.
  await page.evaluate(() => {
    window.__capturedOrderId = null;
    const _orig = window.completeOrder;
    window.completeOrder = function (orderId) {
      window.__capturedOrderId = orderId;
      if (_orig) return _orig(orderId);
      window.location.href = `/track-order?orderId=${encodeURIComponent(orderId)}`;
    };
  });

  const placeResult = await page.evaluate(async () => {
    const out = { auth: !!(window.auth && window.auth.currentUser), apiRoutes: typeof API_ROUTES, apiHelpers: typeof apiHelpers };
    try { out.tokenLen = (await window.auth.currentUser.getIdToken()).length; } catch (e) { out.tokenErr = String(e.message); }
    try {
      if (typeof placeOrder !== 'function') { out.error = 'placeOrder not defined'; return out; }
      await placeOrder();
      out.ok = true;
    } catch (e) { out.error = String(e && e.message || e); }
    out.capturedOrderId = window.__capturedOrderId;
    return out;
  }).catch(e => ({ evalError: String(e.message) }));
  log('placeOrder result:', JSON.stringify(placeResult));
  await sleep(1000);

  await browser.close();

  // ---------- 4. VERIFY IN FIRESTORE ----------
  log('\n=== 4. VERIFY ORDER IN FIRESTORE ===');
  const capturedId = placeResult && placeResult.capturedOrderId;
  if (capturedId) {
    const doc = await db.collection('orders').doc(capturedId).get();
    const o = doc.data();
    log('VERIFIED ORDER:');
    log('  id:', doc.id);
    log('  customer:', o.customerName, '|', o.customerPhone, '| uid:', o.customerId);
    log('  seller:', o.sellerName, '| merchantId:', o.merchantId);
    log('  subtotal:', o.subtotal, '| deliveryFee:', o.deliveryFee, '| tax:', o.tax, '| total:', o.total);
    log('  items:', o.items.map(i => `${i.name} x${i.quantity}`).join(', '));
    log('  status:', o.status);
    log('  delivery coords:', o.deliveryLat, o.deliveryLng, '| customer:', o.customerLat, o.customerLng);
  } else {
    log('No order id captured from UI. placeOrder output:', JSON.stringify(placeResult));
  }

  if (capturedId) {
    fs.writeFileSync(__dirname + '/last-order.json', JSON.stringify({ orderId: capturedId, customerUid: uid, email }, null, 2));
    log('Wrote last-order.json (orderId=' + capturedId + ')');
  }
  const postCount = (await db.collection('orders').get()).size;
  log('Orders in Firestore: before=' + preCount + ' after=' + postCount + ' (delta ' + (postCount - preCount) + ')');
  if (pageErrors.length) log('\nPage errors during run:', pageErrors.slice(0, 8));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
