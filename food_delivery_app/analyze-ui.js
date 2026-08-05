const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8080';
const PAGES = ['/login', '/main', '/home', '/merchant', '/driver', '/admin', '/discovery'];

async function analyzePage(page, path) {
  const issues = [];

  page.on('console', msg => {
    if (msg.type() === 'error') issues.push({ type: 'console', msg: msg.text() });
  });
  page.on('pageerror', err => issues.push({ type: 'pageerror', msg: err.message }));

  const failedRequests = [];
  page.on('response', res => {
    if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() });
  });

  await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  const metrics = await page.evaluate(() => {
    const localIssues = [];

    if (document.documentElement.scrollWidth > window.innerWidth) {
      localIssues.push('Horizontal overflow: ' + document.documentElement.scrollWidth + ' > ' + window.innerWidth);
    }

    const images = Array.from(document.querySelectorAll('img'));
    const brokenImages = images.filter(img => !img.complete || img.naturalWidth === 0);
    if (brokenImages.length) localIssues.push(brokenImages.length + ' broken images');

    const emptyContainers = Array.from(document.querySelectorAll('[class*="container"], [class*="grid"], [class*="list"]'))
      .filter(el => el.children.length === 0 && el.offsetHeight > 10);
    if (emptyContainers.length) localIssues.push(emptyContainers.length + ' empty containers');

    const fonts = Array.from(document.fonts.values()).filter(f => f.status === 'unloaded' || f.status === 'loading');
    if (fonts.length) localIssues.push(fonts.length + ' fonts not loaded');

    return { issues: localIssues, viewport: { w: window.innerWidth, h: window.innerHeight } };
  });

  return { path, consoleErrors: issues, failedRequests, metrics };
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const allResults = [];

  for (const pagePath of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    try {
      const result = await analyzePage(page, pagePath);
      allResults.push(result);
    } catch (e) {
      allResults.push({ path: pagePath, error: e.message });
    }
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(allResults, null, 2));
})().catch(e => console.error(e));