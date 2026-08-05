const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  console.log('Testing Driver Server (port 3000)...');
  try {
    await page.goto('http://localhost:3000/api/health', { waitUntil: 'networkidle0', timeout: 10000 });
    const content = await page.content();
    console.log('  /api/health:', content);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\nTesting Main App Server (port 3000)...');
  try {
    await page.goto('http://localhost:3000/health', { waitUntil: 'networkidle0', timeout: 10000 });
    const content = await page.content();
    console.log('  /health:', content);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\nTesting Login Page...');
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 10000 });
    const title = await page.title();
    console.log('  Title:', title);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\nTesting Customer Home...');
  try {
    await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle0', timeout: 10000 });
    const title = await page.title();
    console.log('  Title:', title);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\nTesting API endpoints...');
  const endpoints = ['/api/health', '/api/config', '/api/categories', '/api/sellers'];
  for (const ep of endpoints) {
    try {
      await page.goto('http://localhost:3000' + ep, { waitUntil: 'networkidle0', timeout: 10000 });
      const content = await page.content();
      console.log(`  ${ep}: OK`);
    } catch (e) {
      console.log(`  ${ep}: FAILED - ${e.message}`);
    }
  }
  
  await browser.close();
  console.log('\n✅ All tests completed');
}

test().catch(console.error);