const puppeteer = require('puppeteer');

const BASE = 'http://localhost:3000';
const ACCOUNT = { email: 'sim.merchant.1784116878487@smartsoko.test', password: 'SimPass#2024', tag: 'merchant' };
const OUT = 'E:\\Project\\notsmartsoko\\puppeteer-report';
const fs = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function login(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', ACCOUNT.email);
  await page.type('#password', ACCOUNT.password);

  await Promise.all([
    page.click('#loginForm button[type="submit"]').catch(() => {}),
  ]);

  try {
    await page.waitForFunction(
      () => location.pathname !== '/login' && location.pathname !== '/',
      { timeout: 20000 }
    ).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
  } catch (e) {}

  const url = page.url();
  const stillLogin = await page.$('#identity');
  return { url, loggedIn: !stillLogin, errors };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Logging in...');
  const loginResult = await login(page);
  console.log(`Login redirected to: ${loginResult.url}`);
  console.log(`Logged in: ${loginResult.loggedIn}`);
  if (loginResult.errors.length) {
    console.log('Login errors:', loginResult.errors);
  }

  // Navigate to merchant page
  console.log('\nNavigating to /merchant...');
  const pe = [];
  page.on('console', m => { if (m.type() === 'error') pe.push(m.text()); });
  page.on('pageerror', e => pe.push('PAGEERROR: ' + e.message));

  try {
    const resp = await page.goto(BASE + '/merchant', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`Status: ${resp ? resp.status() : 'no-resp'}`);
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  const title = await page.title().catch(() => '');
  console.log(`Page title: ${title}`);

  // Take screenshots - disabled due to disk space
  // await page.screenshot({ path: `${OUT}\\merchant-full.png`, fullPage: true });
  // await page.screenshot({ path: `${OUT}\\merchant-viewport.png`, fullPage: false });
  // console.log('Screenshots saved to', OUT);

  // Dump DOM structure
  const html = await page.content();
  fs.writeFileSync(`${OUT}\\merchant-page.html`, html);
  console.log('Full HTML saved to merchant-page.html');

  // Inspect specific elements
  const merchantElements = await page.evaluate(() => {
    const result = {};
    
    // Main containers
    result.bodyClass = document.body.className;
    result.mainContent = document.querySelector('main, [role="main"], .main-content, #main-content, .container, .page-content')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    
    // Navigation
    result.nav = document.querySelector('nav, .navbar, .navigation, header')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    
    // Merchant specific elements - UPDATED SELECTORS based on actual HTML
    result.merchantHeader = document.querySelector('header')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    result.merchantStats = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-4.mb-8')?.outerHTML?.slice(0, 500) || 
      document.querySelector('#todaySales, #activeOrdersCount, #totalVisitors')?.closest('.bg-white')?.parentElement?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    result.merchantOrders = document.querySelector('#recentOrdersTable')?.closest('table')?.outerHTML?.slice(0, 500) || 
      document.querySelector('table[id*="order"], .orders, .order-list, .merchant-orders, #orders-table, table')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    result.merchantProducts = document.querySelector('[id*="product"], .products, .product-list, .merchant-products, #products-table, [href*="inventory"]')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    result.merchantMenu = document.querySelector('[id*="menu"], .menu, .category-list, .merchant-menu, [href*="menu"]')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    result.promoCards = document.querySelector('.lg\\:col-span-2 + .flex, .promo, .milestone, .tier-progress')?.outerHTML?.slice(0, 500) || 'NOT FOUND';
    
    // Metric cards - individual
    result.metricCards = {
      todaySales: document.getElementById('todaySales')?.outerHTML || 'NOT FOUND',
      activeOrdersCount: document.getElementById('activeOrdersCount')?.outerHTML || 'NOT FOUND',
      totalVisitors: document.getElementById('totalVisitors')?.outerHTML || 'NOT FOUND',
    };
    
    // Sidebar elements
    result.sidebar = {
      merchantName: document.getElementById('sidebarMerchantName')?.outerHTML || 'NOT FOUND',
      topbarMerchantName: document.getElementById('topbarMerchantName')?.outerHTML || 'NOT FOUND',
      topbarTier: document.getElementById('topbarTier')?.outerHTML || 'NOT FOUND',
      greetingMerchant: document.getElementById('greetingMerchant')?.outerHTML || 'NOT FOUND',
    };
    
    // Forms and buttons
    result.buttons = Array.from(document.querySelectorAll('button, a.btn, .btn')).slice(0, 20).map(el => ({
      text: el.textContent?.trim().slice(0, 50),
      class: el.className,
      id: el.id,
      type: el.type
    }));
    
    // Forms
    result.forms = Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      class: f.className,
      action: f.action,
      method: f.method,
      inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        id: i.id
      }))
    }));
    
    // Tables
    result.tables = Array.from(document.querySelectorAll('table')).map(t => ({
      id: t.id,
      class: t.className,
      headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()),
      rowCount: t.querySelectorAll('tbody tr').length
    }));
    
    // Scripts and data
    result.scripts = Array.from(document.querySelectorAll('script')).slice(0, 10).map(s => ({
      src: s.src,
      inline: s.innerHTML?.slice(0, 200)
    }));
    
    // Local storage / session storage
    result.localStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('merchant') || key.includes('vendor') || key.includes('seller') || key.includes('token') || key.includes('auth'))) {
        result.localStorage[key] = localStorage.getItem(key).slice(0, 100);
      }
    }
    
    return result;
  });

  console.log('\n=== MERCHANT PAGE INSPECTION ===');
  console.log(JSON.stringify(merchantElements, null, 2));
  fs.writeFileSync(`${OUT}\\merchant-inspection.json`, JSON.stringify(merchantElements, null, 2));
  console.log('\nInspection JSON saved to merchant-inspection.json');

  // Console errors
  if (pe.length) {
    console.log('\n=== CONSOLE ERRORS ===');
    pe.forEach(e => console.log('  !', e.slice(0, 300)));
  }

  await browser.close();
  console.log('\nDone!');
})().catch(e => { console.error('FATAL', e); process.exit(1); });