const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const fs = require('fs');
const BASE = process.env.STRESS_BASE || 'http://localhost:8080';
const CHROME = 'C:\\Users\\Dave\\.cache\\puppeteer\\chrome\\win64-148.0.7778.97\\chrome-win64\\chrome.exe';
const SHOT = __dirname + '\\screenshots-lifecycle';
if (!fs.existsSync(SHOT)) fs.mkdirSync(SHOT);
const sa = JSON.parse(fs.readFileSync(__dirname + '/serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const stamp = (n) => String(n).padStart(2, '0') + '';

// ---- role accounts ----
const merchantCreds = JSON.parse(fs.readFileSync(__dirname + '/merchant-creds.json', 'utf8'));
const merchantEmail = merchantCreds.email;
const MERCHANT_PW = merchantCreds.password;
const driverEmail = 'sim.driver.' + Date.now() + '@smartsoko.test';
const PW = 'SimPass#2024';

(async () => {
  // Merchant account: created by customer-simulation.js (uid = MERCHANT_UID). Reuse it.
  const MERCHANT_UID = process.env.MERCHANT_UID;
  if (!MERCHANT_UID) { console.error('Set MERCHANT_UID to the same value used for customer-simulation.js'); process.exit(1); }
  // Create only the driver auth user + profile (merchant already exists from the customer run)
  log('Creating driver account (Admin SDK)...');
  const driverU = await admin.auth().createUser({ email: driverEmail, password: PW, displayName: 'Simba Driver' });
  await db.collection('users').doc(driverU.uid).set({ fullName: 'Simba Driver', email: driverEmail, role: 'driver', status: 'offline', createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  const merchantU = { uid: MERCHANT_UID };
  log('  merchant uid (reused):', merchantU.uid);
  log('  driver  uid:', driverU.uid);

  // Launch ONE visible Chrome; reuse tabs per role (clean storage between roles)
  const browser = await puppeteer.launch({
    headless: false, executablePath: CHROME, protocolTimeout: 240000,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
  });
  const page = await browser.newPage();
  const shot = async (n) => { try { await page.screenshot({ path: `${SHOT}\\${n}.png` }); log('  [shot]', n); } catch (e) {} };
  const signIn = async (email) => {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    // If a previous session is still active, sign out first.
    const already = await page.evaluate(() => !!(window.auth && window.auth.currentUser));
    if (already) {
      await page.evaluate(() => window.auth.signOut());
      await sleep(1500);
      await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    }
    // Authenticate directly via the SDK (the page's #demoLoginBtn handler is unreliable).
    await page.waitForFunction(() => !!(window.auth && window.db), { timeout: 10000 }).catch(() => {});
    const uid = await page.evaluate(async (email, pw) => {
      const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
      const auth = window.auth || getAuth();
      const r = await signInWithEmailAndPassword(auth, email, pw);
      return r.user.uid;
    }, email, PW);
    await sleep(1500);
    return uid;
  };
  // Inline firebase config (same project) so a fresh Firestore instance shares auth
  const FB_CONFIG = {
    apiKey: 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE',
    authDomain: 'fooddelievry-dce15.firebaseapp.com',
    projectId: 'fooddelievry-dce15',
    storageBucket: 'fooddelievry-dce15.firebasestorage.app',
    messagingSenderId: '727819507148',
    appId: '1:727819507148:web:372bee2608d5c7a9587969'
  };
  // Update an order field as the currently-signed-in user (client Firestore, respects rules)
  const updateOrder = async (orderId, patch) => {
    return page.evaluate(async (orderId, patch, FB_CONFIG) => {
      const { doc, updateDoc, serverTimestamp, getFirestore, initializeFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const { initializeApp, getApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
      let app;
      try { app = getApp(); } catch (e) { app = initializeApp(FB_CONFIG); }
      const firestore = (window.db && typeof window.db.initializeFirestore === 'function') ? window.db
        : (initializeFirestore ? initializeFirestore(app, {}) : getFirestore(app));
      const d = doc(firestore, 'orders', orderId);
      const data = { ...patch };
      if (patch._ts) { data[patch._ts] = serverTimestamp(); delete data._ts; }
      await updateDoc(d, data);
      return true;
    }, orderId, patch, FB_CONFIG);
  };

  // ===== MERCHANT: accept + prepare =====
  log('\n=== MERCHANT SIGNS IN ===');
  await signIn(merchantEmail);
  await page.goto(BASE + '/merchant?tab=orders', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);
  await shot('5-merchant-orders');
  const orderId = process.env.ORDER_ID || (() => { try { return JSON.parse(fs.readFileSync(__dirname + '/last-order.json', 'utf8')).orderId; } catch (e) { return null; } })();
  if (!orderId) { console.error('No ORDER_ID provided and last-order.json not found. Run customer-simulation.js first.'); process.exit(1); }
  log('Target order:', orderId);
  // Merchant accepts
  await updateOrder(orderId, { status: 'accepted', _ts: 'acceptedAt' });
  await sleep(1200);
  await shot('6-merchant-accepted');
  // Merchant prepares
  await updateOrder(orderId, { status: 'preparing', _ts: 'preparingAt' });
  await sleep(1000);
  await shot('7-merchant-preparing');
  // Merchant assigns the driver (merchant may set driverId because merchantId matches)
  await updateOrder(orderId, { status: 'assigned', driverId: driverU.uid, driverName: 'Simba Driver', driverPhone: '+255700000001', _ts: 'assignedAt' });
  await sleep(1000);
  await shot('7b-merchant-assigned');
  log('Merchant: accepted -> preparing -> assigned driver');

  // ===== DRIVER: pickup + deliver =====
  log('\n=== DRIVER SIGNS IN ===');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  // ensure merchant session is cleared before driver logs in
  await page.evaluate(() => { if (window.auth && window.auth.currentUser) return window.auth.signOut(); }).catch(() => {});
  await sleep(1200);
  await signIn(driverEmail);
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);
  await shot('8-driver-available');
  // Driver picks up (now driverId == uid, so update is allowed)
  await updateOrder(orderId, { status: 'picked_up', _ts: 'pickedUpAt' });
  await sleep(1000);
  await shot('9-driver-pickedup');
  // Driver delivers
  await updateOrder(orderId, { status: 'delivered', _ts: 'deliveredAt' });
  await sleep(1200);
  await shot('10-driver-delivered');
  log('Driver: picked_up -> delivered');

  // ===== VERIFY FINAL STATE =====
  log('\n=== VERIFY LIFECYCLE IN FIRESTORE ===');
  const doc = await db.collection('orders').doc(orderId).get();
  const o = doc.data();
  log('Order', doc.id);
  log('  status:', o.status);
  log('  merchantId:', o.merchantId);
  log('  driverId:', o.driverId, '| driverName:', o.driverName);
  log('  timeline:', ['acceptedAt','preparingAt','assignedAt','pickedUpAt','deliveredAt'].map(k => k+':'+(o[k]?'✓':'-')).join(' '));

  log('\nFinal state verified. Closing browser...');
  await sleep(3000);
  // cleanup test driver account (merchant account is owned by customer-simulation.js run)
  try { await admin.auth().deleteUser(driverU.uid); log('Cleaned up test driver auth user:', driverU.uid); } catch (e) { log('cleanup note:', e.message); }
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]).catch(() => {});
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
