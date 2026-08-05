const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'screenshots';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const routes = [
    '/login', '/home', '/driver', '/merchant', '/admin',
    '/cart', '/customer', '/discovery', '/product', '/supplier'
  ];

  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    try {
      const url = 'http://localhost:8080' + route;
      console.log('Capturing:', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      await page.screenshot({ path: path.join(OUT_DIR, route.replace('/', '') + '.png'), fullPage: false });
      console.log('  OK');
    } catch (e) {
      console.log('  FAILED:', e.message);
    }
    await page.close();
  }

  await browser.close();
  console.log('Done');
})();