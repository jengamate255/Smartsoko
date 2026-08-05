/**
 * Backfills missing customer delivery coordinates on active orders
 * (pending/assigned/accepted/picked_up/in_transit) with plausible
 * Dar es Salaam locations, so the driver app can compute routes.
 */
require('dotenv').config();
const admin = require('firebase-admin');
const key = JSON.parse(require('fs').readFileSync('serviceAccountKey.json', 'utf8'));
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const CUSTOMER_SPOTS = [
  { lat: -6.7727, lng: 39.2227 }, // Masaki
  { lat: -6.6824, lng: 39.2119 }, // Mbezi Beach
  { lat: -6.7503, lng: 39.2474 }, // Upanga
  { lat: -6.8213, lng: 39.2580 }, // Gongo la Mboto
  { lat: -6.6875, lng: 39.2000 }  // Kawe
];

async function main() {
  const snap = await db.collection('orders')
    .where('status', 'in', ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit'])
    .get();
  const updates = [];
  let i = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const hasCust = d.customerLat != null && d.customerLng != null;
    if (hasCust && d.deliveryLat != null) continue;
    const spot = CUSTOMER_SPOTS[i++ % CUSTOMER_SPOTS.length];
    updates.push(doc.ref.update({
      customerLat: d.customerLat != null ? d.customerLat : spot.lat,
      customerLng: d.customerLng != null ? d.customerLng : spot.lng,
      deliveryLat: spot.lat,
      deliveryLng: spot.lng,
      updatedAt: new Date().toISOString()
    }));
    if (updates.length >= 200) {
      await Promise.all(updates.splice(0));
      process.stdout.write('.');
    }
  }
  await Promise.all(updates.splice(0));
  console.log('\nBackfilled customer coords on', snap.size, 'active orders scanned');
  process.exit(0);
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
