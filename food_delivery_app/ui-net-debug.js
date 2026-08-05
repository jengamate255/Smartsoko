const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('requestfailed', req => {
    console.log('REQFAILED:', req.url().slice(0, 120), '->', req.failure() ? req.failure().errorText : '?');
  });
  page.on('response', res => {
    if (res.status() >= 400) console.log('HTTP ' + res.status() + ':', res.url().slice(0, 120));
  });
  await page.goto('http://localhost:8080/smartsoko-home', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
