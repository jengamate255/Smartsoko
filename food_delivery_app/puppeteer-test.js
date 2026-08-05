const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8080';
const ACCOUNTS = [
  { email: 'dd396515@gmail.com', password: 'Tanzania101', tag: 'dd396515' },
  { email: 'pipsr101@gmail.com', password: 'Tanzania101', tag: 'pipsr101' },
];

const PAGES = [
  '/', '/login', '/home', '/customer', '/merchant', '/driver', '/admin',
  '/discovery', '/profile', '/cart', '/orders', '/product', '/restaurant',
  '/chat', '/track-order', '/checkout', '/wallet', '/store', '/signup',
  '/main', '/seller', '/onboarding', '/check-user', '/fleet-manager',
  '/admin-panel', '/supabase', '/seed-merchant', '/smartsoko-home',
  '/smartsoko-products', '/smartsoko-vendor', '/smartsoko-cart',
  '/smartsoko-checkout', '/index', '/404'
];

const fs = require('fs');
const OUT = 'E:\\Project\\notsmartsoko\\puppeteer-report';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function login(page, account) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', account.email);
  await page.type('#password', account.password);

  // Submit the form
  await Promise.all([
    page.click('#loginForm button[type="submit"]').catch(() => {}),
  ]);

  // Wait for either redirect away from /login or error message
  try {
    await page.waitForFunction(
      () => location.pathname !== '/login' && location.pathname !== '/',
      { timeout: 20000 }
    ).catch(() => {});
    // Give a moment for SPA redirect
    await new Promise(r => setTimeout(r, 2500));
  } catch (e) {}

  const url = page.url();
  const stillLogin = await page.$('#identity');
  return { url, loggedIn: !stillLogin, errors };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const summary = [];

  for (const account of ACCOUNTS) {
    const page = await browser.newPage();
    const loginResult = await login(page, account);
    console.log(`\n=== Account ${account.email} (${account.tag}) ===`);
    console.log(`Login redirected to: ${loginResult.url}`);
    console.log(`Logged in: ${loginResult.loggedIn}`);

    if (loginResult.errors.length) {
      console.log('Login-phase errors:');
      loginResult.errors.forEach(e => console.log('  ' + e));
    }

    const pageResults = [];
    for (const path of PAGES) {
      const before = pageResults.length;
      const pe = [];
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      page.on('console', m => { if (m.type() === 'error') pe.push(m.text()); });
      page.on('pageerror', e => pe.push('PAGEERROR: ' + e.message));

      let status = '?';
      try {
        const resp = await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 20000 });
        status = resp ? resp.status() : 'no-resp';
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        status = 'ERR:' + e.message.split('\n')[0];
      }
      const title = await page.title().catch(() => '');
      const result = { path, status, title, errors: pe };
      pageResults.push(result);

      const errSummary = pe.length ? ` [${pe.length} errors]` : '';
      console.log(`  ${path.padEnd(22)} -> ${String(status).padEnd(8)}${errSummary}`);
      if (pe.length) pe.slice(0, 3).forEach(e => console.log('       ! ' + e.slice(0, 200)));
    }

    // Take a screenshot of the dashboard/home after login
    try {
      await page.goto(loginResult.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: `${OUT}\\${account.tag}-after-login.png`, fullPage: false });
    } catch (e) {}

    summary.push({ account: account.email, tag: account.tag, loginUrl: loginResult.url, loggedIn: loginResult.loggedIn, pages: pageResults });
    await page.close();
  }

  await browser.close();

  // Write JSON report
  fs.writeFileSync(`${OUT}\\report.json`, JSON.stringify(summary, null, 2));
  console.log(`\nReport written to ${OUT}\\report.json`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
