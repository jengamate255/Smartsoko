const puppeteer = require('puppeteer');

async function testServerConnection() {
  console.log('🔍 Testing server connection...');

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set a short timeout
    page.setDefaultTimeout(5000);

    await page.goto('http://localhost:3000/health');
    const status = await page.evaluate(() => ({
      status: document.body.textContent,
      title: document.title
    }));

    console.log('✅ Server is responding!');
    console.log('📄 Response:', status);

    await browser.close();
    return true;
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return false;
  }
}

testServerConnection().then(isRunning => {
  if (isRunning) {
    console.log('🚀 Running full Puppeteer test suite...');
    // Import and run the main test
    require('./puppeteer-web-test');
  } else {
    console.log('❌ Server not available. Please start the server first with: npm run dev');
  }
});