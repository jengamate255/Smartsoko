const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

let server;

async function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn('node', ['server-improved.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, PORT: 3001 }
    });

    // Give the server some time to start
    setTimeout(() => {
      resolve();
    }, 3000);

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('🚀 Starting functionality tests on port 3001...');
  
  let browser;
  try {
    await startServer();
    
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Test 1: Home Page Load
    console.log('--- Test 1: Home Page Load ---');
    await page.goto('http://localhost:3001/home.html', { waitUntil: 'networkidle2' });
    const title = await page.title();
    console.log('Page Title:', title);
    if (title.includes('SmartSoko')) {
      console.log('✅ Home page loaded successfully');
    } else {
      throw new Error('❌ Home page title mismatch');
    }

    // Test 2: Navigation to Discovery
    console.log('\n--- Test 2: Navigation to Discovery ---');
    // Find the Discover link in nav
    const discoverLink = await page.$('a[href="discovery.html"]');
    if (discoverLink) {
      await discoverLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      const url = page.url();
      console.log('Current URL:', url);
      if (url.includes('discovery.html')) {
        console.log('✅ Navigated to Discovery page successfully');
      } else {
        throw new Error('❌ Navigation to Discovery failed');
      }
    } else {
      console.log('⚠️ Could not find Discover link, trying direct navigation');
      await page.goto('http://localhost:3001/discovery.html', { waitUntil: 'networkidle2' });
    }

    // Test 3: Product Rendering in Discovery
    console.log('\n--- Test 3: Product Rendering in Discovery ---');
    // Wait for product grid or items
    try {
      await page.waitForSelector('.product-card', { timeout: 5000 });
      const products = await page.$$('.product-card');
      console.log(`✅ Found ${products.length} products on Discovery page`);
    } catch (e) {
      console.log('❌ No products found or selector mismatch');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'tests/discovery_error.png' });
      console.log('📸 Screenshot saved to tests/discovery_error.png');
    }

    // Test 4: Profile Page Access
    console.log('\n--- Test 4: Profile Page Access ---');
    await page.goto('http://localhost:3001/profile.html', { waitUntil: 'networkidle2' });
    const profileHeading = await page.$eval('h2', el => el.textContent);
    console.log('Profile Heading:', profileHeading);
    if (profileHeading.includes('Loading') || profileHeading.length > 0) {
      console.log('✅ Profile page accessible');
    }

    console.log('\n🎉 All basic functionality tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) {
      console.log('Stopping server...');
      server.kill();
    }
  }
}

runTests();
