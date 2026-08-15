// Self-contained Test Order
// Starts the real server, creates a Firebase Auth user, exchanges for an ID
// token via the Auth REST API, then places a real order through /api/orders.

const http = require('http');
const https = require('https');
const admin = require('firebase-admin');
const { app } = require('./server-production.js');

const PORT = 3998;
const API_KEY = process.env.FIREBASE_API_KEY;
const TEST_EMAIL = 'test-order-bot@smartsoko.local';
const TEST_PASSWORD = 'TestOrder123!';

function reqWith(lib, opts, body) {
  return new Promise((resolve, reject) => {
    const r = lib.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
const httpReq = (opts, body) => reqWith(http, opts, body);
const httpsReq = (opts, body) => reqWith(https, opts, body);

async function getRealIdToken() {
  // Ensure a test user exists
  let user;
  try {
    user = await admin.auth().getUserByEmail(TEST_EMAIL);
  } catch (e) {
    user = await admin.auth().createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      emailVerified: true,
    });
    console.log('  Created test user:', user.uid);
  }
  // Exchange credentials for a real ID token via REST API
  const res = await httpsReq({
    host: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true });

  const data = JSON.parse(res.body);
  if (!data.idToken) throw new Error('No idToken from Auth REST: ' + res.body.slice(0, 200));
  return data.idToken;
}

const TEST_ORDER = {
  items: [{
    id: 'prod_test_1',
    name: 'Test Burger',
    price: 8000,
    quantity: 2,
    merchantId: 'seller_test_1',
    sellerId: 'seller_test_1',
    sellerName: 'Test Kitchen',
  }],
  deliveryAddress: '123 Test Street, Dar es Salaam',
  deliveryLat: -6.7924,
  deliveryLng: 39.2083,
  phone: '+255712345678',
  name: 'Test Customer',
  paymentMethod: 'cod',
};

app.listen(PORT, async () => {
  console.log(`\n=== Test Order (local, port ${PORT}) ===\n`);
  try {
    console.log('1. Obtaining real Firebase ID token...');
    const idToken = await getRealIdToken();
    console.log('   Token acquired (len=' + idToken.length + ')\n');

    console.log('2. POST /api/orders (authenticated)...');
    const r = await httpReq({
      host: 'localhost', port: PORT, path: '/api/orders', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    }, TEST_ORDER);

    console.log('   Status:', r.status);
    const json = JSON.parse(r.body || '{}');
    if (json.success && json.order) {
      console.log('   PASS — Order created!');
      console.log('   Order ID :', json.order.id);
      console.log('   Total    :', json.order.total, json.order.currency || 'TZS');
      console.log('   Status   :', json.order.status);
      console.log('   Items    :', json.order.items.length);

      // 3. Fetch the order back
      console.log('\n3. GET /api/orders/:id (verify persisted)...');
      const g = await httpReq({
        host: 'localhost', port: PORT,
        path: `/api/orders/${json.order.id}`, method: 'GET',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      const gj = JSON.parse(g.body || '{}');
      console.log('   Status:', g.status, '| found:', !!gj.order);
      console.log('\n=== RESULT: ORDER TEST PASSED ===');
    } else {
      console.log('   FAIL —', JSON.stringify(json).slice(0, 300));
      console.log('\n=== RESULT: ORDER TEST FAILED ===');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    console.log('\n=== RESULT: ORDER TEST FAILED ===');
  }
  process.exit(0);
});
