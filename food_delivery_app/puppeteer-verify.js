const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleErrors = [];
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  // 1. Test firebase-config loads without errors
  console.log('1. Testing firebase-config.js load...');
  await page.goto(BASE + '/discovery', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const fbErrors = consoleErrors.filter(e =>
    e.includes('await is only valid') || e.includes('Firebase Auth not initialized') ||
    e.includes('ERR_SSL_PROTOCOL') || e.includes('Missing or insufficient permissions')
  );
  console.log('   Errors found:', fbErrors.length);
  fbErrors.forEach(e => console.log('   !', e.slice(0, 200)));

  // 2. Test login and profile page
  console.log('\n2. Testing login + profile...');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', 'dd396515@gmail.com', { delay: 10 });
  await page.type('#password', 'Tanzania101', { delay: 5 });
  await page.click('#loginForm button[type="submit"]');
  await page.waitForFunction(() => location.pathname !== '/login', { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  console.log('   Logged in, URL:', page.url());

  // 3. Visit profile page
  console.log('\n3. Testing profile page...');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  const profileErrors = consoleErrors.filter(e =>
    e.includes('Firebase Auth not initialized')
  );
  console.log('   Profile errors:', profileErrors.length);
  profileErrors.forEach(e => console.log('   !', e));

  // 4. Report
  console.log('\n=== SUMMARY ===');
  const allRelevant = consoleErrors.filter(e =>
    !/ERR_BLOCKED_BY_CLIENT|favicon|preconnect/i.test(e)
  );
  console.log('Total console errors:', consoleErrors.length);
  console.log('Relevant errors:', allRelevant.length);
  allRelevant.slice(0, 5).forEach(e => console.log('  -', e.slice(0, 200)));

  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
