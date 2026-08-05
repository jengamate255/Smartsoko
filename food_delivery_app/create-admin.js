const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccountPath = 'E:/Project/notsmartsoko/Smartsoko/fooddelievry-dce15-firebase-adminsdk-fbsvc-4d6ee9f018.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setup() {
  // Create or find the admin user
  const email = 'superadmin@smartsoko.com';
  const password = 'Admin@123';
  
  try {
    let uid;
    try {
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: 'Super Admin',
        emailVerified: true
      });
      uid = userRecord.uid;
      console.log('Created auth user:', uid);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        console.log('Auth user already exists, fetching...');
        const userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
        await auth.updateUser(uid, { password: password });
        console.log('Updated existing auth user:', uid);
      } else {
        throw e;
      }
    }
    
    // Set admin role in Firestore
    const userData = {
      id: uid,
      uid: uid,
      email: email,
      full_name: 'Super Admin',
      name: 'Super Admin',
      phone: '+255700000000',
      role: 'admin',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('users').doc(uid).set(userData, { merge: true });
    console.log('Firestore admin user set');
    console.log('\nLogin credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  process.exit(0);
}

setup();