const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const routes = ['/login', '/home', '/driver', '/merchant', '/admin', '/cart', '/customer', '/discovery', '/product', '/supplier'];
  const report = {};

  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const logs = { console: [], errors: [], js: [] };
    page.on('console', msg => logs.console.push(msg.type() + ': ' + msg.text().substring(0, 200)));
    page.on('pageerror', err => logs.js.push(err.message));
    page.on('response', resp => { if (resp.status() >= 400) logs.errors.push(resp.status() + ' ' + resp.url()); });

    try {
      await page.goto('http://localhost:8080' + route, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 1000));

      const info = await page.evaluate(() => {
        const doc = document;
        const body = doc.body;
        const style = getComputedStyle(body) || {};
        return {
          title: doc.title,
          metaViewport: (doc.querySelector('meta[name=viewport]') || {}).content || '',
          bodyClasses: body.className,
          links: Array.from(doc.querySelectorAll('link[rel=stylesheet]')).map(l => l.href),
          scripts: Array.from(doc.querySelectorAll('script[src]')).map(s => s.src),
          mainNav: doc.querySelector('nav, header, .navbar, .nav, .header') ? 'YES' : 'NO',
          hasFooter: doc.querySelector('footer, .footer') ? 'YES' : 'NO',
          headings: Array.from(doc.querySelectorAll('h1,h2,h3')).map(h => h.tagName + ': ' + (h.textContent || '').trim().substring(0, 80)),
          buttons: doc.querySelectorAll('button, .btn, [role=button]').length,
          inputs: doc.querySelectorAll('input, select, textarea').length,
          images: Array.from(doc.querySelectorAll('img')).map(i => ({ src: i.src.substring(0, 80), alt: !!i.alt, w: i.width, h: i.height })),
          cards: doc.querySelectorAll('.card, [class*=card], [class*=product], [class*=item]').length,
          overflowX: doc.documentElement.scrollWidth > doc.documentElement.clientWidth,
          overflowY: doc.documentElement.scrollHeight > doc.documentElement.clientHeight,
          bodyFont: style.fontFamily || '',
          bodyColor: style.color || '',
          bodyBg: style.backgroundColor || ''
        };
      });

      report[route] = { info, console: logs.console.slice(0, 20), errors: logs.errors, jsErrors: logs.js.slice(0, 10) };
    } catch (e) {
      report[route] = { error: e.message };
    }
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('ui-audit.json', JSON.stringify(report, null, 2));
  console.log('Audit complete -> ui-audit.json');

  // Print summary
  for (const [route, data] of Object.entries(report)) {
    console.log('\n===', route, '===');
    if (data.error) { console.log('  ERROR:', data.error); continue; }
    const i = data.info;
    console.log('  Title:', i.title);
    console.log('  Nav:', i.mainNav, '| Footer:', i.hasFooter, '| OverflowX:', i.overflowX);
    console.log('  Headings:', i.headings.length, '| Buttons:', i.buttons, '| Inputs:', i.inputs, '| Cards:', i.cards);
    console.log('  Console errors:', data.errors.length, '| JS errors:', data.jsErrors.length);
    if (data.errors.length) console.log('   -', data.errors.join('\n   - '));
    if (data.jsErrors.length) console.log('   -', data.jsErrors.join('\n   - '));
  }
})();