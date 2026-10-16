const admin = require('firebase-admin');
const svc = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const updates = [
  { id: 'supa-5a129535-03ee-424f-98b8-d3cf83e6e691', customerName: 'Dave', deliveryAddress: 'Kisangara Street, Kunduchi, Kawe, Kinondoni Municipal, Dar es Salaam, Coastal Zone, 14130, Tanzania', deliveryLat: -6.663944, deliveryLng: 39.21138, total: 0, items: [] },
  { id: 'supa-fdf87996-ee8b-40f3-ad3f-006317c0096c', customerName: 'Dave', deliveryAddress: 'Kisangara Street, Kunduchi, Kawe, Kinondoni Municipal, Dar es Salaam, Coastal Zone, 14130, Tanzania', deliveryLat: -6.663944, deliveryLng: 39.21138, total: 0, items: [] },
  { id: 'supa-168a1daf-c947-472a-bb1b-6d01ee56c606', customerName: 'Dave', deliveryAddress: 'Kisangara Street, Kunduchi, Kawe, Kinondoni Municipal, Dar es Salaam, Coastal Zone, 14130, Tanzania', deliveryLat: -6.663944, deliveryLng: 39.21138, total: 0, items: [] },
];

async function main() {
  for (const o of updates) {
    await db.collection('orders').doc(o.id).set({
      customerName: o.customerName,
      deliveryAddress: o.deliveryAddress,
      deliveryLat: o.deliveryLat,
      deliveryLng: o.deliveryLng,
      status: 'ready_for_delivery',
      total: o.total,
      items: o.items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('Wrote:', o.id);
  }
  console.log('Done');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
