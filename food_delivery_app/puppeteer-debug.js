const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080';
const OUT = 'E:\\Project\\notsmartsoko\\puppeteer-report';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const ACCOUNT = { email: 'dd396515@gmail.com', password: 'Tanzania101', tag: 'dd396515' };

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const consoleErrors = [];
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  // Helper: log & screenshot
  async function snap(name) {
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
    console.log(`   [screenshot] ${name}.png`);
  }

  // ========== 1. LOGIN ==========
  console.log('=== 1. LOGIN ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
  await snap('01-login-page');
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', ACCOUNT.email, { delay: 20 });
  await page.type('#password', ACCOUNT.password, { delay: 10 });
  await snap('02-login-filled');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForFunction(() => location.pathname !== '/login', { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  console.log('   Redirected to:', page.url());
  await snap('03-after-login');

  // ========== 2. HOME PAGE - INTERACT ==========
  console.log('\n=== 2. HOME PAGE INTERACTION ===');
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await snap('04-home');
  console.log('   Title:', await page.title());

  // Try clicking "Start Shopping" button
  const startBtn = await page.$('#btnStartShopping');
  if (startBtn) {
    console.log('   Clicking "Start Shopping"...');
    await startBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    console.log('   URL after click:', page.url());
    await snap('05-after-start-shopping');
  }

  // Try clicking a category card
  const catCards = await page.$$('.category-card');
  if (catCards.length > 0) {
    console.log(`   Clicking category card #1...`);
    await catCards[0].click();
    await new Promise(r => setTimeout(r, 2000));
    console.log('   URL after category click:', page.url());
    await snap('06-after-category-click');
  }

  // ========== 3. SEARCH ==========
  console.log('\n=== 3. SEARCH ===');
  await page.goto(BASE + '/discovery', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('07-discovery');
  const searchInput = await page.$('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]');
  if (searchInput) {
    console.log('   Typing search query...');
    await searchInput.click();
    await searchInput.type('coffee', { delay: 30 });
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));
    console.log('   URL after search:', page.url());
    await snap('08-after-search');
  } else {
    console.log('   No search input found');
  }

  // ========== 4. PRODUCT INTERACTION ==========
  console.log('\n=== 4. PRODUCT & CART ===');
  await page.goto(BASE + '/product', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('09-product-page');

  // Try clicking "Add to Cart" buttons
  const cartBtns = await page.$$('button.cart-btn, button[class*="cart"], [class*="cart-btn"]');
  if (cartBtns.length > 0) {
    console.log(`   Found ${cartBtns.length} cart buttons, clicking first...`);
    await cartBtns[0].click();
    await new Promise(r => setTimeout(r, 1500));
    console.log('   URL after add to cart:', page.url());
    await snap('10-after-add-to-cart');
  }

  // Go to cart page
  console.log('   Navigating to /cart...');
  await page.goto(BASE + '/cart', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('11-cart-page');

  // ========== 5. MERCHANT STORE ==========
  console.log('\n=== 5. MERCHANT STORE ===');
  await page.goto(BASE + '/store', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('12-store-page');

  // Click "Visit Store" link
  const visitLinks = await page.$$('.visit-store, a[href*="store"], a[href*="merchant"]');
  if (visitLinks.length > 0) {
    console.log('   Clicking "Visit Store"...');
    await visitLinks[0].click();
    await new Promise(r => setTimeout(r, 2000));
    await snap('13-after-visit-store');
  }

  // ========== 6. CHECKOUT ==========
  console.log('\n=== 6. CHECKOUT ===');
  await page.goto(BASE + '/checkout', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('14-checkout');

  // ========== 7. PROFILE ==========
  console.log('\n=== 7. PROFILE ===');
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('15-profile');

  // ========== 8. ORDERS ==========
  console.log('\n=== 8. ORDERS ===');
  await page.goto(BASE + '/orders', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('16-orders');

  // ========== 9. WALLET ==========
  console.log('\n=== 9. WALLET ===');
  await page.goto(BASE + '/wallet', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('17-wallet');

  // ========== 10. DRIVER PAGE ==========
  console.log('\n=== 10. DRIVER ===');
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('18-driver');

  // ========== 11. ADMIN PAGE ==========
  console.log('\n=== 11. ADMIN ===');
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await snap('19-admin');

  // ========== REPORT ERRORS ==========
  console.log('\n=== CONSOLE ERRORS ===');
  const filtered = consoleErrors.filter(e => !/ERR_BLOCKED_BY_CLIENT|favicon|preconnect/i.test(e));
  if (filtered.length === 0) {
    console.log('   No relevant console errors');
  } else {
    console.log(`   ${filtered.length} error(s):`);
    filtered.slice(0, 10).forEach(e => console.log('   !', e.slice(0, 250)));
  }

  console.log('\n=== DONE === Browser stays open with DevTools. Inspect freely.');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
