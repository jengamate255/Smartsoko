const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'fooddelievry-dce15' });
}
const db = admin.firestore();

async function seed() {
  console.log('🌱 Seeding full marketplace data...\n');

  const sellers = [
    { id: 'test-restaurant-001', name: "Mama Ntilie's Kitchen", category: 'food', description: 'Authentic Tanzanian meals', isOpen: true, rating: 4.8, ownerId: 'mock-merchant-001', address: 'Kariakoo, Dar es Salaam' },
    { id: 'seller-dairy-001', name: 'Mzimu Dairy Farm', category: 'dairy', description: 'Fresh milk, cheese and yogurt', isOpen: true, rating: 4.5, ownerId: 'owner-dairy-001', address: 'Bagamoyo Road' },
    { id: 'seller-fruits-001', name: 'Tropicana Fruits', category: 'fruits', description: 'Seasonal tropical fruits', isOpen: true, rating: 4.9, ownerId: 'owner-fruits-001', address: 'Mwenge Market' },
    { id: 'seller-grocery-001', name: 'Soko Kuu Groceries', category: 'groceries', description: 'Daily essentials and household items', isOpen: true, rating: 4.3, ownerId: 'owner-grocery-001', address: 'Ilala District' },
    { id: 'seller-bakery-001', name: 'Golden Crust Bakery', category: 'bakery', description: 'Fresh bread, cakes and pastries', isOpen: true, rating: 4.7, ownerId: 'owner-bakery-001', address: 'Kinondoni' }
  ];

  const products = [
    { id: 'prod-001', name: 'Fresh Whole Milk (1L)', price: 3000, category: 'dairy', sellerId: 'seller-dairy-001', seller: 'Mzimu Dairy Farm', isAvailable: true },
    { id: 'prod-002', name: 'Organic Yogurt (500ml)', price: 4500, category: 'dairy', sellerId: 'seller-dairy-001', seller: 'Mzimu Dairy Farm', isAvailable: true },
    { id: 'prod-003', name: 'Ripe Mangoes (1kg)', price: 5000, category: 'fruits', sellerId: 'seller-fruits-001', seller: 'Tropicana Fruits', isAvailable: true },
    { id: 'prod-004', name: 'Sweet Bananas (Bunch)', price: 2000, category: 'fruits', sellerId: 'seller-fruits-001', seller: 'Tropicana Fruits', isAvailable: true },
    { id: 'prod-005', name: 'Avocado (3 pcs)', price: 3500, category: 'fruits', sellerId: 'seller-fruits-001', seller: 'Tropicana Fruits', isAvailable: true },
    { id: 'prod-006', name: 'Basmati Rice (5kg)', price: 18000, category: 'groceries', sellerId: 'seller-grocery-001', seller: 'Soko Kuu Groceries', isAvailable: true },
    { id: 'prod-007', name: 'Sunflower Oil (2L)', price: 12000, category: 'groceries', sellerId: 'seller-grocery-001', seller: 'Soko Kuu Groceries', isAvailable: true },
    { id: 'prod-008', name: 'Brown Sugar (1kg)', price: 4000, category: 'groceries', sellerId: 'seller-grocery-001', seller: 'Soko Kuu Groceries', isAvailable: true },
    { id: 'prod-009', name: 'Sourdough Bread Loaf', price: 6000, category: 'bakery', sellerId: 'seller-bakery-001', seller: 'Golden Crust Bakery', isAvailable: true },
    { id: 'prod-010', name: 'Chocolate Cake (Whole)', price: 25000, category: 'bakery', sellerId: 'seller-bakery-001', seller: 'Golden Crust Bakery', isAvailable: true },
    { id: 'prod-011', name: 'Croissants (6 pcs)', price: 8000, category: 'bakery', sellerId: 'seller-bakery-001', seller: 'Golden Crust Bakery', isAvailable: true },
    { id: 'prod-012', name: 'Fresh Cheese (250g)', price: 7500, category: 'dairy', sellerId: 'seller-dairy-001', seller: 'Mzimu Dairy Farm', isAvailable: true }
  ];

  const users = [
    { id: 'mock-merchant-001', email: 'merchant@smartsoko.com', name: 'Soko Merchant', role: 'merchant' },
    { id: 'mock-admin-001', email: 'admin@smartsoko.com', name: 'Admin User', role: 'admin' },
    { id: 'mock-driver-001', email: 'driver@smartsoko.com', name: 'Soko Driver', role: 'driver' },
    { id: 'demo-customer-001', email: 'demo@smartsoko.com', name: 'Demo Customer', role: 'customer' },
    { id: 'test-customer-001', email: 'ashura@example.com', name: 'Ashura Mteja', role: 'customer' }
  ];

  for (const s of sellers) {
    await db.collection('sellers').doc(s.id).set({ ...s, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log(`✅ Sellers: ${sellers.length}`);

  for (const p of products) {
    await db.collection('products').doc(p.id).set({ ...p, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log(`✅ Products: ${products.length}`);

  for (const u of users) {
    await db.collection('users').doc(u.id).set({ ...u, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log(`✅ Users: ${users.length}`);

  console.log('\n🎉 Marketplace seeded! Refresh your browser.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
