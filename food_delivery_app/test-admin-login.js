const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Loading /login...');
  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('goto warn:', e.message));
  await new Promise(r => setTimeout(r, 2000));

  console.log('Filling login...');
  await page.type('input[name="identity"]', 'Dd396515@gmail.com');
  await page.type('input[name="password"]', 'Tanzania101');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent.includes('Sign In')) { b.click(); break; } }
  });
  await new Promise(r => setTimeout(r, 5000));

  console.log('After login URL:', page.url());

  if (page.url().includes('/admin')) {
    console.log('SUCCESS: Logged in to admin');
    const errors = await page.evaluate(() => window.__log?.getBuf?.().filter(e => e.level === 'error') || []);
    console.log('Admin errors:', errors.length > 0 ? errors : 'None');
  } else {
    console.log('FAILED: Not on admin page');
  }

  await browser.close();
})().catch(console.error);