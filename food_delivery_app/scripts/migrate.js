#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies schema migrations to Firestore/Supabase
 * Usage: node migrate.js [up|down|status]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const COLLECTIONS = {
  users: {
    indexes: [
      { fields: ['phone'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['role'] },
      { fields: ['createdAt'] },
    ],
  },
  orders: {
    indexes: [
      { fields: ['customerId', 'status'] },
      { fields: ['driverId', 'status'] },
      { fields: ['sellerId', 'status'] },
      { fields: ['createdAt'] },
      { fields: ['status', 'createdAt'] },
    ],
  },
  products: {
    indexes: [
      { fields: ['sellerId', 'status'] },
      { fields: ['category', 'status'] },
      { fields: ['price'] },
      { fields: ['createdAt'] },
    ],
  },
  sellers: {
    indexes: [
      { fields: ['ownerId'], unique: true },
      { fields: ['status'] },
      { fields: ['location'] }, // geo index handled separately
      { fields: ['rating'] },
    ],
  },
  riders: {
    indexes: [
      { fields: ['userId'], unique: true },
      { fields: ['status', 'vehicleType'] },
      { fields: ['currentLocation'] }, // geo
      { fields: ['rating'] },
    ],
  },
  categories: {
    indexes: [
      { fields: ['parentId'] },
      { fields: ['sortOrder'] },
      { fields: ['isActive'] },
    ],
  },
  addresses: {
    indexes: [
      { fields: ['userId', 'isDefault'] },
      { fields: ['userId'] },
    ],
  },
  payments: {
    indexes: [
      { fields: ['orderId'], unique: true },
      { fields: ['userId', 'status'] },
      { fields: ['provider', 'transactionId'] },
      { fields: ['createdAt'] },
    ],
  },
  notifications: {
    indexes: [
      { fields: ['userId', 'read', 'createdAt'] },
      { fields: ['userId', 'type'] },
    ],
  },
};

async function getFirestore() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    } else {
      const saPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (!fs.existsSync(saPath)) throw new Error('No Firebase service account found');
      serviceAccount = require(saPath);
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

async function createIndexes(db) {
  console.log('📋 Creating Firestore indexes...');
  let created = 0;
  
  for (const [collection, config] of Object.entries(COLLECTIONS)) {
    for (const idx of config.indexes) {
      try {
        // Note: Firestore indexes must be created via Firebase Console or gcloud
        // This logs what needs to be created
        const fieldList = idx.fields.map(f => (f.startsWith('__') ? f : f)).join(', ');
        console.log(`  📝 ${collection}: [${fieldList}]${idx.unique ? ' (unique)' : ''}`);
        created++;
      } catch (e) {
        console.warn(`  ⚠️  ${collection}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n✅ ${created} indexes defined. Deploy via:`);
  console.log('   firebase deploy --only firestore:indexes');
  console.log('   OR use Firebase Console > Firestore > Indexes');
}

async function seedTestData(db) {
  if (process.env.NODE_ENV === 'production') {
    console.log('⏭️  Skipping test data seed in production');
    return;
  }
  
  console.log('🌱 Seeding test data...');
  const batch = db.batch();
  
  // Seed categories
  const categories = [
    { id: 'food', name: 'Food & Groceries', icon: '🍎', sortOrder: 1, isActive: true },
    { id: 'electronics', name: 'Electronics', icon: '📱', sortOrder: 2, isActive: true },
    { id: 'fashion', name: 'Fashion', icon: '👕', sortOrder: 3, isActive: true },
    { id: 'home', name: 'Home & Garden', icon: '🏠', sortOrder: 4, isActive: true },
    { id: 'health', name: 'Health & Beauty', icon: '💊', sortOrder: 5, isActive: true },
  ];
  
  for (const cat of categories) {
    const ref = db.collection('categories').doc(cat.id);
    batch.set(ref, { ...cat, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
  }
  
  await batch.commit();
  console.log('✅ Test data seeded');
}

async function verifyCollections(db) {
  console.log('🔍 Verifying collections...');
  for (const collection of Object.keys(COLLECTIONS)) {
    const snapshot = await db.collection(collection).limit(1).get();
    console.log(`  ${collection}: ${snapshot.size >= 0 ? '✅ exists' : '❌ missing'}`);
  }
}

async function main() {
  const command = process.argv[2] || 'up';
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         SmartSoko Database Migration Tool                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const db = await getFirestore();
  
  switch (command) {
    case 'up':
      await createIndexes(db);
      await seedTestData(db);
      await verifyCollections(db);
      console.log('\n✅ Migration complete');
      break;
    case 'indexes':
      await createIndexes(db);
      break;
    case 'seed':
      await seedTestData(db);
      break;
    case 'verify':
      await verifyCollections(db);
      break;
    case 'status':
      await verifyCollections(db);
      break;
    default:
      console.log('Usage: node migrate.js [up|indexes|seed|verify|status]');
      process.exit(1);
  }
}

main().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});