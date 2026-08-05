const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    const orig = console.error;
    console.error = (...args) => {
      if (args[0] && String(args[0]).includes('Error loading order')) {
        const err = args[1];
        window.__stack = err && err.stack;
      }
      orig.apply(console, args);
    };
  });
  await page.goto('http://localhost:8080/track-order', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000));
  const info = await page.evaluate(() => ({
    statusFlowType: typeof statusFlow,
    statusFlow: (typeof statusFlow !== 'undefined' && statusFlow) ? statusFlow.join(',') : null,
    stack: window.__stack || 'no stack captured'
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
