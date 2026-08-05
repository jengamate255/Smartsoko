const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // First login
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.type('#identity', 'Dd396515@gmail.com');
  await page.type('#password', 'Tanzania101');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 8000));
  console.log('After login URL:', page.url());

  // Now navigate to admin
  console.log('Navigating to /admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Admin URL:', page.url());
  const errors = await page.evaluate(() => window.__log?.getBuf?.().filter(e => e.level === 'error') || []);
  console.log('Admin errors:', errors.length > 0 ? errors : 'None');
  
  // Check for stats
  const stats = await page.evaluate(() => ({
    orders: document.getElementById('stat-totalOrders')?.textContent,
    sellers: document.getElementById('stat-totalSellers')?.textContent,
    revenue: document.getElementById('stat-totalRevenue')?.textContent,
  }));
  console.log('Stats:', stats);

  await browser.close();
})().catch(console.error);