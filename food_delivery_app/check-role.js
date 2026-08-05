const puppeteer = require('puppeteer');
const CHROME_PATH = 'C:\\Users\\Dave\\.cache\\puppeteer\\chrome\\win64-148.0.7778.97\\chrome-win64\\chrome.exe';
const BASE_URL = 'http://localhost:3000';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('  [PAGE]', msg.text().slice(0, 200)));

  // Login
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.waitForSelector('#identity');
  await page.type('#identity', 'dd396515@gmail.com', { delay: 30 });
  await page.type('#password', 'Tanzania101', { delay: 15 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('admin'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Hit debug endpoint
  const result = await page.evaluate(async () => {
    const token = window.auth && window.auth.currentUser
      ? await window.auth.currentUser.getIdToken()
      : null;
    const r = await fetch('/api/auth/debug', { headers: { 'Authorization': 'Bearer ' + token } });
    return await r.json();
  });

  console.log('Debug result:', JSON.stringify(result, null, 2));

  await browser.close();
})();
