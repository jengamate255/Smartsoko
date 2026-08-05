const puppeteer = require('puppeteer');

const BASE = 'http://localhost:3000';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', m => console.log(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => console.error('PAGEERROR:', e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for form fields to be ready
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.waitForSelector('#password', { timeout: 10000 });

  // Get current values
  const emailVal = await page.$eval('#identity', el => el.value);
  const passVal = await page.$eval('#password', el => el.value);
  console.log(`Email field: "${emailVal}"`);
  console.log(`Password field: "${passVal ? '***' + passVal.slice(-3) : 'empty'}"`);

  // Fill if empty
  if (!emailVal) {
    await page.type('#identity', 'dd396515@gmail.com');
  }
  if (!passVal) {
    await page.type('#password', 'Tanzania101');
  }

  // Click login
  await Promise.all([
    page.click('#loginForm button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
  ]);

  await new Promise(r => setTimeout(r, 3000));

  console.log('Final URL:', page.url());

  await page.screenshot({ path: 'login-result.png', fullPage: false });
  console.log('Screenshot saved to login-result.png');

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
