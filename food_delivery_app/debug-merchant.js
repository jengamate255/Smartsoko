const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

  try {
    console.log('Navigating to merchant page...');
    await page.goto('http://localhost:8080/merchant', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Navigation successful');
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n=== CONSOLE LOGS SUMMARY ===');
    console.log('Total messages:', consoleLogs.length);
    consoleLogs.forEach((log, i) => {
      console.log(`${i+1}. [${log.type}] ${log.text}`);
    });
    
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  await page.close();
  await browser.close();
})();