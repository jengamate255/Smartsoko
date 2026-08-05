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

    try {
      await page.goto('http://localhost:8080' + route, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1000));

      const info = await page.evaluate(() => {
        function getStyles(el) {
          if (!el) return {};
          const s = getComputedStyle(el);
          return {
            bg: s.backgroundColor,
            color: s.color,
            font: s.fontFamily,
            size: s.fontSize,
            textAlign: s.textAlign,
            padding: s.padding,
            margin: s.margin,
            display: s.display,
            flexDirection: s.flexDirection,
            justifyContent: s.justifyContent,
            alignItems: s.alignItems,
            gap: s.gap,
            width: s.width,
            maxWidth: s.maxWidth,
            borderRadius: s.borderRadius,
            boxShadow: s.boxShadow
          };
        }
        const body = document.body;
        const nav = document.querySelector('nav, header, .navbar, .nav, .header');
        const main = document.querySelector('main, .main, .container, .content');
        const footer = document.querySelector('footer, .footer');
        return {
          htmlHeight: document.documentElement.scrollHeight,
          htmlWidth: document.documentElement.scrollWidth,
          bodyWidth: body.scrollWidth,
          viewportWidth: window.innerWidth,
          title: document.title,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          overflowY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
          bodyStyles: getStyles(body),
          navExists: !!nav,
          mainExists: !!main,
          footerExists: !!footer,
          metaViewport: (document.querySelector('meta[name=viewport]') || {}).content || '',
          imagesLoaded: Array.from(document.images).filter(img => img.complete && img.naturalHeight > 0).length,
          totalImages: Array.from(document.images).length,
          brokenImages: Array.from(document.images).filter(img => img.complete && img.naturalHeight === 0).length,
          cards: document.querySelectorAll('.card, [class*=card], [class*=product], [class*=item]').length,
          buttons: document.querySelectorAll('button, .btn, [role=button]').length,
          inputs: document.querySelectorAll('input, select, textarea').length,
          headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.tagName + ': ' + (h.textContent || '').trim().substring(0, 60)),
          formGroups: document.querySelectorAll('.form-group, .input-group').length,
          isTouchDevice: 'ontouchstart' in window,
          userAgent: navigator.userAgent.substring(0, 80)
        };
      });

      report[route] = { info, console: logs.console.slice(0, 15), jsErrors: logs.js.slice(0, 5) };
    } catch (e) {
      report[route] = { error: e.message };
    }
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('ui-detail.json', JSON.stringify(report, null, 2));
  console.log('Detail audit -> ui-detail.json');

  console.log('\n===== VISUAL ANALYSIS SUMMARY =====\n');
  for (const [route, data] of Object.entries(report)) {
    console.log(`${route}:`);
    if (data.error) { console.log('  ERROR:', data.error); continue; }
    const i = data.info;
    console.log('  Title:', i.title);
    console.log('  Dimensions:', i.viewportWidth + 'x', i.viewportWidth > 0 ? i.viewportWidth : 'N/A');
    console.log('  Body Height:', i.htmlHeight, '| OverflowX:', i.overflowX, '| OverflowY:', i.overflowY);
    console.log('  Images:', i.imagesLoaded, '/', i.totalImages + ' (' + i.brokenImages + ' broken)');
    console.log('  Structure: Nav', i.navExists ? 'YES' : 'NO', '| Main', i.mainExists ? 'YES' : 'NO', '| Footer', i.footerExists ? 'YES' : 'NO');
    console.log('  Components: Cards', i.cards, '| Buttons', i.buttons, '| Inputs', i.inputs, '| Forms', i.formGroups);
    console.log('  Headings:', i.headings.length);
    console.log('  Viewport:', i.metaViewport);
    console.log('  JS Errors:', data.jsErrors.length);
    if (i.overflowX || i.overflowY) {
      console.log('  ⚠️ OVERFLOW ISSUE!');
    }
    if (i.brokenImages > 0) {
      console.log('  ⚠️ BROKEN IMAGES:', i.brokenImages);
    }
    if (data.jsErrors.length > 0) {
      console.log('  ⚠️ JS ERRORS:', data.jsErrors.join(' | '));
    }
    console.log('');
  }
})();