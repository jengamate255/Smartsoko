/**
 * Create Demo Users in Firebase
 * Run this script once to set up demo test accounts
 * 
 * Usage: node create-demo-users.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
  console.log('✓ Loaded service account key');
} catch (error) {
  console.error('✗ Error: serviceAccountKey.json not found or invalid');
  console.error('Please ensure you have the Firebase service account key in the project root');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fooddelievry-dce15'
});

const db = admin.firestore();
const auth = admin.auth();

// Demo users to create
const DEMO_USERS = [
  {
    email: 'demo@smartsoko.com',
    password: 'demo123456',
    displayName: 'Demo Customer',
    role: 'customer'
  },
  {
    email: 'merchant@smartsoko.com',
    password: 'demo123456',
    displayName: 'Demo Merchant',
    role: 'merchant'
  },
  {
    email: 'driver@smartsoko.com',
    password: 'demo123456',
    displayName: 'Demo Driver',
    role: 'driver'
  },
  {
    email: 'admin@smartsoko.com',
    password: 'demo123456',
    displayName: 'Demo Admin',
    role: 'admin'
  }
];

async function createDemoUsers() {
  console.log('\n🚀 Creating demo users for SmartSoko...\n');

  for (const user of DEMO_USERS) {
    try {
      // Check if user already exists
      try {
        const existingUser = await auth.getUserByEmail(user.email);
        console.log(`⚠️  User ${user.email} already exists (UID: ${existingUser.uid})`);
        
        // Update user data in Firestore
        await db.collection('users').doc(existingUser.uid).set({
          email: user.email,
          name: user.displayName,
          role: user.role,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`✓ Updated ${user.role} data in Firestore`);
        continue;
      } catch (error) {
        // User doesn't exist, create it
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true
      });

      console.log(`✓ Created ${user.role}: ${user.email}`);

      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email: user.email,
        name: user.displayName,
        role: user.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✓ Added ${user.role} data to Firestore\n`);

    } catch (error) {
      console.error(`✗ Error creating ${user.email}:`, error.message);
    }
  }

  console.log('\n✅ Demo users setup complete!\n');
  console.log('📝 Login Credentials:');
  console.log('┌──────────────┬────────────────────────────┬──────────────┐');
  console.log('│ Role         │ Email                      │ Password     │');
  console.log('├──────────────┼────────────────────────────┼──────────────┤');
  console.log('│ Customer     │ demo@smartsoko.com         │ demo123456   │');
  console.log('│ Merchant     │ merchant@smartsoko.com     │ demo123456   │');
  console.log('│ Driver       │ driver@smartsoko.com       │ demo123456   │');
  console.log('│ Admin        │ admin@smartsoko.com        │ demo123456   │');
  console.log('└──────────────┴────────────────────────────┴──────────────┘\n');
}

// Run the script
createDemoUsers()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
