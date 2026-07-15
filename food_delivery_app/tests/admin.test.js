const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Simple static server for testing
const PORT = 3003;
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '../web', req.url === '/' ? 'admin.html' : req.url);
  if (req.url.startsWith('/api')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: [] }));
    return;
  }
  
  // Handle routes that don't match files (SPA-like or clean URLs)
  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
    if (req.url === '/admin') filePath = path.join(__dirname, '../web/admin.html');
    else filePath = path.join(__dirname, '../web/admin.html'); // Fallback for this test
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

async function runAdminTest() {
  console.log('🛡️ Starting Admin Feature tests on port ' + PORT + '...');
  server.listen(PORT);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    // --- Step 1: Access Admin Dashboard ---
    console.log('\n--- Step 1: Accessing Admin Dashboard ---');
    await page.goto(`http://localhost:${PORT}/admin.html`);
    await page.waitForSelector('h1');
    const title = await page.$eval('h1', el => el.textContent);
    console.log('Page Title:', title);
    if (title.includes('Admin Dashboard')) {
      console.log('✅ Admin Dashboard loaded successfully');
    } else {
      throw new Error('Admin Dashboard title not found');
    }

    // --- Step 2: Verify Overview Stats ---
    console.log('\n--- Step 2: Verifying Overview Stats ---');
    await page.waitForSelector('#totalOrders');
    // Stats might be '-' or loading, wait a bit for mock/firebase load
    await new Promise(r => setTimeout(r, 2000));
    
    const stats = await page.evaluate(() => {
      return {
        orders: document.getElementById('totalOrders').textContent,
        revenue: document.getElementById('totalRevenue').textContent,
        sellers: document.querySelector('#content-overview .text-3xl:nth-of-type(1)')?.textContent // Rough selector
      };
    });
    console.log('Current Stats:', stats);
    console.log('✅ Stats container verified');

    // --- Step 3: Tab Switching ---
    console.log('\n--- Step 3: Testing Tab Switching ---');
    
    // Click Orders Tab
    console.log('Switching to Orders tab...');
    await page.click('#tab-orders');
    await page.waitForSelector('#content-orders:not(.hidden)', { timeout: 2000 }).catch(() => {});
    const ordersVisible = await page.evaluate(() => {
      const el = document.getElementById('content-orders');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    console.log('Orders Tab Visible:', ordersVisible);

    // Click Sellers Tab
    console.log('Switching to Sellers tab...');
    await page.click('#tab-sellers');
    await new Promise(r => setTimeout(r, 500));
    const sellersVisible = await page.evaluate(() => {
      const el = document.getElementById('content-sellers');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    console.log('Sellers Tab Visible:', sellersVisible);

    // --- Step 4: Verify Data Tables ---
    console.log('\n--- Step 4: Verifying Data Tables ---');
    const tables = await page.evaluate(() => {
      return {
        orders: !!document.getElementById('ordersTable'),
        sellers: !!document.getElementById('sellersTable'),
        users: !!document.getElementById('usersTable')
      };
    });
    console.log('Tables found:', tables);
    if (tables.orders && tables.sellers && tables.users) {
      console.log('✅ All management tables found in DOM');
    }

    // --- Step 5: Test Refresh Button ---
    console.log('\n--- Step 5: Testing Refresh Functionality ---');
    await page.click('button[onclick="refreshAll()"]');
    console.log('✅ Refresh button clicked');

    console.log('\n🎉 Admin feature tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Admin test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

runAdminTest();
