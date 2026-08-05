const admin = require('firebase-admin');
const keyPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();

async function probe() {
  const doc = await db.collection('orders').doc('uHZWJGLXPMfEhy9Imj0y').get();
  if (!doc.exists) { console.log('order not found'); return; }
  const d = doc.data();
  console.log('order keys:', Object.keys(d).join(', '));
  console.log('restaurantId:', d.restaurantId, '| sellerId:', d.sellerId, '| seller_id:', d.seller_id);
  console.log('restaurantName:', d.restaurantName, '| sellerName:', d.sellerName);
  console.log('items:', JSON.stringify(d.items ? d.items[0] : null));
  console.log('deliveryAddress:', d.deliveryAddress, '| customerName:', d.customerName);
}

probe().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
