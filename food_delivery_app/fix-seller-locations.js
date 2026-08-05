const admin = require('firebase-admin');
const keyPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();

const spots = [
  [-6.7250, 39.2150], // Kunduchi
  [-6.7924, 39.2083], // City center
  [-6.7050, 39.2250], // Mbezi Beach
  [-6.7710, 39.2770], // Oyster Bay
  [-6.8160, 39.2840], // Kariakoo
  [-6.7650, 39.2550], // Mikocheni
  [-6.7930, 39.2630], // Upanga
  [-6.6600, 39.2220], // Tegeta
  [-6.6350, 39.2380], // Bunju
  [-6.7500, 39.2600], // Masaki
  [-6.7000, 39.2000], // Kigamboni ferry side
  [-6.7850, 39.2200], // Tabata
];

async function updateSellers() {
  const snap = await db.collection('sellers').get();
  let updated = 0;
  let i = 0;
  const batch = db.batch();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.latitude != null && d.longitude != null) return;
    const [lat, lng] = spots[i % spots.length];
    i++;
    batch.update(doc.ref, { latitude: lat, longitude: lng, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('seller:', doc.id, 'name:', (d.name || d.storeName || '?').slice(0, 30), '->', lat, lng);
    updated++;
  });
  await batch.commit();
  console.log('Updated', updated, 'sellers');
}

updateSellers().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
