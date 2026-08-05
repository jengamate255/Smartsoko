const admin = require('firebase-admin');
const fs = require('fs');
const sa = JSON.parse(fs.readFileSync(__dirname + '/serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const MERCHANT_UID = 'merchant-sim-' + Date.now();
const email = 'sim.merchant.' + Date.now() + '@smartsoko.test';
const PW = 'SimPass#2024';

(async () => {
  let user;
  try { user = await admin.auth().getUser(MERCHANT_UID); }
  catch (e) {
    user = await admin.auth().createUser({ uid: MERCHANT_UID, email, password: PW, displayName: 'Simba Merchant' });
  }
  await db.collection('users').doc(MERCHANT_UID).set({
    fullName: 'Simba Merchant', email, role: 'merchant',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  fs.writeFileSync(__dirname + '/merchant-creds.json', JSON.stringify({ uid: MERCHANT_UID, email, password: PW }, null, 2));
  console.log('Merchant ready: uid=' + MERCHANT_UID + ' email=' + email);
})().catch(e => { console.error(e); process.exit(1); });
