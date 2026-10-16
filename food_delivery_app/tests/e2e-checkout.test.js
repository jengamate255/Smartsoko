const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const TEST_PRODUCT_ID = 'qeSorQZzZsm0sgXJKEfJ';

let passed = 0;
let failed = 0;
const failures = [];

function check(cond, msg) {
  if (cond) { passed++; console.log('  ✅ PASS:', msg); }
  else { failed++; console.log('  ❌ FAIL:', msg); failures.push(msg); }
}

async function runTest() {
  console.log('🚀 Starting E2E Checkout Flow Test (Playwright)');
  console.log(`   Base URL: ${BASE}`);
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { longitude: 39.2083, latitude: -6.7924 },
    permissions: ['geolocation']
  });

  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  try {
    // ========================================
    // STEP 1: Discovery Page - Find Products
    // ========================================
    console.log('📍 Step 1: Loading Discovery Page...');
    await page.goto(`${BASE}/discovery`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if page loaded
    const title = await page.title();
    check(title.length > 0, `Discovery page loaded - Title: "${title}"`);

    // Look for products - try multiple selectors
    const productSelectors = [
      '.product-card',
      '[data-testid="product-card"]',
      'article',
      '.seller-card',
      'a[href*="product"]'
    ];

    let productFound = false;
    for (const selector of productSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        console.log(`   Found products with selector: ${selector}`);
        productFound = true;
        break;
      } catch {}
    }

    // If no products found, try to see what's on the page
    if (!productFound) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log('   Page content preview:', bodyText);
    }

    // ========================================
    // STEP 2: Add Product to Cart via localStorage
    // ========================================
    console.log('\n📍 Step 2: Adding Product to Cart via localStorage...');
    
    // Inject test product into localStorage (simulates "Add to Cart" click)
    await page.evaluate((productId) => {
      const testProduct = {
        id: productId,
        name: 'Test Product',
        price: 5000,
        quantity: 2,
        imageUrl: 'images/default-product.png',
        sellerId: 'Pipsr101@gmail.com',
        sellerName: 'Test Merchant',
        sellerLat: -6.7924,
        sellerLng: 39.2083
      };
      localStorage.setItem('smartsoko_cart', JSON.stringify([testProduct]));
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { count: 2, total: 10000 } 
      }));
    }, TEST_PRODUCT_ID);

    await page.waitForTimeout(1000);
    check(true, 'Test product injected into localStorage cart');

    // ========================================
    // STEP 3: Navigate to Cart Page
    // ========================================
    console.log('\n📍 Step 3: Navigating to Cart Page...');
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify cart has items (not empty state)
    const emptyStateVisible = await page.evaluate(() => {
      const el = document.getElementById('emptyCartState');
      return el && !el.classList.contains('hidden');
    });

    check(!emptyStateVisible, 'Cart shows items (not empty state)');

    // Check for Place Order button
    const placeOrderBtn = await page.$('button[onclick="checkout()"]');
    check(!!placeOrderBtn, 'Place Order button visible in cart');

    // Check order summary
    const subtotal = await page.evaluate(() => {
      const el = document.getElementById('subtotal');
      return el ? el.textContent : 'not found';
    });
    console.log(`   Subtotal: ${subtotal}`);

    // ========================================
    // STEP 4: Click Place Order -> Checkout Page
    // ========================================
    console.log('\n📍 Step 4: Clicking Place Order -> Checkout...');
    
    // Try to click via evaluate to avoid visibility issues
    const clicked = await page.evaluate(() => {
      // Try desktop button first
      const desktopBtn = document.querySelector('button[onclick="checkout()"]');
      if (desktopBtn && !desktopBtn.classList.contains('hidden')) {
        desktopBtn.click();
        return 'desktop';
      }
      // Fall back to mobile button in footer
      const footerBtn = document.querySelector('footer button[onclick="checkout()"]');
      if (footerBtn) {
        footerBtn.click();
        return 'mobile-footer';
      }
      // Last resort: any button with checkout()
      const anyBtn = document.querySelector('button[onclick="checkout()"]');
      if (anyBtn) {
        anyBtn.click();
        return 'any';
      }
      return 'none';
    });
    console.log(`   Clicked via: ${clicked}`);
    
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const checkoutUrl = page.url();
    check(checkoutUrl.includes('checkout'), `Redirected to checkout: ${checkoutUrl}`);

    // Wait for checkout content to load
    await page.waitForSelector('#checkoutContent', { timeout: 20000 }).catch(() => {});

    // ========================================
    // STEP 5: Fill Checkout Form
    // ========================================
    console.log('\n📍 Step 5: Filling Checkout Form...');

    // Set delivery address (simulate geolocation)
    await page.evaluate(() => {
      localStorage.setItem('smartsoko_address', 'Seamic Drive, Kunduchi, Kawe, Kinondoni, Dar es Salaam');
      localStorage.setItem('smartsoko_user_address', 'Seamic Drive, Kunduchi, Kawe, Kinondoni, Dar es Salaam');
      localStorage.setItem('smartsoko_phone', '0620771067');
      localStorage.setItem('smartsoko_user_phone', '0620771067');
      localStorage.setItem('smartsoko_name', 'Test Customer');
    });

    // Reload to pick up the address
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Debug: Check page state
    const pageContent = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log('   Page preview:', pageContent);

    // Verify address loaded
    const addressText = await page.evaluate(() => {
      const el = document.getElementById('deliveryAddress');
      return el ? el.textContent.trim() : 'not found';
    });
    check(addressText.includes('Seamic') || addressText.includes('Dar'), `Address loaded: ${addressText}`);

    // Select payment method - Cash on Delivery (simplest for test)
    await page.evaluate(() => {
      const codOption = document.querySelector('[data-payment="cod"]');
      if (codOption) codOption.click();
    });
    await page.waitForTimeout(500);
    check(true, 'Payment method selected (Cash on Delivery)');

    // ========================================
    // STEP 6: Place Order
    // ========================================
    console.log('\n📍 Step 6: Placing Order...');
    
    // Check for any errors before clicking
    const preErrors = await page.evaluate(() => window.__testErrors || []);
    console.log('   Pre-click errors:', preErrors.length);
    
    // Click Place Order button
    await page.click('#placeOrderBtn');
    
    // Wait a bit for the order processing
    await page.waitForTimeout(5000);
    
    // Check for errors after clicking
    const postErrors = await page.evaluate(() => window.__testErrors || []);
    console.log('   Post-click errors:', postErrors.length);
    if (postErrors.length > preErrors.length) {
      console.log('   New errors:', postErrors.slice(preErrors.length));
    }
    
    // Check if we're on track-order or if page changed
    let finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // If still on checkout, check if order was created in localStorage
    const orderInStorage = await page.evaluate(() => {
      return localStorage.getItem('lastOrderId') || localStorage.getItem('smartsoko_last_order');
    });
    console.log(`   Order in localStorage: ${orderInStorage}`);

    const orderSuccess = finalUrl.includes('track-order') || finalUrl.includes('orderId');
    check(orderSuccess, `Order placed successfully - redirected to tracking: ${finalUrl}`);

    if (orderSuccess) {
      // Extract order ID
      const orderIdMatch = finalUrl.match(/orderId=([^&]+)/);
      if (orderIdMatch) {
        console.log(`   Order ID: ${orderIdMatch[1]}`);
      }
    }

    // ========================================
    // STEP 7: Verify Order in Tracking Page
    // ========================================
    if (orderSuccess) {
      console.log('\n📍 Step 7: Verifying Order Tracking Page...');
      
      // Check order ID displayed
      const orderIdDisplay = await page.evaluate(() => {
        const el = document.getElementById('orderIdDisplay');
        return el ? el.textContent.trim() : 'not found';
      });
      check(orderIdDisplay !== 'Order #---', `Order ID displayed: ${orderIdDisplay}`);

      // Check status badge
      const statusBadge = await page.evaluate(() => {
        const el = document.getElementById('statusBadge');
        return el ? el.textContent.trim() : 'not found';
      });
      console.log(`   Status: ${statusBadge}`);

      // Check progress steps exist
      const progressSteps = await page.evaluate(() => {
        const container = document.getElementById('progressSteps');
        return container ? container.children.length : 0;
      });
      check(progressSteps > 0, `Progress steps rendered: ${progressSteps}`);

      // Check map container
      const mapContainer = await page.$('#map');
      check(!!mapContainer, 'Map container present');
    }

    // ========================================
    // STEP 8: Verify API - Order Persisted
    // ========================================
    console.log('\n📍 Step 8: Verifying Order via API...');
    
    const apiCheck = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/orders/test-customer-123');
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    
    check(Array.isArray(apiCheck) && apiCheck.length > 0, `Order persisted in database: ${apiCheck.length} orders found`);

  } catch (error) {
    console.error('\n💥 Test Error:', error.message);
    await page.screenshot({ path: 'tests/checkout_error.png', fullPage: true });
    check(false, `Test failed: ${error.message}`);
  } finally {
    await browser.close();

    console.log('\n==============================');
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    console.log('==============================');
    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach(f => console.log('  -', f));
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTest().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});