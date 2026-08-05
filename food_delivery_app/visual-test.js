#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const pages = ['/login', '/home', '/merchant', '/discovery', '/product'];

  for (const route of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    try {
      console.log('\n=== ' + route + ' ===');
      await page.goto('http://127.0.0.1:8080' + route, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const imgs = Array.from(document.images);
        const broken = imgs.filter(i => i.complete && i.naturalHeight === 0);
        const ok = imgs.filter(i => i.complete && i.naturalHeight > 0);
        return {
          bodyH: document.body.scrollHeight,
          viewH: window.innerHeight,
          overflowY: document.body.scrollHeight > window.innerHeight,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          images: { total: imgs.length, loaded: ok.length, broken: broken.length, brokenSrc: broken.map(i => i.src) },
          nav: !!document.querySelector('nav, header, .navbar'),
          footer: !!document.querySelector('footer, .footer'),
        };
      });

      console.log('Height:', info.bodyH, '/', info.viewH, '(overflowY:', info.overflowY + ')');
      console.log('Images:', info.images.loaded, '/', info.images.total, 'broken:', info.images.broken);
      if (info.images.broken > 0) info.images.brokenSrc.forEach(s => console.log('  BROKEN:', s));
      console.log('Nav:', info.nav, '| Footer:', info.footer);

      await page.screenshot({ path: 'screenshot-' + route.replace('/', '') + '.png', fullPage: false });

      const errs = logs.filter(l => l.type === 'error' || l.text.includes('ERROR'));
      if (errs.length) {
        console.log('Console errors:');
        errs.forEach(e => console.log('  [' + e.type + ']', e.text));
      }

    } catch (e) {
      console.log('FAIL:', e.message);
    }
    await page.close();
  }

  await browser.close();
})();