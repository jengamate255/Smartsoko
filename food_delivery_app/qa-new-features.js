const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8080';
const ADMIN = { email: 'dd396515@gmail.com', password: 'Tanzania101', tag: 'admin' };
const MERCHANT = { email: 'pipsr101@gmail.com', password: 'Tanzania101', tag: 'merchant' };
const fs = require('fs');
const OUT = 'E:\\Project\\notsmartsoko\\puppeteer-report';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const findings = [];
function record(f) { findings.push(f); console.log(`\n[${f.severity}] ${f.feature}: ${f.title}\n  Expected: ${f.expected}\n  Actual: ${f.actual}\n  Root: ${f.rootCause}\n  Files: ${f.files}`); }

async function loginToken(browser, account) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#identity', { timeout: 10000 });
  await page.type('#identity', account.email);
  await page.type('#password', account.password);
  await page.click('#loginForm button[type=submit]').catch(() => {});
  await page.waitForFunction(() => window.auth && window.auth.currentUser, { timeout: 30000 }).catch(() => {});
  let token = null;
  for (let i = 0; i < 10 && !token; i++) {
    token = await page.evaluate(async () => {
      try { if (window.auth && window.auth.currentUser) return await window.auth.currentUser.getIdToken(true); } catch (e) {}
      return null;
    });
    if (!token) await new Promise(r => setTimeout(r, 1500));
  }
  // Settle on a stable page so late login-redirect navigations don't destroy the context
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  return { ctx, page, token, consoleErrors };
}

async function api(page, token, method, path, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await page.evaluate(async (method, path, token, body) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 25000);
          const opts = { method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, signal: ctrl.signal };
          if (body !== undefined) opts.body = JSON.stringify(body);
          const resp = await fetch(path, opts);
          clearTimeout(t);
          let data = null; try { data = await resp.json(); } catch (e) {}
          return { status: resp.status, ok: resp.ok, data };
        } catch (e) { return { status: 'ERR', ok: false, error: e.message }; }
      }, method, path, token, body);
    } catch (e) {
      if (attempt === 0) { await new Promise(r => setTimeout(r, 800)); continue; }
      return { status: 'ERR', ok: false, error: e.message };
    }
  }
}

