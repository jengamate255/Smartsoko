// Script to create seller profile for user t0SBZri8Pjh0mmOixdYgVf6cCUd2
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with service account
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const USER_ID = 't0SBZri8Pjh0mmOixdYgVf6cCUd2';

async function createSeller() {
  try {
    const sellerData = {
      ownerId: USER_ID,
      name: 'My Smart Store',
      slug: 'my-smart-store',
      description: 'Welcome to my store! Quality products at great prices.',
      category: 'general',
      logoUrl: '',
      bannerUrl: '',
      brandColors: {
        primary: '#064e3b',
        secondary: '#065f46'
      },
      seoDescription: 'Shop the best products at My Smart Store',
      isOpen: true,
      rating: 4.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create seller document with user ID as document ID
    await db.collection('sellers').doc(USER_ID).set(sellerData);
    
    console.log('✅ Seller profile created successfully!');
    console.log('Store URL: /store.html?slug=my-smart-store');
    console.log('Merchant Dashboard: /merchant.html');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating seller:', error);
    process.exit(1);
  }
}

createSeller();
