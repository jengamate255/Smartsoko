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
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.waitForSelector('#identity');
  await page.type('#identity', 'dd396515@gmail.com', { delay: 30 });
  await page.type('#password', 'Tanzania101', { delay: 15 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('admin'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  const results = await page.evaluate(async () => {
    const token = window.auth && window.auth.currentUser
      ? await window.auth.currentUser.getIdToken()
      : null;
    const endpoints = ['/api/auth/debug', '/api/admin/system/status', '/api/admin/sellers', '/api/admin/drivers'];
    const out = [];
    for (const ep of endpoints) {
      try {
        const r = await fetch(ep, { headers: { 'Authorization': 'Bearer ' + token } });
        const text = await r.text();
        out.push({ ep, status: r.status, body: text.slice(0, 300) });
      } catch (e) {
        out.push({ ep, status: 0, body: e.message });
      }
    }
    return out;
  });

  for (const r of results) {
    console.log(r.ep + ' -> ' + r.status);
    if (r.status >= 400) console.log('  ' + r.body);
  }

  await browser.close();
})();
