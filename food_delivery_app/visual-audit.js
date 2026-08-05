const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const routes = ['/login', '/home', '/driver', '/merchant', '/cart', '/discovery', '/product'];
  const report = {};

  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const logs = { console: [], js: [] };
    page.on('console', msg => logs.console.push(msg.type() + ': ' + msg.text().substring(0, 200)));
    page.on('pageerror', err => logs.js.push(err.message));

    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://fonts.') || url.startsWith('https://fonts.') ||
          url.includes('googleapis.com') || url.includes('gstatic.com') ||
          url.includes('unpkg.com') || url.includes('images.unsplash.com') ||
          url.includes('stadiamaps.com')) {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });

    try {
      await page.goto('http://localhost:8080' + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2500));

      const info = await page.evaluate(() => {
        return {
          title: document.title,
          height: document.documentElement.scrollHeight,
          width: document.documentElement.scrollWidth,
          bodyHeight: document.body.scrollHeight,
          overflowY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          totalImages: Array.from(document.images).length,
          imagesLoaded: Array.from(document.images).filter(img => img.complete && img.naturalHeight > 0).length,
          brokenImages: Array.from(document.images).filter(img => img.complete && img.naturalHeight === 0).length,
          brokenLinks: Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href !== 'javascript:void(0)' && !a.href.startsWith('http')).length,
          totalLinks: Array.from(document.querySelectorAll('a')).length,
          scriptErrors: window.scriptErrors || 0,
          consoleErrors: window.consoleErrorCount || 0
        };
      });

      report[route] = { info, console: logs.console.slice(0, 10), jsErrors: logs.js.slice(0, 5) };
    } catch (e) {
      report[route] = { error: e.message };
    }
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('ui-visual-audit.json', JSON.stringify(report, null, 2));
  console.log('VISUAL AUDIT -> ui-visual-audit.json');

  console.log('\n===== VISUAL AUDIT SUMMARY =====\n');
  const issues = [];
  for (const [route, data] of Object.entries(report)) {
    if (data.error) { 
      console.log(`${route}: ERROR - ${data.error}`); 
      issues.push({ page: route, type: 'ERROR', message: data.error }); 
      continue; 
    }
    const i = data.info;
    if (i.overflowY) issues.push({ page: route, type: 'HEIGHT', message: `Body height ${i.bodyHeight}px (overflowY: true)` });
    if (i.brokenImages > 0) issues.push({ page: route, type: 'IMAGES', message: `${i.brokenImages} broken images (${i.imagesLoaded}/${i.totalImages} loaded)` });
    if (i.consoleErrors > 0) issues.push({ page: route, type: 'CONSOLE', message: `${i.consoleErrors} console errors` });
    if (data.jsErrors && data.jsErrors.length > 0) issues.push({ page: route, type: 'JS', message: `${data.jsErrors.length} JS errors: ${data.jsErrors.join(' | ')}` });
  }

  if (issues.length === 0) {
    console.log('✅ NO ISSUES FOUND! All pages are visually healthy.');
    console.log('\nPage Health Summary:');
    for (const [route, data] of Object.entries(report)) {
      if (data.error) continue;
      const i = data.info;
      console.log(`${route}: ${i.imagesLoaded}/${i.totalImages} images ✓ Height: ${i.overflowY ? 'OVERFLOW' : 'OK'} ✓`);
    }
  } else {
    console.log('\n❌ ISSUES FOUND - Details:');
    issues.forEach(issue => {
      console.log(`${issue.page}: ${issue.type} - ${issue.message}`);
    });
    console.log(`\nTotal Issues: ${issues.length}`);
  }
})();