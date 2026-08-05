/**
 * Stress test: measures API response times, throughput, error rates, and page rendering.
 * Run: node stress-test.js
 */

const puppeteer = require('puppeteer');
const http = require('http');

const BASE = 'http://localhost:3000';
const EMAIL = 'Dd396515@gmail.com';
const PASS = 'Tanzania101';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          time: Date.now() - start,
          size: parseInt(res.headers['content-length'] || data.length, 10),
          encoding: res.headers['content-encoding'] || 'none',
        });
      });
    }).on('error', reject);
  });
}

function stats(arr) {
  if (!arr.length) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: sorted.length,
  };
}

// ─── Test unauthenticated public endpoints ───
async function testPublicEndpoints() {
  console.log('\n=== Public Endpoint Stress Test ===');
  const endpoints = ['/health'];

  for (const ep of endpoints) {
    const times = [];
    const CONCURRENCY = 20;
    const start = Date.now();
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => httpGet(BASE + ep)));
    const elapsed = (Date.now() - start) / 1000;
    results.forEach(r => times.push(r.time));
    const s = stats(times);
    const errors = results.filter(r => r.status >= 400).length;
    const encodings = [...new Set(results.map(r => r.encoding))];
    console.log(`  ${ep}`);
    console.log(`    ${CONCURRENCY} concurrent in ${elapsed.toFixed(1)}s — ${(CONCURRENCY/elapsed).toFixed(0)} req/s`);
    console.log(`    min=${s.min}ms  avg=${s.avg}ms  p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  max=${s.max}ms`);
    console.log(`    errors=${errors}/${CONCURRENCY}  encoding=[${encodings.join(',')}]`);
  }
}

// ─── Measure admin page load with CDP network capture ───
async function runAdminPageTest(browser) {
  console.log('\n=== Admin Page — Load & Network Waterfall ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  const reqMap = new Map();
  client.on('Network.requestWillBeSent', (params) => {
    reqMap.set(params.requestId, { url: params.request.url, start: params.timestamp, type: params.type });
  });
  client.on('Network.responseReceived', (params) => {
    const req = reqMap.get(params.requestId);
    if (req) {
      req.end = params.timestamp;
      req.status = params.response.status;
      req.encoding = params.response.headers['content-encoding'] || 'none';
      req.size = params.response.encodedDataLength || 0;
      req.mimeType = params.response.mimeType;
    }
  });

  // Load admin page (user is logged in from context)
  const navStart = Date.now();
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  // Wait a bit more for any late API calls
  await sleep(3000);
  const totalLoad = Date.now() - navStart;
  console.log(`  Total page load: ${totalLoad}ms`);

  // Print network waterfall for API calls
  const allReqs = [...reqMap.values()];
  const apiReqs = allReqs
    .filter(r => r.url.includes('/api/') && r.end)
    .sort((a, b) => (a.end - a.start) - (b.end - b.start));

  if (apiReqs.length) {
    console.log(`  API calls (${apiReqs.length}):`);
    for (const r of apiReqs) {
      const dur = ((r.end - r.start) * 1000).toFixed(1);
      const label = r.url.replace(BASE, '').replace(/\?.*/, '');
      console.log(`    ${label.padEnd(45)} ${dur.padStart(6)}ms  [${r.status}] ${r.encoding}`);
    }
  } else {
    console.log('  No API calls captured');
  }

  // Print CSS/JS resource timing
  const cssReqs = allReqs.filter(r => r.mimeType === 'text/css' && r.end);
  if (cssReqs.length) {
    const cssTimes = cssReqs.map(r => (r.end - r.start) * 1000);
    const cs = stats(cssTimes);
    console.log(`  CSS assets (${cssReqs.length}): avg=${cs.avg.toFixed(0)}ms  total=${Math.round(cssTimes.reduce((a,b)=>a+b,0))}ms`);
  }

  await page.close();
  return { loadTime: totalLoad, apiCalls: apiReqs.length };
}

// ─── Simulate concurrent admin dashboard usage ───
async function simulateConcurrentAdmin(page) {
  console.log('\n=== Simulated Admin Usage (concurrent page loads) ===');
  const iterations = 5;
  const loadTimes = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await sleep(2000);
    const elapsed = Date.now() - start;
    loadTimes.push(elapsed);
    console.log(`  Load #${i + 1}: ${elapsed}ms`);
  }

  const s = stats(loadTimes);
  console.log(`  ---`);
  console.log(`  min=${s.min}ms  avg=${s.avg}ms  p50=${s.p50}ms  p95=${s.p95}ms  max=${s.max}ms`);
  console.log(`  ${s.count} loads in ${(loadTimes.reduce((a,b)=>a+b,0)/1000).toFixed(1)}s`);
}

