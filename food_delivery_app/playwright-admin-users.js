const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('error') || text.includes('Error') || text.includes('fail') || text.includes('Fail')) {
      errors.push(`[${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', e => errors.push(`[PAGEERROR] ${e.message}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      errors.push(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.fill('#identity', 'dd396515@gmail.com');
  await page.fill('#password', 'Tanzania101');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForURL(url => url.pathname.includes('/admin'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);

  console.log('After login URL:', page.url());
  console.log('Errors so far:', errors.length ? errors : 'none');

  // Click Users tab
  const usersTab = await page.$('button:has-text("Users"), a:has-text("Users"), [data-tab="users"], #users-tab, .tab-item:has-text("Users")');
  if (usersTab) {
    await usersTab.click();
    await page.waitForTimeout(3000);
  } else {
    // Try clicking nav link
    const navUsers = await page.$('nav a:has-text("Users"), .nav-item:has-text("Users")');
    if (navUsers) await navUsers.click();
    await page.waitForTimeout(3000);
  }

  console.log('\nErrors after Users tab click:', errors.length ? errors : 'none');
  if (errors.length) errors.forEach(e => console.log('  ', e));

  await page.screenshot({ path: 'admin-users-tab.png', fullPage: true });
  console.log('\nScreenshot saved to admin-users-tab.png');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
