#!/usr/bin/env node
/**
 * Firebase Service Account Setup Helper
 * 
 * This script helps you set up the Firebase Admin SDK service account.
 * 
 * Usage:
 * 1. Download your service account JSON from Firebase Console:
 *    - Go to Firebase Console > Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save the JSON file as 'serviceAccountKey.json' in this directory
 * 
 * 2. Run this script: node scripts/setup-firebase.js
 * 
 * 3. Copy the output and paste it into your .env file as FIREBASE_SERVICE_ACCOUNT_BASE64
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Service Account Setup Helper\n');

// Check for service account file
const possibleFiles = [
  'serviceAccountKey.json',
  'fooddelievry-dce15-firebase-adminsdk-fbsvc-3542bf4162.json',
  'fooddelievry-dce15-firebase-adminsdk-fbsvc-b413253815.json'
];

let serviceAccountFile = null;
for (const file of possibleFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    serviceAccountFile = filePath;
    break;
  }
}

if (!serviceAccountFile) {
  console.log('❌ No service account file found!\n');
  console.log('Please follow these steps:\n');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your project: fooddelievry-dce15');
  console.log('3. Click the gear icon (⚙️) next to "Project Overview"');
  console.log('4. Go to "Project settings" > "Service accounts"');
  console.log('5. Click "Generate new private key"');
  console.log('6. Save the JSON file to this project root as "serviceAccountKey.json"\n');
  console.log('Then run this script again.\n');
  process.exit(1);
}

console.log(`✅ Found service account file: ${path.basename(serviceAccountFile)}\n`);

// Read and encode the file
try {
  const content = fs.readFileSync(serviceAccountFile);
  const base64 = content.toString('base64');
  
  console.log('🔑 Base64 encoded service account:\n');
  console.log('--- COPY THIS LINE TO YOUR .env FILE ---\n');
  console.log(`FIREBASE_SERVICE_ACCOUNT_BASE64=${base64}\n`);
  console.log('--- END COPY ---\n');
  
  // Also write to a temporary file
  const outputFile = path.join(__dirname, '..', 'service-account-base64.txt');
  fs.writeFileSync(outputFile, `FIREBASE_SERVICE_ACCOUNT_BASE64=${base64}`);
  console.log(`✅ Also saved to: ${outputFile}\n`);
  
  console.log('Next steps:');
  console.log('1. Copy the FIREBASE_SERVICE_ACCOUNT_BASE64 line above');
  console.log('2. Paste it into your .env file');
  console.log('3. Restart the server: npm run dev');
  console.log('4. Firebase should now be connected! ✅\n');
  
} catch (err) {
  console.error('❌ Error encoding file:', err.message);
  process.exit(1);
}
