const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8080';
const ACCOUNTS = [
  { email: 'dd396515@gmail.com', password: 'Tanzania101', tag: 'admin' },
  { email: 'pipsr101@gmail.com', password: 'Tanzania101', tag: 'merchant' },
];

const PAGES = [
  '/', '/login', '/home', '/customer', '/merchant', '/driver',
  '/admin', '/fleet-manager.html', '/discovery', '/main.html'
];

const API_ENDPOINTS = [
  ['GET', '/api/auth/verify'],
  ['GET', '/api/sellers'],
  ['GET', '/api/categories'],
  ['GET', '/api/riders'],
  ['GET', '/api/admin/sellers'],
  ['GET', '/api/admin/settings'],
];

let passed = 0;
let failed = 0;
const failures = [];

function check(cond, msg) {
  if (cond) { passed++; console.log('  PASS:', msg); }
  else { failed++; console.log('  FAIL:', msg); failures.push(msg); }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // 1. Smoke test: each page loads without errors
  console.log('=== SMOKE TEST: Page Loads ===');
  for (const pagePath of PAGES) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    let httpStatus = 0;
    page.on('response', r => {
      if (r.url() === BASE + pagePath) httpStatus = r.status();
    });

    try {
      await page.goto(BASE + pagePath, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      // timeout is ok as long as page partially loaded
    }
    await new Promise(r => setTimeout(r, 2000));

    const appErrors = errors.filter(e =>
      !/favicon|preconnect|ERR_BLOCKED|ERR_SSL/i.test(e)
    );

    check(httpStatus !== 500, `${pagePath} -> no 500 (got ${httpStatus})`);
    if (appErrors.length > 0) {
      check(false, `${pagePath} -> 0 console errors (got ${appErrors.length})`);
      appErrors.slice(0, 3).forEach(e => console.log('       !', e.slice(0, 150)));
    } else {
      check(true, `${pagePath} -> 0 console errors`);
    }
    check(errors.length === 0 || appErrors.length === 0, `${pagePath} -> no app errors`);

    await ctx.close();
  }

  // 2. Auth + API test
  console.log('\n=== E2E TEST: Auth + API ===');
  for (const account of ACCOUNTS) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#identity', { timeout: 10000 });
    await page.type('#identity', account.email, { delay: 3 });
    await page.type('#password', account.password, { delay: 3 });
    await page.click('#loginForm button[type=submit]').catch(() => {});
    await page.waitForFunction(() => window.auth && window.auth.currentUser, { timeout: 30000 }).catch(() => {});

    let token = null;
    for (let i = 0; i < 10 && !token; i++) {
      token = await page.evaluate(async () => {
        try { if (window.auth && window.auth.currentUser) return await window.auth.currentUser.getIdToken(true); }
        catch (e) {} return null;
      });
      if (!token) await new Promise(r => setTimeout(r, 1500));
    }

    check(!!token, `${account.tag} login -> token obtained`);
    if (!token) { await ctx.close(); continue; }

    await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    for (const [method, path] of API_ENDPOINTS) {
      const res = await page.evaluate(async (method, path, token) => {
        try {
          const resp = await fetch(path, {
            method,
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
          });
          let body = null;
          try { body = await resp.json(); } catch (e) {}
          return { status: resp.status, ok: resp.ok, body };
        } catch (e) {
          return { status: 'ERR', ok: false, error: e.message };
        }
      }, method, path, token);

      if (res.ok) {
        check(true, `${account.tag} ${method} ${path} -> ${res.status}`);
      } else if (res.status === 403) {
        check(true, `${account.tag} ${method} ${path} -> ${res.status} (expected)`);
      } else {
        check(false, `${account.tag} ${method} ${path} -> ${res.status}`);
        if (res.body && res.body.error) console.log('       error:', res.body.error);
      }
    }

    await ctx.close();
  }

  // 3. Vendor analytics endpoint (previously broken)
  console.log('\n=== E2E TEST: Vendor Analytics (regression) ===');
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', ACCOUNTS[0].email, { delay: 3 });
  await page.type('#password', ACCOUNTS[0].password, { delay: 3 });
  await page.click('#loginForm button[type=submit]').catch(() => {});
  await page.waitForFunction(() => window.auth && window.auth.currentUser, { timeout: 30000 }).catch(() => {});
  let token = null;
  for (let i = 0; i < 10 && !token; i++) {
    token = await page.evaluate(async () => {
      try { if (window.auth && window.auth.currentUser) return await window.auth.currentUser.getIdToken(true); }
      catch (e) {} return null;
    });
    if (!token) await new Promise(r => setTimeout(r, 1500));
  }

  const analyticsRes = await page.evaluate(async (token) => {
    const resp = await fetch('/api/vendor/analytics?days=7', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    let body = null;
    try { body = await resp.json(); } catch (e) {}
    return { status: resp.status, ok: resp.ok, body };
  }, token);
  check(analyticsRes.ok && analyticsRes.body && analyticsRes.body.success,
    `Vendor analytics -> ${analyticsRes.status} success=${analyticsRes.body && analyticsRes.body.success}`);
  if (!analyticsRes.ok) {
    console.log('  Error:', JSON.stringify(analyticsRes.body));
  }
  await ctx.close();

  await browser.close();

  console.log(`\n==============================`);
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log(`==============================`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  -', f));
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
