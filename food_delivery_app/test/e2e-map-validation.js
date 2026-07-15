const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const baseUrl = 'http://localhost:3000';
  const cartSeed = [
    {
      id: 'e2e-map-item-1',
      name: 'E2E Map Test Item',
      price: 7000,
      qty: 1,
      sellerId: 'e2e-seller-1',
      sellerName: 'E2E Seller',
      sellerLat: -6.7924,
      sellerLng: 39.2083,
    },
  ];

  await page.goto(`${baseUrl}/customer`, { waitUntil: 'networkidle2' });
  await page.evaluate((seedCart) => {
    localStorage.setItem('smartsoko_cart', JSON.stringify(seedCart));
    localStorage.setItem('smartsoko_address', 'Kariakoo, Dar es Salaam');
    localStorage.setItem('smartsoko_phone', '+255700000111');
    localStorage.setItem('smartsoko_name', 'Map E2E Customer');
    localStorage.setItem('smartsoko_delivery_coords', JSON.stringify({ lat: -6.8002, lng: 39.2828 }));
  }, cartSeed);

  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    await proceedToCheckout();
  });

  await page.waitForFunction(() => location.pathname.includes('track-order') && new URLSearchParams(location.search).get('orderId'));
  const orderId = await page.evaluate(() => new URLSearchParams(location.search).get('orderId'));

  const orderData = await page.evaluate(async (id) => {
    const snap = await firebase.firestore().collection('orders').doc(id).get();
    return snap.exists ? snap.data() : null;
  }, orderId);

  if (!orderData) {
    throw new Error('Order was not created in Firestore.');
  }

  const requiredOrderFields = ['deliveryLat', 'deliveryLng', 'sellerLat', 'sellerLng', 'pickupLat', 'pickupLng'];
  const missing = requiredOrderFields.filter((field) => orderData[field] === undefined || orderData[field] === null);
  if (missing.length > 0) {
    throw new Error(`Order missing required location fields: ${missing.join(', ')}`);
  }

  const driverId = `e2e-driver-${Date.now()}`;
  await page.evaluate(async ({ id }) => {
    await firebase.firestore().collection('orders').doc(new URLSearchParams(location.search).get('orderId')).update({
      driverId: id,
      status: 'dispatched',
    });

    await firebase.firestore().collection('drivers').doc(id).set({
      name: 'E2E Driver',
      phone: '+255700000222',
      latitude: -6.79,
      longitude: 39.20,
      isOnline: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }, { id: driverId });

  await page.waitForFunction(() => {
    const text = document.getElementById('driverStatusText');
    return text && /live tracking/i.test(text.textContent || '');
  });

  const getDriverTransform = async () => page.evaluate(() => {
    const marker = document.querySelector('.driver-marker');
    if (!marker) return null;
    const wrapper = marker.closest('.mapboxgl-marker');
    return wrapper ? wrapper.style.transform : null;
  });

  const beforeTransform = await getDriverTransform();
  await page.evaluate(async ({ id }) => {
    await firebase.firestore().collection('drivers').doc(id).update({
      latitude: -6.81,
      longitude: 39.31,
      isOnline: true,
      updatedAt: new Date().toISOString(),
    });
  }, { id: driverId });

  await sleep(5000);
  const afterTransform = await getDriverTransform();

  if (!beforeTransform || !afterTransform || beforeTransform === afterTransform) {
    throw new Error('Driver marker did not move after location update.');
  }

  console.log(JSON.stringify({
    ok: true,
    orderId,
    orderLocationFields: requiredOrderFields.reduce((acc, key) => ({ ...acc, [key]: orderData[key] }), {}),
    markerMoved: true,
    beforeTransform,
    afterTransform,
  }, null, 2));

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
