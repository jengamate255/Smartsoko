const puppeteer = require('puppeteer');
const AUDIT_JS = require('fs').readFileSync(__dirname + '/ui-deep-audit.js', 'utf8');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  const m = AUDIT_JS.match(/const AUDIT_JS = `([\s\S]*?)`;\n/);
  const fn = 'return ' + m[1];
  try {
    const res = await page.evaluate(fn);
    console.log('KEYS:', Object.keys(res));
    console.log('STATS:', JSON.stringify(res.stats || null).slice(0, 500));
    console.log('ISSUES:', (res.issues || []).length);
  } catch (e) {
    console.log('EVAL ERROR:', e.message.slice(0, 300));
  }
  await browser.close();
})();
