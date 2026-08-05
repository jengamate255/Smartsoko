const admin = require('firebase-admin');
const keyPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();

async function fix() {
  const sellers = await db.collection('sellers').get();
  const byName = new Map();
  sellers.forEach(doc => {
    const d = doc.data();
    const name = (d.name || d.storeName || d.businessName || '').trim().toLowerCase();
    if (name) byName.set(name, doc.id);
  });
  console.log('sellers indexed:', byName.size);

  const snap = await db.collection('orders').where('status', 'in', ['pending', 'new']).get();
  let fixed = 0;
  const batch = db.batch();
  let ops = 0;
  snap.forEach(doc => {
    const d = doc.data();
    if (d.driverId) return;
    const sid = d.restaurantId || d.sellerId || (d.items && d.items[0] ? (d.items[0].sellerId || d.items[0].seller_id) : '');
    if (sid) return;
    const name = (d.sellerName || (d.items && d.items[0] ? d.items[0].sellerName : '') || d.restaurantName || '').trim().toLowerCase();
    if (!name) { console.log('NO NAME for order', doc.id); return; }
    const sellerId = byName.get(name);
    if (!sellerId) { console.log('NO SELLER MATCH for', name, 'order', doc.id); return; }
    batch.update(doc.ref, { sellerId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('FIXED order', doc.id, '-> seller', sellerId, '(' + name + ')');
    fixed++;
    ops++;
    if (ops >= 400) { console.log('batch cap reached'); }
  });
  if (ops > 0) await batch.commit();
  console.log('Fixed', fixed, 'orders');
}

fix().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
