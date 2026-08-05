const admin = require('firebase-admin');
const keyPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();

async function probe() {
  const snap = await db.collection('orders').where('status', 'in', ['pending', 'new']).get();
  let good = [];
  let bad = 0;
  snap.forEach(doc => {
    const d = doc.data();
    if (d.driverId) return;
    const clat = d.customerLat != null ? Number(d.customerLat) : (d.deliveryLat != null ? Number(d.deliveryLat) : null);
    const clng = d.customerLng != null ? Number(d.customerLng) : (d.deliveryLng != null ? Number(d.deliveryLng) : null);
    const sellerId = d.sellerId || d.restaurantId || (d.items && d.items[0] ? (d.items[0].sellerId || d.items[0].merchantId) : '');
    if (clat && clng && Math.abs(clat) > 0.01) {
      good.push({ id: doc.id, sellerId, sellerName: d.sellerName, customer: d.customerName, clat, clng, addr: d.deliveryAddress || d.customerAddress || '' });
    } else {
      bad++;
    }
  });
  console.log('good orders:', good.length, '| bad (no coords):', bad);
  good.slice(0, 10).forEach(g => console.log('OK:', g.id, '| seller:', g.sellerId, '|', g.sellerName, '| cust:', g.customer, g.clat, g.clng));
}

probe().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
