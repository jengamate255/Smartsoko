const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Loading login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Filling form...');
  await page.type('#identity', 'Dd396515@gmail.com');
  await page.type('#password', 'Tanzania101');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for navigation...');
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    console.log('Navigation timeout, checking URL...');
  }
  
  const url = page.url();
  console.log('URL:', url);

  if (!url.includes('/admin')) {
    console.log('Trying direct admin access...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log('Admin URL:', page.url());
    
    const errors = await page.evaluate(() => {
      return window.__log?.getBuf?.().filter(e => e.level === 'error') || [];
    });
    console.log('Admin errors:', errors.length > 0 ? errors : 'None');
  } else {
    console.log('Login OK');
    const errors = await page.evaluate(() => {
      return window.__log?.getBuf?.().filter(e => e.level === 'error') || [];
    });
    console.log('Admin errors:', errors.length > 0 ? errors : 'None');
  }
  
  await browser.close();
})().catch(e => console.error('FAIL:', e.message));