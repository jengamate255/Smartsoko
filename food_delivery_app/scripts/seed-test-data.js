// Seed test data for SmartSoko
// Run: node scripts/seed-test-data.js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fooddelievry-dce15'
  });
}

const db = admin.firestore();

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create Test Seller/Restaurant
    const restaurantRef = db.collection('restaurants').doc('test-restaurant-001');
    await restaurantRef.set({
      name: "Mama Ntilie's Kitchen",
      category: "food",
      description: "Authentic home-cooked Tanzanian meals. Fresh ingredients, traditional recipes.",
      address: "Kariakoo, Dar es Salaam",
      phone: "+255 712 345 678",
      email: "mama.ntilie@example.com",
      deliveryFee: 3000,
      deliveryTimeMinutes: 45,
      rating: 4.8,
      isOpen: true,
      isActive: true,
      totalOrders: 156,
      totalRevenue: 2450000,
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Created test restaurant: Mama Ntilie\'s Kitchen');

    // 2. Create Seller reference
    await db.collection('sellers').doc('test-restaurant-001').set({
      ownerId: 'test-restaurant-001',
      name: "Mama Ntilie's Kitchen",
      category: "food",
      description: "Authentic home-cooked Tanzanian meals. Fresh ingredients, traditional recipes.",
      isOpen: true,
      rating: 4.8,
      role: 'merchant',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Created seller reference');

    // 3. Create Menu Items
    const menuItems = [
      {
        id: 'menu-item-001',
        name: "Ugali na Nyama Choma",
        description: "Traditional ugali with grilled beef, served with kachumbari",
        price: 15000,
        category: "food",
        sellerId: "test-restaurant-001",
        restaurantName: "Mama Ntilie's Kitchen",
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'menu-item-002',
        name: "Pilau ya Kuku",
        description: "Aromatic rice pilau with tender chicken and spices",
        price: 12000,
        category: "food",
        sellerId: "test-restaurant-001",
        restaurantName: "Mama Ntilie's Kitchen",
        imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'menu-item-003',
        name: "Chapati za Kukaanga",
        description: "Fluffy fried chapatis, perfect for breakfast or dinner",
        price: 3000,
        category: "food",
        sellerId: "test-restaurant-001",
        restaurantName: "Mama Ntilie's Kitchen",
        imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'menu-item-004',
        name: "Mchicha wa Nazi",
        description: "Creamy spinach cooked in coconut milk",
        price: 5000,
        category: "food",
        sellerId: "test-restaurant-001",
        restaurantName: "Mama Ntilie's Kitchen",
        imageUrl: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400",
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const item of menuItems) {
      await db.collection('products').doc(item.id).set(item);
    }
    console.log(`✅ Created ${menuItems.length} menu items`);

    // 4. Create Test Driver
    const driverRef = db.collection('drivers').doc('test-driver-001');
    await driverRef.set({
      name: "John Dereva",
      phone: "+255 723 456 789",
      email: "john.dereva@example.com",
      vehicleType: "motorcycle",
      licensePlate: "T123 ABC",
      isActive: true,
      isOnline: true,
      currentLocation: {
        lat: -6.7924,
        lng: 39.2083,
        address: "Posta, Dar es Salaam"
      },
      totalDeliveries: 89,
      rating: 4.7,
      earnings: 456000,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Created test driver: John Dereva');

    // 5. Create Test Customer
    const customerRef = db.collection('customers').doc('test-customer-001');
    await customerRef.set({
      name: "Ashura Mteja",
      phone: "+255 734 567 890",
      email: "ashura.mteja@example.com",
      address: "Mikocheni, Dar es Salaam",
      savedAddresses: [
        {
          label: "Home",
          address: "Mikocheni B, Near Coca-Cola Plant",
          lat: -6.7654,
          lng: 39.2212
        }
      ],
      totalOrders: 12,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Created test customer: Ashura Mteja');

    // 6. Create Test Orders (for driver testing)
    const orders = [
      {
        id: 'order-001',
        status: 'ready_for_delivery',
        customerId: 'test-customer-001',
        customerName: 'Ashura Mteja',
        customerPhone: '+255 734 567 890',
        customerAddress: 'Mikocheni B, Near Coca-Cola Plant',
        deliveryAddress: {
          street: 'Mikocheni B',
          area: 'Near Coca-Cola Plant',
          lat: -6.7654,
          lng: 39.2212
        },
        restaurantId: 'test-restaurant-001',
        restaurantName: "Mama Ntilie's Kitchen",
        restaurantAddress: 'Kariakoo, Dar es Salaam',
        items: [
          {
            menuItemId: 'menu-item-001',
            name: 'Ugali na Nyama Choma',
            quantity: 2,
            price: 15000
          },
          {
            menuItemId: 'menu-item-003',
            name: 'Chapati za Kukaanga',
            quantity: 4,
            price: 3000
          }
        ],
        subtotal: 42000,
        deliveryFee: 3000,
        total: 45000,
        paymentMethod: 'mpesa',
        paymentStatus: 'paid',
        driverId: null,
        driverName: null,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 60000)), // 30 mins ago
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'order-002',
        status: 'ready_for_delivery',
        customerId: 'test-customer-001',
        customerName: 'Ashura Mteja',
        customerPhone: '+255 734 567 890',
        customerAddress: 'Masaki, Oyster Bay',
        deliveryAddress: {
          street: 'Haile Selassie Road',
          area: 'Masaki',
          lat: -6.7489,
          lng: 39.2712
        },
        sellerId: 'test-restaurant-001',
        restaurantName: "Mama Ntilie's Kitchen",
        restaurantAddress: 'Kariakoo, Dar es Salaam',
        items: [
          {
            menuItemId: 'menu-item-002',
            name: 'Pilau ya Kuku',
            quantity: 1,
            price: 12000
          },
          {
            menuItemId: 'menu-item-004',
            name: 'Mchicha wa Nazi',
            quantity: 1,
            price: 5000
          }
        ],
        subtotal: 17000,
        deliveryFee: 3000,
        total: 20000,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        driverId: null,
        driverName: null,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 60000)), // 15 mins ago
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'order-003',
        status: 'accepted',
        customerId: 'test-customer-001',
        customerName: 'Ashura Mteja',
        customerPhone: '+255 734 567 890',
        customerAddress: 'Mikocheni, Dar es Salaam',
        deliveryAddress: {
          street: 'Mikocheni B',
          area: 'Near Coca-Cola Plant',
          lat: -6.7654,
          lng: 39.2212
        },
        restaurantId: 'test-restaurant-001',
        restaurantName: "Mama Ntilie's Kitchen",
        restaurantAddress: 'Kariakoo, Dar es Salaam',
        items: [
          {
            menuItemId: 'menu-item-001',
            name: 'Ugali na Nyama Choma',
            quantity: 1,
            price: 15000
          }
        ],
        subtotal: 15000,
        deliveryFee: 3000,
        total: 18000,
        paymentMethod: 'mpesa',
        paymentStatus: 'paid',
        driverId: 'test-driver-001',
        driverName: 'John Dereva',
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 45 * 60000)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const order of orders) {
      await db.collection('orders').doc(order.id).set(order);
    }
    console.log(`✅ Created ${orders.length} test orders`);
    console.log('   - 2 orders ready for delivery (for driver testing)');
    console.log('   - 1 order accepted by driver');

    console.log('\n🎉 Test data seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('  Restaurant: Mama Ntilie\'s Kitchen (ID: test-restaurant-001)');
    console.log('  Driver: John Dereva (ID: test-driver-001)');
    console.log('  Customer: Ashura Mteja (ID: test-customer-001)');
    console.log('\nYou can now test:');
    console.log('  - Seller: http://localhost:3000/merchant.html');
    console.log('  - Driver: http://localhost:3000/driver.html');
    console.log('  - Customer: http://localhost:3000/customer.html');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestData();
