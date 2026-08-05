const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try {
    await page.goto('http://localhost:3000/merchant', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch(e) {
    console.log('Page load timeout, taking screenshot anyway');
  }
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'screenshot-merchant.png', fullPage: true });
  console.log('Done');
  await browser.close();
})();
