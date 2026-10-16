const { chromium } = require('playwright');
const http = require('http');

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

function check(cond, msg) {
  if (cond) { passed++; console.log('  PASS:', msg); }
  else { failed++; failures.push(msg); console.log('  FAIL:', msg); }
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    }).on('error', reject);
  });
}

function apiPut(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('========================================');
  console.log('  SmartSoko Driver Flow E2E Test');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { longitude: 39.2083, latitude: -6.7924 },
    permissions: ['geolocation']
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // ===== STEP 1: Verify Server & API =====
    console.log('--- Step 1: Server Health ---');
    const health = await apiGet('/api/health');
    check(health.status === 200, 'Health endpoint returns 200');
    check(health.data.status === 'OK', 'Health status is OK');
    check(health.data.database === 'connected', 'Database connected');

    // ===== STEP 2: Verify Available Orders API =====
    console.log('\n--- Step 2: Available Orders API ---');
    const availRes = await apiGet('/api/driver/available-orders');
    check(availRes.status === 200, 'Available orders endpoint returns 200');
    check(Array.isArray(availRes.data), 'Available orders returns an array');
    console.log(`   Found ${availRes.data.length} available order(s)`);

    // Find a ready_for_delivery order to work with
    const readyOrder = availRes.data.find(o => o.status === 'ready_for_delivery' && !o.driverId);
    if (!readyOrder) {
      console.log('\n   No ready_for_delivery orders found. Creating one via API...');
      // We need to find an existing order and reset it to ready_for_delivery
      const allOrdersRes = await apiGet('/api/orders/test-customer-123');
      let testOrder = null;
      if (Array.isArray(allOrdersRes.data) && allOrdersRes.data.length > 0) {
        testOrder = allOrdersRes.data.find(o => !['delivered', 'completed', 'cancelled'].includes(o.status))
          || allOrdersRes.data[0];
      }
      if (testOrder) {
        const resetRes = await apiPut(`/api/seller/orders/${testOrder.id}/status`, { status: 'ready_for_delivery' });
        check(resetRes.status === 200, `Reset order ${testOrder.id.slice(-8)} to ready_for_delivery`);
        // Re-fetch available orders
        const availRes2 = await apiGet('/api/driver/available-orders');
        var testReadyOrder = availRes2.data.find(o => o.status === 'ready_for_delivery' && !o.driverId);
      }
    }
    const orderToTest = readyOrder || testReadyOrder;
    if (!orderToTest) {
      console.log('\n   SKIP: No testable order available. Testing with available data only.');
    }

    // ===== STEP 3: Verify Navigation API =====
    if (orderToTest) {
      console.log('\n--- Step 3: Navigation API ---');
      const navRes = await apiGet(`/api/driver/order/${orderToTest.id}/navigation`);
      check(navRes.status === 200, 'Navigation endpoint returns 200');
      check(navRes.data.sellerCoords !== null, 'Seller coordinates available for navigation');
      check(navRes.data.sellerCoords.lat !== undefined, 'Seller latitude present');
      check(navRes.data.sellerCoords.lng !== undefined, 'Seller longitude present');
      console.log(`   Seller coords: ${navRes.data.sellerCoords.lat}, ${navRes.data.sellerCoords.lng}`);
      if (navRes.data.customerCoords) {
        console.log(`   Customer coords: ${navRes.data.customerCoords.lat}, ${navRes.data.customerCoords.lng}`);
      }
    }

    // ===== STEP 4: Driver Profile API =====
    console.log('\n--- Step 4: Driver Profile API ---');
    const testDriverId = 'test-driver-playwright-' + Date.now();
    const profileRes = await apiPut(`/api/driver/${testDriverId}/profile`, {
      name: 'Playwright Test Driver',
      email: 'test@playwright.test',
      role: 'driver',
      status: 'offline',
      isOnline: false
    });
    check(profileRes.status === 200, 'Driver profile created via API');

    const getProfileRes = await apiGet(`/api/driver/${testDriverId}/profile`);
    check(getProfileRes.status === 200, 'Driver profile retrieved via API');
    check(getProfileRes.data.name === 'Playwright Test Driver', 'Driver name matches');

    // ===== STEP 5: Driver Go Online =====
    console.log('\n--- Step 5: Driver Online Toggle ---');
    const onlineRes = await apiPut(`/api/driver/${testDriverId}/status`, { isOnline: true });
    check(onlineRes.status === 200, 'Driver set to online');

    const profileAfter = await apiGet(`/api/driver/${testDriverId}/profile`);
    check(profileAfter.data.isOnline === true, 'Driver isOnline is true after toggle');

    // ===== STEP 6: Accept Order =====
    if (orderToTest) {
      console.log('\n--- Step 6: Accept Order ---');
      const acceptRes = await apiPut(`/api/driver/orders/${orderToTest.id}/accept`, {
        driverId: testDriverId,
        driverName: 'Playwright Test Driver'
      });
      check(acceptRes.status === 200, 'Order accepted via API');

      // Verify order status changed
      const ordersAfter = await apiGet(`/api/driver/${testDriverId}/active-orders`);
      const acceptedOrder = ordersAfter.data.find(o => o.id === orderToTest.id);
      check(!!acceptedOrder, 'Accepted order appears in driver active orders');
      if (acceptedOrder) {
        check(acceptedOrder.driverId === testDriverId, 'Order driverId matches test driver');
        console.log(`   Order status: ${acceptedOrder.status}`);
      }

      // ===== STEP 7: Mark Picked Up =====
      console.log('\n--- Step 7: Mark Picked Up ---');
      const pickupRes = await apiPut(`/api/driver/orders/${orderToTest.id}/status`, { status: 'picked_up' });
      check(pickupRes.status === 200, 'Order marked as picked_up');

      // ===== STEP 8: Mark In Transit =====
      console.log('\n--- Step 8: Mark In Transit ---');
      const transitRes = await apiPut(`/api/driver/orders/${orderToTest.id}/status`, { status: 'in_transit' });
      check(transitRes.status === 200, 'Order marked as in_transit');

      // ===== STEP 9: Complete Delivery =====
      console.log('\n--- Step 9: Complete Delivery ---');
      const completeRes = await apiPut(`/api/driver/orders/${orderToTest.id}/complete`, {
        driverId: testDriverId
      });
      check(completeRes.status === 200, 'Delivery completed via API');
      check(completeRes.data.success === true, 'Delivery response indicates success');

      // ===== STEP 10: Verify Earnings =====
      console.log('\n--- Step 10: Verify Earnings ---');
      const earningsRes = await apiGet(`/api/driver/${testDriverId}/earnings`);
      check(earningsRes.status === 200, 'Earnings endpoint returns 200');
      check(typeof earningsRes.data.balance === 'number', 'Balance is a number');
      check(typeof earningsRes.data.totalEarned === 'number', 'Total earned is a number');
      console.log(`   Balance: ${earningsRes.data.balance}`);
      console.log(`   Total earned: ${earningsRes.data.totalEarned}`);
      console.log(`   Total deliveries: ${earningsRes.data.totalDeliveries}`);
    }

    // ===== STEP 11: Browser UI Loads Clean =====
    console.log('\n--- Step 11: Driver UI Page ---');
    await page.goto(`${BASE}/driver.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    check(title.includes('Driver') || title.includes('SmartSoko'), `Driver page title: "${title}"`);
    check(errors.length === 0, `No JS errors on driver page (found ${errors.length})`);
    if (errors.length > 0) {
      errors.forEach(e => console.log(`   ERROR: ${e}`));
    }

    // ===== STEP 12: Categories API (optimized) =====
    console.log('\n--- Step 12: Categories API Performance ---');
    const t1 = Date.now();
    const catRes1 = await apiGet('/api/categories');
    const coldMs = Date.now() - t1;
    check(catRes1.status === 200, 'Categories endpoint returns 200');
    check(Array.isArray(catRes1.data), 'Categories returns array');
    console.log(`   Cold response: ${coldMs}ms`);

    const t2 = Date.now();
    await apiGet('/api/categories');
    const cachedMs = Date.now() - t2;
    check(cachedMs < coldMs, `Cached (${cachedMs}ms) faster than cold (${coldMs}ms)`);
    console.log(`   Cached response: ${cachedMs}ms`);

    // ===== STEP 13: Driver Go Offline =====
    console.log('\n--- Step 13: Driver Go Offline ---');
    const offlineRes = await apiPut(`/api/driver/${testDriverId}/status`, { isOnline: false });
    check(offlineRes.status === 200, 'Driver set to offline');

    const profileOffline = await apiGet(`/api/driver/${testDriverId}/profile`);
    check(profileOffline.data.isOnline === false, 'Driver isOnline is false after offline toggle');

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    check(false, `Test crashed: ${error.message}`);
  } finally {
    await browser.close();
  }

  // ===== SUMMARY =====
  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

runTest();
