const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function checkDrivers() {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    const snap = await db.collection('drivers').get();
    console.log(`Found ${snap.size} drivers in collection.`);
    snap.forEach(doc => {
      console.log(`Driver ID: ${doc.id}`);
      console.log(`Data:`, JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
  } catch (error) {
    console.error('Error checking drivers:', error);
    process.exit(1);
  }
}

checkDrivers();
