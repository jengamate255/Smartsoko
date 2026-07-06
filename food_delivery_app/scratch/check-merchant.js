const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check for service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ No service account file found. Checking emulators...');
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

admin.initializeApp({
  credential: fs.existsSync(serviceAccountPath) ? admin.credential.cert(serviceAccountPath) : undefined,
  projectId: 'smartsoko-development' // From firebase-config.js
});

const db = admin.firestore();

async function checkMerchant() {
  const merchantEmail = 'merchant@smartsoko.com';
  console.log(`Checking data for: ${merchantEmail}`);

  // 1. Find user
  const usersSnap = await db.collection('users').where('email', '==', merchantEmail).get();
  if (usersSnap.empty) {
    console.log('❌ Merchant user not found in Firestore.');
    return;
  }
  const user = usersSnap.docs[0].data();
  const userId = usersSnap.docs[0].id;
  console.log(`✅ Found user: ${userId} with role ${user.role}`);

  // 2. Find seller/restaurant
  const sellersSnap = await db.collection('sellers').where('ownerId', '==', userId).get();
  if (sellersSnap.empty) {
    console.log('❌ No restaurant found for this merchant.');
  } else {
    const seller = sellersSnap.docs[0].data();
    console.log(`✅ Found restaurant: ${seller.name} (${sellersSnap.docs[0].id})`);
    
    // 3. Check products
    const productsSnap = await db.collection('products').where('sellerId', '==', sellersSnap.docs[0].id).get();
    console.log(`✅ Found ${productsSnap.size} products.`);
  }
}

checkMerchant().catch(console.error);
