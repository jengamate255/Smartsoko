const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function testFirestore() {
  console.log('Testing Firestore connection...');
  try {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('Service account file not found at:', serviceAccountPath);
      process.exit(1);
    }

    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    console.log('Firebase initialized.');

    // Try to write to a test collection
    console.log('Attempting to write to _connection_test_...');
    const testDoc = db.collection('_connection_test_').doc('status');
    await testDoc.set({
      last_check: new Date().toISOString(),
      status: 'active',
      agent: 'Antigravity'
    });
    console.log('✅ Write successful.');

    // Try to read it back
    console.log('Attempting to read from _connection_test_...');
    const doc = await testDoc.get();
    if (doc.exists) {
      console.log('✅ Read successful:', doc.data());
    } else {
      console.log('❌ Read failed: Document does not exist.');
    }

    console.log('Connection test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Firestore connection test failed:');
    console.error(error);
    process.exit(1);
  }
}

testFirestore();
