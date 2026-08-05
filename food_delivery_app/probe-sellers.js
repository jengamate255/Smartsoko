const admin = require('firebase-admin');
const keyPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();

async function probe() {
  const snap = await db.collection('sellers').limit(20).get();
  console.log('sellers count:', snap.size);
  snap.forEach(doc => {
    const d = doc.data();
    console.log('---', doc.id, '| name:', d.name || d.storeName || d.businessName, '| lat:', d.latitude, '| lng:', d.longitude, '| addr:', (d.address || d.fullAddress || '').slice(0, 40));
  });
}

probe().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
