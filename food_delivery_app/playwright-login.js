const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', e => console.error('PAGEERROR:', e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });

  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.waitForSelector('#password', { timeout: 10000 });

  const emailVal = await page.$eval('#identity', el => el.value);
  const passVal = await page.$eval('#password', el => el.value);
  console.log(`Email field: "${emailVal}"`);
  console.log(`Password field: "${passVal ? '***' + passVal.slice(-3) : 'empty'}"`);

  if (!emailVal) await page.fill('#identity', 'dd396515@gmail.com');
  if (!passVal) await page.fill('#password', 'Tanzania101');

  await page.click('#loginForm button[type="submit"]');

  // Wait for navigation away from /login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  console.log('Final URL:', page.url());
  await page.screenshot({ path: 'playwright-login-result.png', fullPage: false });
  console.log('Screenshot saved to playwright-login-result.png');

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
