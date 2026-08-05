const puppeteer = require('puppeteer');

const CHROME_PATH = 'C:\\Users\\Dave\\.cache\\puppeteer\\chrome\\win64-148.0.7778.97\\chrome-win64\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const EMAIL = 'dd396515@gmail.com';
const PASSWORD = 'Tanzania101';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [PAGE] ${msg.text().slice(0, 120)}`);
  });

  // ==================== LOGIN ====================
  console.log('\n=== Login ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.waitForSelector('#identity');
  await page.type('#identity', EMAIL, { delay: 30 });
  await page.type('#password', PASSWORD, { delay: 15 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('admin'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  const authEmail = await page.evaluate(() => {
    return window.auth && window.auth.currentUser ? window.auth.currentUser.email : null;
  });
  console.log(`Auth user: ${authEmail}`);

  if (!authEmail) {
    console.error('Not authenticated!');
    await browser.close();
    return;
  }

  // ==================== AUTH-BEARING ADMIN API ENDPOINTS ====================
  console.log('\n=== Admin API endpoints ===');

  const endpoints = [
    { name: 'System Status', path: '/api/admin/system/status' },
    { name: 'Auth Verify',   path: '/api/auth/verify' },
    { name: 'Health',        path: '/api/health' },
  ];

  for (const ep of endpoints) {
    const r = await page.evaluate(async (path) => {
      try {
        const token = window.auth && window.auth.currentUser
          ? await window.auth.currentUser.getIdToken()
          : null;
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(path, { headers });
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { status: 0, ok: false };
      }
    }, ep.path);
    console.log(`  ${r.ok ? '✓' : '✗'} ${ep.name.padEnd(16)} ${r.status}`);
  }

  // ==================== PAGE LOAD STRESS TEST ====================
  const PAGE_LOADS = 20;
  const PAGE_CONCURRENCY = 5;
  console.log(`\n=== Page load stress test: ${PAGE_LOADS} reqs, ${PAGE_CONCURRENCY} concurrent ===`);

  const pageResults = { success: 0, failure: 0, totalTime: 0, minTime: Infinity, maxTime: 0, times: [] };

  async function fetchAdminPage(index) {
    const start = Date.now();
    try {
      const result = await page.evaluate(async (url) => {
        const res = await fetch(url, { redirect: 'manual' });
        return { status: res.status, length: (await res.text()).length };
      }, `${BASE_URL}/admin`);
      const elapsed = Date.now() - start;
      if (result.status >= 200 && result.status < 400) {
        pageResults.success++;
        pageResults.totalTime += elapsed;
        if (elapsed < pageResults.minTime) pageResults.minTime = elapsed;
        if (elapsed > pageResults.maxTime) pageResults.maxTime = elapsed;
        pageResults.times.push(elapsed);
      } else {
        pageResults.failure++;
      }
    } catch {
      pageResults.failure++;
    }
  }

  for (let i = 0; i < PAGE_LOADS; i += PAGE_CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < PAGE_CONCURRENCY && (i + j) < PAGE_LOADS; j++) {
      batch.push(fetchAdminPage(i + j));
    }
    await Promise.all(batch);
    process.stdout.write(`\r  Page loads: ${Math.min(100, Math.round((i + PAGE_CONCURRENCY) / PAGE_LOADS * 100))}%`);
  }
  console.log('');

  // ==================== API STRESS TEST (lightweight endpoints only) ====================
  const API_REQS = 20;
  const API_CONCURRENCY = 5;
  const apiEndpoints = ['/api/health', '/api/config'];
  console.log(`\n=== API stress test: ${API_REQS} reqs, ${API_CONCURRENCY} concurrent ===`);

  const apiResults = { success: 0, failure: 0, totalTime: 0 };

  async function callApi(index) {
    const ep = apiEndpoints[index % apiEndpoints.length];
    const start = Date.now();
    try {
      const result = await page.evaluate(async (path) => {
        const res = await fetch(path);
        return { status: res.status, ok: res.ok };
      }, ep);
      apiResults.totalTime += Date.now() - start;
      if (result.ok) apiResults.success++;
      else apiResults.failure++;
    } catch {
      apiResults.failure++;
    }
  }

  for (let i = 0; i < API_REQS; i += API_CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < API_CONCURRENCY && (i + j) < API_REQS; j++) {
      batch.push(callApi(i + j));
    }
    await Promise.all(batch);
    process.stdout.write(`\r  API calls: ${Math.min(100, Math.round((i + API_CONCURRENCY) / API_REQS * 100))}%`);
  }
  console.log('');

  // ==================== RESULTS ====================
  console.log('\n========================================');
  console.log('   FULL-STACK INTEGRATION TEST RESULTS');
  console.log('========================================\n');
  console.log(`Auth user: ${authEmail}`);
  console.log('');
  console.log('--- Page Loads (/admin) ---');
  console.log(`  Success:   ${pageResults.success}/${PAGE_LOADS}`);
  console.log(`  Rate:      ${(pageResults.success / PAGE_LOADS * 100).toFixed(1)}%`);
  if (pageResults.success > 0) {
    const avg = (pageResults.totalTime / pageResults.success).toFixed(0);
    const sorted = [...pageResults.times].sort((a, b) => a - b);
    console.log(`  Avg:       ${avg}ms`);
    console.log(`  Min:       ${pageResults.minTime}ms`);
    console.log(`  Max:       ${pageResults.maxTime}ms`);
    console.log(`  P50:       ${sorted[Math.floor(sorted.length * 0.5)]}ms`);
    console.log(`  P90:       ${sorted[Math.floor(sorted.length * 0.9)]}ms`);
  }
  console.log('');
  console.log('--- API ---');
  console.log(`  ${apiResults.success}/${API_REQS} ok, avg ${(apiResults.totalTime / API_REQS).toFixed(0)}ms`);

  const pass = authEmail && pageResults.success === PAGE_LOADS;
  console.log('');
  console.log(pass ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');

  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
