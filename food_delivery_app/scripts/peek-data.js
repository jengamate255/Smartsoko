const admin = require('firebase-admin');
const fs = require('fs');
const sa = JSON.parse(fs.readFileSync(__dirname + '/../serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const sellerId = 'YG1BCXEFmG3tTmqCitiW';
  for (const col of ['menuItems', 'products']) {
    const snap = await db.collection(col).where('merchantId', '==', sellerId).get();
    if (snap.empty) {
      const all = await db.collection(col).limit(5).get();
      console.log(`\n[${col}] (no merchantId match; sample ${all.size}):`);
      all.forEach(d => console.log('  ', d.id, JSON.stringify(d.data()).slice(0, 160)));
      continue;
    }
    console.log(`\n[${col}] items for ${sellerId}: ${snap.size}`);
    snap.forEach(d => {
      const d0 = d.data();
      console.log('  ', d.id, '|', d0.name, '|', d0.price, '|', d0.category || '', '|', d0.sellerName || d0.merchantName || '');
    });
  }
  const orders = await db.collection('orders').get();
  console.log('\nExisting orders in Firestore:', orders.size);
})().catch(e => { console.error(e); process.exit(1); });
