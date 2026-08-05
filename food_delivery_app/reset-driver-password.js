const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.resolve('E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json');

admin.initializeApp({
  credential: admin.credential.cert(keyPath),
  projectId: 'fooddelievry-dce15'
});

const auth = admin.auth();
const db = admin.firestore();

async function resetDriver() {
  const email = 'driver@smartsoko.com';
  const password = 'demo123456';

  let uid = null;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`User exists: ${email} (uid: ${uid})`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email,
        password,
        displayName: 'Demo Driver',
        emailVerified: true
      });
      uid = created.uid;
      console.log(`Created user: ${email} (uid: ${uid})`);
    } else {
      throw e;
    }
  }

  await auth.updateUser(uid, { password });
  console.log(`Password reset to: ${password}`);

  await db.collection('users').doc(uid).set({
    email,
    name: 'Demo Driver',
    role: 'driver',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log('Firestore role updated: driver');

  const freshToken = await auth.createCustomToken(uid);
  console.log('Custom token minted (for testing):', freshToken.slice(0, 30) + '...');
}

resetDriver()
  .then(() => { console.log('DONE'); process.exit(0); })
  .catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
