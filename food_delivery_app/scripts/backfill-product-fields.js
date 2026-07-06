// Backfill sellerId and isAvailable on existing products
// Run: node scripts/backfill-product-fields.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try loading service account
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fooddelievry-dce15'
  });
} else {
  console.error('serviceAccountKey.json not found');
  process.exit(1);
}

const db = admin.firestore();

async function main() {
  console.log('Scanning products collection...');
  const snapshot = await db.collection('products').get();
  console.log(`Found ${snapshot.docs.length} products`);

  let updated = 0;
  const batch = db.batch();
  let ops = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    // Copy merchantId to sellerId if sellerId is missing
    if (!data.sellerId && data.merchantId) {
      updates.sellerId = data.merchantId;
    }

    // Ensure isAvailable is set
    if (data.isAvailable === undefined || data.isAvailable === null) {
      updates.isAvailable = data.isActive === false ? false : true;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`  Updating ${doc.id} (${data.name || 'unnamed'}): ${JSON.stringify(updates)}`);
      batch.update(doc.ref, updates);
      ops++;
      updated++;
    }

    if (ops >= 500) {
      await batch.commit();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(`\nDone. Updated ${updated} products.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
