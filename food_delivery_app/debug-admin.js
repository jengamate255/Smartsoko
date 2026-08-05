const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  try {
    // Go to login
    console.log('1. Going to login page...');
    await page.goto('http://127.0.0.1:8080/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Check what inputs are on the page
    const inputs = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      return Array.from(allInputs).map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder }));
    });
    console.log('   Inputs found:', JSON.stringify(inputs));
    
    // Fill email
    const emailInput = await page.$('#identity');
    if (emailInput) {
      await emailInput.type('superadmin@smartsoko.com', { delay: 30 });
      console.log('   Email entered');
    }
    
    // Fill password
    const passInput = await page.$('#password');
    if (passInput) {
      await passInput.type('Admin@123', { delay: 30 });
      console.log('   Password entered');
    }
    
    // Click submit
    console.log('3. Clicking submit and waiting for navigation...');
    
    // Wait for both navigation and network idle
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    
    const currentUrl = page.url();
    console.log('4. Current URL after login:', currentUrl);
    
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
    console.log('   Body text:', bodyText);
    
    if (currentUrl.includes('admin') || currentUrl.includes('dashboard')) {
      console.log('5. On admin/dashboard page!');
      
      // Check for tabs
      const tabsHtml = await page.evaluate(() => {
        const tabs = document.querySelectorAll('[id^="tab-"]');
        return Array.from(tabs).map(t => t.id);
      });
      console.log('   Tabs found:', JSON.stringify(tabsHtml));
      
      if (tabsHtml.length > 0) {
        // Try clicking users tab
        const usersTab = await page.$('#tab-users');
        if (usersTab) {
          await usersTab.click();
          await new Promise(r => setTimeout(r, 5000));
          const usersContent = await page.evaluate(() => {
            const el = document.getElementById('usersTable');
            return el ? el.innerHTML.substring(0, 800) : 'NO TABLE';
          });
          console.log('   Users table content:', usersContent);
          
          // Also check for error messages
          const errorMsg = await page.evaluate(() => {
            const el = document.querySelector('.error-message, .alert-error, [class*="error"]');
            return el ? el.innerText.substring(0, 200) : 'no error element';
          });
          console.log('   Error msg:', errorMsg);
        } else {
          console.log('   No users tab found');
        }
      }
    }
    
    console.log('\n=== CONSOLE LOGS (last 20) ===');
    const recentLogs = logs.slice(-20);
    recentLogs.forEach(l => console.log(l.type + ': ' + l.text.substring(0, 200)));
    
  } catch (e) {
    console.log('Error:', e.message);
    const currentUrl = await page.url().catch(() => 'unknown');
    console.log('URL at error:', currentUrl);
    console.log('\n=== CONSOLE LOGS (last 20) ===');
    const recentLogs = logs.slice(-20);
    recentLogs.forEach(l => console.log(l.type + ': ' + l.text.substring(0, 200)));
  }
  
  await page.close();
  await browser.close();
})();