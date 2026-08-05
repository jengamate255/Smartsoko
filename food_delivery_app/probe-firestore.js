const admin = require('firebase-admin');
require('dotenv').config({ path: __dirname + '/.env' });
let sa;
try { sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')); }
catch (e) { sa = require('./serviceAccountKey.json'); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  try {
    const ref = db.collection('sellers').doc('Pipsr101@gmail.com');
    const snap = await ref.get();
    console.log('FIRESTORE seller exists:', snap.exists);
    if (snap.exists) {
      await ref.update({ approved: true, approvedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('FIRESTORE update OK');
    }
  } catch (e) {
    console.log('FIRESTORE ERROR:', e.code, e.message);
  }
})();