// ─── Concurrent API stress test (authenticated, via fetch) ───
async function testAuthenticatedAPIs(page) {
  console.log('\n=== Authenticated API Stress Test (via dashboard fetch) ===');
  const apis = [
    { name: 'orders',  url: '/api/admin/orders?page=1&limit=20' },
    { name: 'sellers', url: '/api/admin/sellers?page=1&limit=20' },
    { name: 'users',   url: '/api/admin/users?page=1&limit=20' },
    { name: 'drivers', url: '/api/admin/drivers' },
  ];

  // Extract the Firebase token from the page's auth state (with retry)
  let token = null;
  for (let i = 0; i < 10; i++) {
    token = await page.evaluate(async () => {
      try {
        if (window.auth && window.auth.currentUser) {
          return await window.auth.currentUser.getIdToken(false);
        }
      } catch (e) {}
      return null;
    });
    if (token) break;
    await sleep(1000);
  }

  if (!token) {
    console.log('  No auth token available — trying page API calls instead');
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    const apiTimes = {};
    const reqMap2 = new Map();

    client.on('Network.requestWillBeSent', (params) => {
      reqMap2.set(params.requestId, { url: params.request.url });
    });
    client.on('Network.responseReceived', (params) => {
      const req = reqMap2.get(params.requestId);
      if (req && req.url.includes('/api/admin/')) {
        const name = req.url.replace(BASE + '/api/admin/', '').split('?')[0];
        if (!apiTimes[name]) apiTimes[name] = [];
        apiTimes[name].push(params.response.status);
      }
    });

    // Trigger page's data loaders
    await page.evaluate(() => {
      if (typeof loadOrders === 'function') loadOrders();
      if (typeof loadSellers === 'function') loadSellers();
      if (typeof loadDrivers === 'function') loadDrivers();
    });
    await sleep(5000);

    for (const [name, statuses] of Object.entries(apiTimes)) {
      const errors = statuses.filter(s => s >= 400).length;
      console.log(`  ${name}: ${statuses.length} calls, ${errors} errors`);
    }
    return;
  }

  console.log(`  Auth token obtained (${token.substring(0, 20)}...)`);

  for (const api of apis) {
    const times = [];
    const statuses = [];
    const CONCURRENCY = 10;
    const start = Date.now();

    const results = await page.evaluate(async (url, tkn, count) => {
      const res = [];
      for (let i = 0; i < count; i++) {
        const t0 = performance.now();
        try {
          const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + tkn } });
          const text = await r.text();
          res.push({ time: performance.now() - t0, status: r.status, size: text.length });
        } catch (e) {
          res.push({ time: performance.now() - t0, status: 0, size: 0 });
        }
      }
      return res;
    }, api.url, token, CONCURRENCY);

    const elapsed = (Date.now() - start) / 1000;
    results.forEach(r => { times.push(r.time); statuses.push(r.status); });
    const s = stats(times);
    const errors = statuses.filter(st => st >= 400 || st === 0).length;
    console.log(`  ${api.name}`);
    console.log(`    ${CONCURRENCY} concurrent in ${elapsed.toFixed(1)}s — ${(CONCURRENCY/elapsed).toFixed(0)} req/s`);
    console.log(`    min=${s.min.toFixed(0)}ms  avg=${s.avg.toFixed(0)}ms  p50=${s.p50.toFixed(0)}ms  p95=${s.p95.toFixed(0)}ms  max=${s.max.toFixed(0)}ms`);
    console.log(`    errors=${errors}/${CONCURRENCY}`);
  }
}

// ─── Main ───
(async () => {
  console.log('=== NotSmartsoko Stress Test ===');
  console.log(`Server: ${BASE}`);
  console.log(`Time:  ${new Date().toISOString()}`);

  // Phase 1: public endpoints
  await testPublicEndpoints();

  // Phase 2: Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Login
  console.log('\n=== Logging in... ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  await page.type('#identity', EMAIL);
  await page.type('#password', PASS);
  await page.click('button[type="submit"]');
  await sleep(5000);
  console.log(`  URL: ${page.url()}`);

  if (page.url().includes('/admin')) {
    console.log('  Login OK');
  } else {
    console.log('  Login redirect missed, navigating directly...');
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
  }

  // Phase 3: authenticated API stress
  await testAuthenticatedAPIs(page);

  // Phase 4: admin page load with CDP waterfall
  await runAdminPageTest(browser);

  // Phase 5: concurrent admin loads
  const loadPage = await browser.newPage();
  await loadPage.setViewport({ width: 1280, height: 900 });
  // Login again for this context
  await loadPage.goto(BASE + '/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await loadPage.type('#identity', EMAIL);
  await loadPage.type('#password', PASS);
  await loadPage.click('button[type="submit"]');
  await sleep(5000);
  await simulateConcurrentAdmin(loadPage);

  await browser.close();
  console.log('\n=== Stress test complete ===');
})().catch(err => {
  console.error('Stress test failed:', err);
  process.exit(1);
});
