const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  // Test API endpoints first
  console.log('Testing /api/health...');
  const response = await page.goto('http://localhost:3000/api/health', { waitUntil: 'networkidle2', timeout: 15000 });
  const health = await response.json();
  console.log('Health:', JSON.stringify(health));
  
  console.log('\nTesting /api/config...');
  const configResp = await page.goto('http://localhost:3000/api/config', { waitUntil: 'networkidle2', timeout: 15000 });
  const config = await configResp.json();
  console.log('Config keys:', Object.keys(config));
  
  console.log('\nTesting /api/sellers...');
  const sellersResp = await page.goto('http://localhost:3000/api/sellers', { waitUntil: 'networkidle2', timeout: 15000 });
  const sellers = await sellersResp.json();
  console.log('Sellers count:', sellers.count || sellers.length);
  
  console.log('\nTesting /api/categories...');
  const catsResp = await page.goto('http://localhost:3000/api/categories', { waitUntil: 'networkidle2', timeout: 15000 });
  const cats = await catsResp.json();
  console.log('Categories:', cats.categories ? cats.categories.length : 'N/A');
  
  // Test pages with longer timeout - wait for DOM content loaded
  console.log('\nTesting /customer...');
  await page.goto('http://localhost:3000/customer', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const title = await page.title();
  console.log('Title:', title);
  const content = await page.content();
  console.log('Content length:', content.length);
  
  console.log('\nTesting /driver...');
  await page.goto('http://localhost:3000/driver', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const title2 = await page.title();
  console.log('Title:', title2);
  
  console.log('\nTesting /merchant...');
  await page.goto('http://localhost:3000/merchant', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const title3 = await page.title();
  console.log('Title:', title3);
  
  console.log('\nTesting /admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const title4 = await page.title();
  console.log('Title:', title4);
  
  // Test driver server
  console.log('\nTesting Driver Server (port 3000) /api/health...');
  const driverResp = await page.goto('http://localhost:3000/api/health', { waitUntil: 'networkidle2', timeout: 15000 });
  const driverHealth = await driverResp.json();
  console.log('Driver Health:', JSON.stringify(driverHealth));
  
  await browser.close();
}

test().catch(console.error);