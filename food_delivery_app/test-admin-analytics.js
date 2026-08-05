const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:3000/login';
const ADMIN_URL = 'http://localhost:3000/admin';

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function runTests() {
  console.log('Starting Admin Analytics Puppeteer Test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  var errors = [];

  page.on('console', function(msg) {
    var text = msg.text();
    if (text.includes('[error]') || text.includes('Error') || text.includes('Failed')) {
      errors.push({ type: 'console', text: text.substring(0, 300) });
      console.log('  CONSOLE:', text.substring(0, 200));
    }
  });

  page.on('pageerror', function(err) {
    errors.push({ type: 'pageerror', text: err.message });
    console.log('  PAGE ERROR:', err.message);
  });

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await delay(3000);

    await page.type('#identity', 'Dd396515@gmail.com');
    await page.type('#password', 'Tanzania101');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin
    await delay(10000);
    console.log('   Current URL:', page.url());
    console.log('   Login attempted, on admin page\n');

    await delay(5000);

    // Step 2: Click Analytics tab
    console.log('2. Clicking Analytics tab...');
    var tabExists = await page.evaluate(function() {
      var tab = document.getElementById('tab-analytics');
      return { exists: !!tab, text: tab ? tab.innerText : '' };
    });
    console.log('   Tab exists:', JSON.stringify(tabExists));

    await page.evaluate(function() {
      document.getElementById('tab-analytics').click();
    });
    await delay(5000);

    // Step 3: Check analytics content
    var contentState = await page.evaluate(function() {
      var content = document.getElementById('content-analytics');
      return {
        contentExists: !!content,
        isHidden: content ? content.classList.contains('hidden') : 'N/A',
        canvases: content ? content.querySelectorAll('canvas').length : 0
      };
    });
    console.log('3. Content state:', JSON.stringify(contentState));

    // Step 4: Check charts
    var chartInfo = await page.evaluate(function() {
      var keys = typeof analyticsCharts !== 'undefined' ? Object.keys(analyticsCharts) : [];
      return {
        analyticsChartsExists: typeof analyticsCharts !== 'undefined',
        keys: keys,
        dailyOrders: keys.indexOf('dailyOrders') >= 0,
        categoryRevenue: keys.indexOf('categoryRevenue') >= 0,
        userGrowth: keys.indexOf('userGrowth') >= 0
      };
    });
    console.log('4. Charts created:', JSON.stringify(chartInfo));

    // Step 5: Check top sellers and products
    var listInfo = await page.evaluate(function() {
      var sellers = document.getElementById('topSellersList');
      var products = document.getElementById('topProductsList');
      return {
        sellersText: sellers ? sellers.innerText.substring(0, 150) : 'NOT_FOUND',
        productsText: products ? products.innerText.substring(0, 150) : 'NOT_FOUND',
        sellersChildren: sellers ? sellers.children.length : 0,
        productsChildren: products ? products.children.length : 0
      };
    });
    console.log('5. Top sellers:', listInfo.sellersText.replace(/\n/g, ' | '));
    console.log('   Top products:', listInfo.productsText.replace(/\n/g, ' | '));

    await page.screenshot({ path: 'test-analytics-tab.png', fullPage: true });
    console.log('\n6. Screenshot: test-analytics-tab.png');

    // Step 7: Switch to Overview and back
    console.log('\n7. Switching to Overview and back...');
    await page.evaluate(function() { var t = document.getElementById('tab-overview'); if (t) t.click(); });
    await delay(3000);
    await page.evaluate(function() { var t = document.getElementById('tab-analytics'); if (t) t.click(); });
    await delay(3000);

    var afterReload = await page.evaluate(function() {
      var keys = typeof analyticsCharts !== 'undefined' ? Object.keys(analyticsCharts) : [];
      return { keys: keys, hasDaily: keys.indexOf('dailyOrders') >= 0 };
    });
    console.log('   After re-switch:', JSON.stringify(afterReload));

    await page.screenshot({ path: 'test-analytics-reload.png', fullPage: true });

    if (errors.length > 0) {
      console.log('\n⚠️ Errors detected:', errors.length);
      errors.forEach(function(e) { console.log('  -', e.type + ':', e.text); });
    } else {
      console.log('\n✅ No errors detected');
    }

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    try { await page.screenshot({ path: 'test-analytics-error.png' }); } catch(e) {}
  } finally {
    await delay(500);
    await browser.close();
  }
}

runTests();
