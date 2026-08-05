const puppeteer = require('puppeteer');

async function checkPage(page, path, name, timeout = 60000) {
  console.log(`\n=== Checking ${name} (${path}) ===`);
  const errors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({ type: 'console', text: msg.text() });
  });
  page.on('pageerror', err => errors.push({ type: 'pageerror', text: err.message }));
  page.on('response', resp => {
    if (resp.status() >= 400 && resp.url().includes('/api/')) networkErrors.push({ url: resp.url(), status: resp.status() });
  });

  try {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle0', timeout });
    await new Promise(r => setTimeout(r, 5000));
    const url = page.url();
    console.log(`URL: ${url}`);
    if (errors.length > 0) {
      console.log('ERRORS:');
      errors.forEach(e => console.log(`  [${e.type}] ${e.text}`));
    } else {
      console.log('No console/page errors');
    }
    if (networkErrors.length > 0) {
      console.log('NETWORK ERRORS:');
      networkErrors.forEach(e => console.log(`  ${e.status} ${e.url}`));
    } else {
      console.log('No network errors');
    }
    return { errors, networkErrors };
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    return { errors: [{ type: 'navigation', text: e.message }], networkErrors: [] };
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Login as admin
  console.log('=== Logging in as admin ===');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.type('#identity', 'Dd396515@gmail.com');
  await page.type('#password', 'Tanzania101');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 8000));
  console.log('Login URL:', page.url());

  const results = {};
  for (const p of [
    { url: '/admin', name: 'Admin', timeout: 90000 },
    { url: '/merchant', name: 'Merchant', timeout: 60000 },
    { url: '/driver', name: 'Driver', timeout: 60000 },
  ]) {
    results[p.name] = await checkPage(page, p.url, p.name, p.timeout);
  }

  console.log('\n\n=== SUMMARY ===');
  for (const [name, result] of Object.entries(results)) {
    const totalErrors = result.errors.length + result.networkErrors.length;
    console.log(`${name}: ${totalErrors === 0 ? '✅ OK' : `❌ ${totalErrors} errors`}`);
  }

  await browser.close();
})().catch(e => console.error('FAIL:', e.message));