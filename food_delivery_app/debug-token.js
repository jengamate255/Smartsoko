const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE[' + m.type() + ']: ' + m.text()); });
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForSelector('#identity', { timeout: 10000 });
  await p.type('#identity', 'dd396515@gmail.com');
  await p.type('#password', 'Tanzania101');
  await p.click('#loginForm button[type=submit]').catch(() => {});
  await new Promise(r => setTimeout(r, 6000));
  const info = await p.evaluate(async () => {
    const out = { hasAuth: !!window.auth, hasCurrent: !!(window.auth && window.auth.currentUser), url: location.href };
    try {
      if (window.auth && window.auth.currentUser) {
        out.uid = window.auth.currentUser.uid;
        out.tokenLen = (await window.auth.currentUser.getIdToken(true)).length;
      }
    } catch (e) { out.tokenErr = e.message; }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
