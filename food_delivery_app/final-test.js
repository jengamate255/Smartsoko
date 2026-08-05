const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Loading /login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Filling login...');
  await page.type('#identity', 'Dd396515@gmail.com');
  await page.type('#password', 'Tanzania101');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 8000));

  console.log('After login URL:', page.url());

  // Navigate to admin
  console.log('Navigating to /admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  console.log('Admin page URL:', page.url());

  // Check for stats
  const stats = await page.evaluate(() => ({
    totalOrders: document.getElementById('totalOrders')?.textContent,
    totalRevenue: document.getElementById('totalRevenue')?.textContent,
    totalSellers: document.getElementById('totalSellers')?.textContent,
    totalUsers: document.getElementById('totalUsers')?.textContent,
  }));
  console.log('Stats:', stats);

  // Check orders table
  const ordersTable = await page.evaluate(() => {
    const tbody = document.getElementById('ordersTable');
    return tbody ? tbody.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Orders table:', ordersTable);

  const errors = await page.evaluate(() => window.__log?.getBuf?.().filter(e => e.level === 'error') || []);
  console.log('Errors:', errors.length > 0 ? errors : 'None');

  await browser.close();
  console.log('\n=== Test Complete ===');
})().catch(console.error);