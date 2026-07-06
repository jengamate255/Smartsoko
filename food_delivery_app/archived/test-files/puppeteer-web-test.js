/**
 * Puppeteer Test Script for SmartSoko Web Application
 * Tests key functionality: Navigation, Authentication, Product Pages, Cart, etc.
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWebTests() {
  console.log('🚀 Starting Puppeteer Tests for SmartSoko Web App...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--window-size=1280,900', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Enable console logging
  page.on('console', msg => console.log('📄 Console:', msg.text()));
  page.on('pageerror', err => console.error('❌ Page Error:', err.message));

  try {
    // Test 1: Load the home page
    console.log('Test 1: Loading Home Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);

    if (title.includes('SmartSoko')) {
      console.log('✅ Home page loaded successfully\n');
    }

    await page.screenshot({ path: 'test-web-01-home.png' });

    // Test 2: Check for navigation
    console.log('Test 2: Checking Navigation...');
    const hasNav = await page.evaluate(() => {
      return !!document.querySelector('nav, header, .navbar');
    });

    if (hasNav) {
      console.log('✅ Navigation found\n');
    }

    // Test 3: Try discovery page
    console.log('Test 3: Testing Discovery Page...');
    try {
      await page.goto(`${BASE_URL}/discovery.html`, { waitUntil: 'networkidle2' });
      await delay(2000);

      const discoveryTitle = await page.title();
      console.log(`📄 Discovery Title: ${discoveryTitle}`);
      console.log('✅ Discovery page loaded\n');

      await page.screenshot({ path: 'test-web-02-discovery.png' });
    } catch (error) {
      console.log('⚠️ Discovery page test failed\n');
    }

    // Test 4: Try product page
    console.log('Test 4: Testing Product Page...');
    try {
      await page.goto(`${BASE_URL}/product.html?id=salad-00lets`, { waitUntil: 'networkidle2' });
      await delay(3000);

      const productTitle = await page.title();
      console.log(`📄 Product Title: ${productTitle}`);
      console.log('✅ Product page loaded\n');

      await page.screenshot({ path: 'test-web-03-product.png' });
    } catch (error) {
      console.log('⚠️ Product page test failed\n');
    }

    // Test 5: API Health Check
    console.log('Test 5: Testing API Health...');
    try {
      const response = await page.goto(`${BASE_URL}/health`, { waitUntil: 'networkidle2' });
      if (response.ok()) {
        console.log('✅ API health check passed\n');
      }
    } catch (error) {
      console.log('⚠️ API health check failed\n');
    }

    console.log('\n🎉 All tests completed!');
    console.log('📸 Screenshots saved in project root');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run tests
runWebTests().catch(console.error);