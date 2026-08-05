const path = require('path');
const puppeteer = require('puppeteer-core');
const { runAudit } = require('./ui-audit-fn');

const BASE = process.env.BASE || 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  for (const page of process.argv.slice(2)) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 800 });
    try {
      await p.goto(BASE + page, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (e) { console.log(page, 'goto:', e.message.slice(0, 80)); }
    const r = await p.evaluate(runAudit);
    console.log('\n=== ' + page + ' ===');
    for (const i of r.issues.filter(x => process.argv.slice(2).length > 1 || ['tiny-target', 'heading-skip', 'placeholder-only', 'unnamed-control', 'missing-alt'].includes(x.type))) {
      console.log('[' + i.type + '] ' + (i.tag || '') + ' ' + (i.cls || '') + ' "' + (i.text || '').slice(0, 45) + '" @' + i.x + ',' + i.y + ' ' + i.w + 'x' + i.h + (i.msg ? ' | ' + i.msg.slice(0, 70) : ''));
    }
    console.log('stats:', JSON.stringify({ headings: r.stats.headings, smallTargets: r.stats.smallTargets, unnamed: r.stats.unnamedControls, plchldr: r.stats.placeholderOnlyInputs, imgs: r.stats.images, broken: r.stats.brokenImages, overflow: r.stats.docScrollWidth }));
    await p.close();
  }
  await browser.close();
})();
