const admin = require('firebase-admin');
const svc = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const orderId = process.argv[2] || 'lulR73JFEhsDzsZ02MQL';
const status = process.argv[3] || 'ready_for_delivery';

db.collection('orders').doc(orderId).update({
  status: status,
  updatedAt: new Date().toISOString(),
  readyForDeliveryAt: new Date().toISOString()
}).then(() => {
  console.log(`Firestore updated: ${orderId} -> ${status}`);
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