function assert(cond, feature, title, expected, actual, severity, rootCause, files) {
  if (!cond) record({ feature, title, expected, actual, severity, rootCause, files });
  return cond;
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  // ---------- ADMIN SESSION ----------
  const admin = await loginToken(browser, ADMIN);
  const T = admin.token;
  console.log(`\n### ADMIN logged in, token ${T ? 'OK' : 'MISSING'}`);

  // ===== FEATURE 1: Seller Verification (approve/reject) =====
  console.log('\n===== FEATURE 1: Seller Verification =====');
  const sellers = await api(admin.page, T, 'GET', '/api/admin/sellers?limit=50');
  let sellerId = null;
  if (sellers.ok && sellers.data.data && sellers.data.data.length) {
    sellerId = sellers.data.data[0].id;
    console.log(`  Found ${sellers.data.data.length} sellers. First id=${sellerId}`);

    // Approve
    const approve = await api(admin.page, T, 'PUT', '/api/admin/sellers/' + sellerId, { action: 'approve' });
    console.log(`  PUT approve -> ${approve.status}`, approve.data && approve.data.success);
    assert(approve.ok && approve.data.success, 'Seller Verification', 'Approve seller returns success',
      '200 + success:true', `${approve.status} ${approve.data && JSON.stringify(approve.data)}`, 'Critical',
      'Backend approve action', 'server-production.js:2132');

    // Reject
    const reject = await api(admin.page, T, 'PUT', '/api/admin/sellers/' + sellerId, { action: 'reject' });
    console.log(`  PUT reject -> ${reject.status}`, reject.data && reject.data.success);
    assert(reject.ok && reject.data.success, 'Seller Verification', 'Reject seller returns success',
      '200 + success:true', `${reject.status}`, 'Critical', 'Backend reject action', 'server-production.js:2132');

    // Invalid action
    const badAction = await api(admin.page, T, 'PUT', '/api/admin/sellers/' + sellerId, { action: 'frobnicate' });
    console.log(`  PUT invalid action -> ${badAction.status}`);
    assert(badAction.ok && badAction.data.success, 'Seller Verification', 'Invalid action falls back to field update',
      '200 success (falls through to generic update)', `${badAction.status} ${badAction.data && JSON.stringify(badAction.data)}`, 'Low',
      'Unknown action not handled explicitly; treated as generic update', 'server-production.js:2153');

    // Nonexistent seller
    const missing = await api(admin.page, T, 'PUT', '/api/admin/sellers/nonexistent-id-123', { action: 'approve' });
    console.log(`  PUT missing seller -> ${missing.status}`);
    assert(missing.status === 404, 'Seller Verification', 'Missing seller returns 404',
      '404', `${missing.status}`, 'Medium', 'doc.exists check', 'server-production.js:2141');
  } else {
    record({ feature: 'Seller Verification', title: 'No sellers in DB to test', expected: 'sellers present', actual: JSON.stringify(sellers), severity: 'Medium', rootCause: 'Test data', files: 'Firestore sellers collection' });
  }

  // UI: click verification tab and verify table renders
  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('verification'); });
  await new Promise(r => setTimeout(r, 2000));
  const verifUI = await admin.page.evaluate(() => {
    const tbody = document.getElementById('verificationQueue');
    return { hasTable: !!tbody, rows: tbody ? tbody.querySelectorAll('tr').length : 0, hasApproveBtn: !!document.querySelector('[onclick^="verifySeller"]') };
  });
  console.log(`  Verification UI: table=${verifUI.hasTable} rows=${verifUI.rows} approveBtn=${verifUI.hasApproveBtn}`);
  assert(verifUI.hasTable && verifUI.rows > 0, 'Seller Verification', 'Verification tab renders seller rows',
    'table with rows', `rows=${verifUI.rows}`, 'Medium', 'UI render', 'admin.html:1304');

  // ===== FEATURE 2: Admin Settings CRUD =====
  console.log('\n===== FEATURE 2: Admin Settings =====');
  const getSet = await api(admin.page, T, 'GET', '/api/admin/settings');
  console.log(`  GET settings -> ${getSet.status}`);
  assert(getSet.ok && getSet.data.success && getSet.data.data, 'Admin Settings', 'GET settings returns data',
    '200 + data', `${getSet.status}`, 'Critical', 'Settings endpoint', 'server-production.js:2021');

  const origFee = getSet.data.data.commissionRate;
  const newFee = origFee === 15 ? 12 : 15;
  const putSet = await api(admin.page, T, 'PUT', '/api/admin/settings', { commissionRate: newFee, maintenanceMode: true });
  console.log(`  PUT settings commissionRate=${newFee} -> ${putSet.status}`, putSet.data && putSet.data.success);
  assert(putSet.ok && putSet.data.success && putSet.data.data.commissionRate === newFee, 'Admin Settings', 'PUT settings persists value',
    'commissionRate saved', `${putSet.status} ${putSet.data && JSON.stringify(putSet.data.data)}`, 'Critical', 'Settings save', 'server-production.js:2031');

  // Re-GET to confirm persistence
  const getSet2 = await api(admin.page, T, 'GET', '/api/admin/settings');
  assert(getSet2.data.data.commissionRate === newFee, 'Admin Settings', 'Settings persist across GET',
    `commissionRate==${newFee}`, `got ${getSet2.data.data.commissionRate}`, 'High', 'settingsCache/db', 'server-production.js:2008');

  // Invalid input: negative fee
  const negFee = await api(admin.page, T, 'PUT', '/api/admin/settings', { commissionRate: -50 });
  console.log(`  PUT negative commissionRate -> ${negFee.status}`);
  assert(negFee.ok, 'Admin Settings', 'Negative commission rate rejected or handled',
    'validation error or safe default', `${negFee.status} ${negFee.data && JSON.stringify(negFee.data)}`, 'Low',
    'No server-side validation of numeric ranges', 'server-production.js:2031');

  // Restore settings
  await api(admin.page, T, 'PUT', '/api/admin/settings', { commissionRate: origFee, maintenanceMode: false });

  // UI: settings tab
  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('settings'); });
  await new Promise(r => setTimeout(r, 2000));
  const settingsUI = await admin.page.evaluate(() => {
    const form = document.getElementById('settingsForm');
    return { hasForm: !!form, inputs: form ? form.querySelectorAll('input,select').length : 0 };
  });
  console.log(`  Settings UI: form=${settingsUI.hasForm} inputs=${settingsUI.inputs}`);
  assert(settingsUI.hasForm && settingsUI.inputs > 5, 'Admin Settings', 'Settings form renders',
    'form with inputs', `inputs=${settingsUI.inputs}`, 'Medium', 'UI', 'admin.html:1721');

  // ===== FEATURE 3: Finance / Reports =====
  console.log('\n===== FEATURE 3: Finance / Reports =====');
  const reports = await api(admin.page, T, 'GET', '/api/admin/reports?period=7d');
  console.log(`  GET reports -> ${reports.status}`);
  assert(reports.ok && reports.data.success && reports.data.data.orders, 'Finance/Reports', 'Reports endpoint returns orders',
    '200 + data.orders', `${reports.status}`, 'High', 'Reports endpoint', 'server-production.js:2062');

  // finance UI
  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('finance'); });
  await new Promise(r => setTimeout(r, 2000));
  const finUI = await admin.page.evaluate(() => ({
    payout: document.getElementById('financeTotalPayouts') ? document.getElementById('financeTotalPayouts').textContent : null,
    fee: document.getElementById('financePlatformFee') ? document.getElementById('financePlatformFee').textContent : null,
    table: !!document.getElementById('financeTable')
  }));
  console.log(`  Finance UI: payout=${finUI.payout} fee=${finUI.fee} table=${finUI.table}`);
  assert(finUI.table, 'Finance/Reports', 'Finance settlements table renders', 'table present', `table=${finUI.table}`, 'Medium', 'UI', 'admin.html:1346');

  // ===== FEATURE 4: Audit Logs =====
  console.log('\n===== FEATURE 4: Audit Logs =====');
  const audit = await api(admin.page, T, 'GET', '/api/admin/audit?limit=200');
  console.log(`  GET audit -> ${audit.status} count=${audit.data && audit.data.count}`);
  assert(audit.ok && audit.data.success && Array.isArray(audit.data.data), 'Audit Logs', 'Audit endpoint returns array',
    '200 + array', `${audit.status}`, 'High', 'Audit endpoint', 'server-production.js:1990');
  // Our settings change should appear
  const hasSettingsAudit = audit.data.data.some(e => (e.action || '').includes('settings'));
  console.log(`  settings_update present in audit: ${hasSettingsAudit}`);
  assert(hasSettingsAudit, 'Audit Logs', 'Settings change is audited', 'audit entry for settings_update', `found=${hasSettingsAudit}`, 'Medium', 'logAudit call', 'server-production.js:2041');

  // audit UI
  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('audit'); });
  await new Promise(r => setTimeout(r, 1500));
  const auditUI = await admin.page.evaluate(() => { const t = document.getElementById('auditLogs'); return { has: !!t, rows: t ? t.querySelectorAll('tr').length : 0 }; });
  console.log(`  Audit UI: rows=${auditUI.rows}`);

  // ===== FEATURE 5: Riders / Logistics =====
  console.log('\n===== FEATURE 5: Riders / Logistics =====');
  const riders = await api(admin.page, T, 'GET', '/api/riders');
  console.log(`  GET riders -> ${riders.status} count=${riders.data && riders.data.count}`);
  assert(riders.ok && riders.data.success, 'Riders/Logistics', 'Riders endpoint returns success',
    '200', `${riders.status}`, 'High', 'Riders endpoint', 'server-production.js:/api/riders');

  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('logistics'); });
  await new Promise(r => setTimeout(r, 2500));
  const logUI = await admin.page.evaluate(() => ({
    drivers: document.getElementById('activeDriversCount') ? document.getElementById('activeDriversCount').textContent : null,
    pending: document.getElementById('pendingOrdersCount') ? document.getElementById('pendingOrdersCount').textContent : null,
    driverList: !!document.getElementById('driversList')
  }));
  console.log(`  Logistics UI: activeDrivers=${logUI.drivers} pending=${logUI.pending} driverList=${logUI.driverList}`);
  assert(logUI.driverList, 'Riders/Logistics', 'Logistics driver list renders', 'list present', `driverList=${logUI.driverList}`, 'Medium', 'UI', 'admin.html:1858');

  // ===== FEATURE 6: Analytics =====
  console.log('\n===== FEATURE 6: Analytics Charts =====');
  await admin.page.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
  await admin.page.evaluate(() => { if (typeof switchTab === 'function') switchTab('analytics'); });
  await new Promise(r => setTimeout(r, 3000));
  const analyticsUI = await admin.page.evaluate(() => ({ chart: !!document.getElementById('dailyOrdersChart'), hasCanvas: !!document.querySelector('#dailyOrdersChart') }));
  console.log(`  Analytics UI: dailyOrdersChart=${analyticsUI.chart}`);

  // Verify our earlier bug (analytics 500) stays fixed via vendor analytics too
  const vendorAnalytics = await api(admin.page, T, 'GET', '/api/vendor/analytics?days=7');
  assert(vendorAnalytics.ok && vendorAnalytics.data.success, 'Vendor Analytics', 'Vendor analytics returns 200 (regression check)',
    '200', `${vendorAnalytics.status}`, 'High', 'fallback fix', 'server-production.js:1072');

  // ===== PERMISSION TESTS (merchant should be blocked) =====
  console.log('\n===== PERMISSION TESTS (merchant) =====');
  const merch = await loginToken(browser, MERCHANT);
  const MT = merch.token;
  for (const path of ['/api/admin/settings', '/api/admin/audit', '/api/admin/sellers', '/api/admin/reports']) {
    const r = await api(merch.page, MT, 'GET', path);
    console.log(`  merchant GET ${path} -> ${r.status}`);
    assert(r.status === 403, 'Permissions', `Merchant blocked from ${path}`, '403', `${r.status}`, 'High', 'requireRole admin', 'server-production.js');
  }
  const merchPutSettings = await api(merch.page, MT, 'PUT', '/api/admin/settings', { commissionRate: 99 });
  console.log(`  merchant PUT settings -> ${merchPutSettings.status}`);
  assert(merchPutSettings.status === 403, 'Permissions', 'Merchant cannot modify settings', '403', `${merchPutSettings.status}`, 'High', 'requireRole admin', 'server-production.js:2031');

  // ===== Console errors summary =====
  console.log('\n===== ADMIN console errors =====');
  const realErrors = admin.consoleErrors.filter(e => !/ERR_SSL_PROTOCOL|net::ERR|favicon|Failed to load resource.*(css|js|fonts|mapbox|supabase)/.test(e));
  console.log(`  total console errors: ${admin.consoleErrors.length}, app-relevant: ${realErrors.length}`);
  realErrors.slice(0, 10).forEach(e => console.log('   ! ' + e.slice(0, 160)));

  await admin.ctx.close();
  await merch.ctx.close();
  await browser.close();

  fs.writeFileSync(`${OUT}\\qa-findings.json`, JSON.stringify(findings, null, 2));
  console.log(`\n===== QA COMPLETE: ${findings.length} findings =====`);
  console.log(`Findings written to ${OUT}\\qa-findings.json`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
