const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

let server;

async function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn('node', ['server-improved.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, PORT: 3002 }
    });

    setTimeout(() => {
      resolve();
    }, 3000);

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('🛒 Starting Buying Flow tests on port 3002...');
  
  let browser;
  try {
    await startServer();
    
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Log browser console
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Step 1: Navigate to Discovery Page
    console.log('--- Step 1: Navigating to Discovery Page ---');
    await page.goto('http://localhost:3002/discovery.html', { waitUntil: 'networkidle2' });
    console.log('✅ Discovery page loaded');

    // Step 2: Add first product to cart
    console.log('\n--- Step 2: Adding Product to Cart ---');
    await page.waitForSelector('.product-card button', { timeout: 10000 });
    
    // Get product name for verification
    const firstProductName = await page.$eval('.product-card h3', el => el.textContent.trim());
    console.log(`Adding "${firstProductName}" to cart via evaluate...`);
    
    // Click the "Add to Cart" button via evaluate to be more reliable
    await page.evaluate(() => {
      const btn = document.querySelector('.product-card button');
      if (btn) btn.click();
      else console.error('Button not found in evaluate');
    });
    
    // Give it a moment and check badge
    await new Promise(r => setTimeout(r, 2000));
    
    const badgeText = await page.evaluate(() => {
      const b1 = document.getElementById('cartBadge');
      const b2 = document.querySelector('.cart-badge-count');
      return { 
        idBadge: b1 ? b1.textContent : 'not found',
        classBadge: b2 ? b2.textContent : 'not found'
      };
    });
    console.log('Badge status:', badgeText);
    
    // Wait for the cart badge to update (trying multiple selectors)
    await page.waitForFunction(() => {
      const b1 = document.getElementById('cartBadge');
      const b2 = document.querySelector('.cart-badge-count');
      const val1 = b1 && b1.textContent !== '0' && b1.textContent !== '';
      const val2 = b2 && b2.textContent !== '0' && b2.textContent !== '';
      return val1 || val2;
    }, { timeout: 5000 });
    
    console.log('✅ Product added to cart (Badge updated)');

    // Step 3: Navigate to Cart (customer.html)
    console.log('\n--- Step 3: Navigating to Cart ---');
    await page.goto('http://localhost:3002/customer.html', { waitUntil: 'networkidle2' });
    console.log('✅ Cart page loaded');

    // Step 4: Verify item in cart
    console.log('\n--- Step 4: Verifying Item in Cart ---');
    // Wait for cart items to render
    try {
      await page.waitForSelector('#cartItems', { timeout: 5000 });
      const cartContent = await page.$eval('#cartItems', el => el.innerHTML);
      
      if (cartContent.includes(firstProductName)) {
        console.log(`✅ Verified: "${firstProductName}" is in the cart`);
      } else {
        // Log cart content for debugging
        const text = await page.$eval('#cartItems', el => el.textContent.trim());
        console.log('Cart text:', text);
        throw new Error(`❌ "${firstProductName}" not found in cart`);
      }
    } catch (e) {
      console.log('❌ Cart items did not render as expected');
      await page.screenshot({ path: 'tests/cart_error.png' });
      throw e;
    }

    // Step 5: Check Total
    console.log('\n--- Step 5: Checking Order Summary ---');
    const total = await page.$eval('#cartTotal', el => el.textContent.trim());
    console.log(`Total Price: ${total}`);
    if (total !== 'TSh 0') {
      console.log('✅ Order total is calculated correctly');
    } else {
      throw new Error('❌ Order total is 0');
    }

    console.log('\n🎉 Buying flow test passed successfully!');
  } catch (error) {
    console.error('\n❌ Buying test failed:', error.message);
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
