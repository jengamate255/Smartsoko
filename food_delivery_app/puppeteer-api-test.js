const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8080';
const ACCOUNTS = [
  { email: 'dd396515@gmail.com', password: 'Tanzania101', tag: 'dd396515' },
  { email: 'pipsr101@gmail.com', password: 'Tanzania101', tag: 'pipsr101' },
];

// Protected API endpoints to exercise with a Bearer token
const API_ENDPOINTS = [
  ['GET', '/api/auth/verify'],
  ['GET', '/api/admin/sellers'],
  ['GET', '/api/admin/users'],
  ['GET', '/api/admin/orders'],
  ['GET', '/api/admin/drivers'],
  ['GET', '/api/driver/profile'],
  ['GET', '/api/vendor/orders'],
  ['GET', '/api/vendor/analytics'],
  ['GET', '/api/sellers'],
  ['GET', '/api/categories'],
  ['GET', '/api/riders'],
];

const fs = require('fs');
const OUT = 'E:\\Project\\notsmartsoko\\puppeteer-report';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function loginAndGetToken(page, account) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', account.email);
  await page.type('#password', account.password);
  await page.click('#loginForm button[type="submit"]').catch(() => {});

  // Wait for auth to settle
  await page.waitForFunction(
    () => window.auth && window.auth.currentUser,
    { timeout: 30000 }
  ).catch(() => {});
  // Poll for a usable ID token (avoid timing flakiness)
  let obtainedToken = null;
  for (let i = 0; i < 10 && !obtainedToken; i++) {
    obtainedToken = await page.evaluate(async () => {
      try {
        if (window.auth && window.auth.currentUser) {
          return await window.auth.currentUser.getIdToken(true);
        }
      } catch (e) {}
      return null;
    });
    if (!obtainedToken) await new Promise(r => setTimeout(r, 1500));
  }

  // Fetch the Firebase ID token
  const token = await page.evaluate(async () => {
    if (window.auth && window.auth.currentUser) {
      return await window.auth.currentUser.getIdToken(true);
    }
    return null;
  });

  const url = page.url();
  // Settle on a stable page so no pending navigation destroys the execution context
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
  return { url, token: obtainedToken };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const summary = [];

  for (const account of ACCOUNTS) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const { url, token } = await loginAndGetToken(page, account);
    console.log(`\n=== Account ${account.email} (${account.tag}) ===`);
    console.log(`Redirected to: ${url}`);
    console.log(`ID token obtained: ${token ? 'YES (' + token.length + ' chars)' : 'NO'}`);

    if (!token) {
      console.log('  !! Cannot test authenticated APIs without a token');
      summary.push({ account: account.email, tag: account.tag, loginUrl: url, token: false, apis: [] });
      await page.close();
      continue;
    }

    const apiResults = [];
    for (const [method, path] of API_ENDPOINTS) {
      let res;
      try {
        res = await page.evaluate(async (method, path, token) => {
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
      } catch (e) {
        res = { status: 'ERR', ok: false, error: e.message };
      }

      let note = '';
      if (res.body && res.body.success === false) note = ' | ' + (res.body.error || 'success=false');
      if (res.error) note = ' | ' + res.error;
      console.log(`  ${method.padEnd(4)} ${path.padEnd(26)} -> ${String(res.status).padEnd(5)}${note}`);
      apiResults.push({ method, path, status: res.status, ok: res.ok, error: res.error || null, bodyError: res.body && res.body.error || null });
    }

    summary.push({ account: account.email, tag: account.tag, loginUrl: url, token: true, apis: apiResults });
    await page.close();
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}\\api-report.json`, JSON.stringify(summary, null, 2));
  console.log(`\nAPI report written to ${OUT}\\api-report.json`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
