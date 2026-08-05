// Data Generation Script for SmartSoko Performance Testing
// Generates: 1M users, 500K products, 5M orders

const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');

// Initialize Firebase Admin from environment variable
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable not set');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? parseInt(args[idx + 1]) : defaultValue;
}

// Configuration
const TARGETS = {
  users: getArg('users', 1000000),      // 1 million users
  products: getArg('products', 500000), // 500k products
  orders: getArg('orders', 5000000),    // 5 million orders
  sellers: getArg('sellers', 10000),    // 10k sellers
  drivers: getArg('drivers', 5000),     // 5k drivers
};

const BATCH_SIZE = 500;
const CONCURRENT_BATCHES = 10;

// Categories for products
const CATEGORIES = [
  { name: 'food', displayName: 'Prepared Food', icon: 'restaurant' },
  { name: 'dairy', displayName: 'Dairy Products', icon: 'water_drop' },
  { name: 'fruits', displayName: 'Fruits & Vegetables', icon: 'nutrition' },
  { name: 'groceries', displayName: 'Groceries', icon: 'shopping_basket' },
  { name: 'bakery', displayName: 'Bakery', icon: 'bakery_dining' },
  { name: 'meat', displayName: 'Meat & Fish', icon: 'set_meal' },
  { name: 'beverages', displayName: 'Beverages', icon: 'local_drink' },
  { name: 'snacks', displayName: 'Snacks', icon: 'cookie' },
];

const CITIES = [
  'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya',
  'Morogoro', 'Tanga', 'Kigoma', 'Moshi', 'Tabora',
];

const VEHICLE_TYPES = ['moped', 'motorcycle', 'bicycle', 'van'];

async function generateUsers() {
  console.log(`Generating ${TARGETS.users} users...`);
  const users = [];
  const batch = [];
  
  for (let i = 0; i < TARGETS.users; i++) {
    const userId = `user-${i.toString().padStart(7, '0')}`;
    const user = {
      id: userId,
      email: `user${i}@smartsoko.test`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      name: faker.person.fullName(),
      role: 'customer',
      city: faker.helpers.arrayElement(CITIES),
      address: faker.location.streetAddress(),
      loyaltyPoints: Math.floor(Math.random() * 10000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      isVerified: Math.random() > 0.3,
      lastLoginAt: faker.date.recent({ days: 30 }),
    };
    
    batch.push({ id: userId, data: user });
    users.push(userId);  // Add to users array for return
    
    if (batch.length >= BATCH_SIZE) {
      await writeBatch('users', batch);
      batch.length = 0;
    }
    
    if (i % 100000 === 0 && i > 0) {
      console.log(`  Generated ${i} users...`);
    }
  }
  
  if (batch.length > 0) {
    await writeBatch('users', batch);
  }
  
  console.log(`✓ Generated ${TARGETS.users} users`);
  return users;
}

async function generateSellers(userIds) {
  console.log(`Generating ${TARGETS.sellers} sellers...`);
  const batch = [];
  
  for (let i = 0; i < TARGETS.sellers; i++) {
    const sellerId = `seller-${i.toString().padStart(5, '0')}`;
    const category = faker.helpers.arrayElement(CATEGORIES);
    const city = faker.helpers.arrayElement(CITIES);
    
    const seller = {
      id: sellerId,
      name: `${faker.company.name()} ${category.displayName}`,
      slug: faker.helpers.slugify(`${faker.company.name()} ${category.name}`).toLowerCase(),
      description: faker.company.catchPhrase(),
      category: category.name,
      address: faker.location.streetAddress({ useFullAddress: true }),
      city: city,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      email: `seller${i}@smartsoko.test`,
      logoUrl: `https://images.unsplash.com/photo-${1568901346375 + i}?w=400`,
      bannerUrl: `https://images.unsplash.com/photo-${1568901346375 + i + 1000}?w=1200`,
      isOpen: Math.random() > 0.1,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      deliveryFee: Math.floor(Math.random() * 5000) + 2000,
      minOrderAmount: Math.floor(Math.random() * 10000),
      openingHours: {
        open: '08:00',
        close: '22:00',
      },
      brandColors: {
        primary: faker.internet.color(),
        secondary: faker.internet.color(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerId: faker.helpers.arrayElement(userIds),
    };
    
    batch.push({ id: sellerId, data: seller });
    
    if (batch.length >= BATCH_SIZE) {
      await writeBatch('sellers', batch);
      batch.length = 0;
    }
    
    if (i % 2000 === 0 && i > 0) {
      console.log(`  Generated ${i} sellers...`);
    }
  }
  
  if (batch.length > 0) {
    await writeBatch('sellers', batch);
  }
  
  console.log(`✓ Generated ${TARGETS.sellers} sellers`);
}

async function generateProducts(sellerIds) {
  console.log(`Generating ${TARGETS.products} products...`);
  const batch = [];
  const productsPerSeller = Math.ceil(TARGETS.products / sellerIds.length);
  
  for (let i = 0; i < TARGETS.products; i++) {
    const sellerId = sellerIds[i % sellerIds.length];
    const category = faker.helpers.arrayElement(CATEGORIES);
    const productId = `product-${i.toString().padStart(6, '0')}`;
    const price = Math.floor(Math.random() * 50000) + 1000;
    
    const product = {
      id: productId,
      name: `${faker.commerce.productName()} ${category.displayName}`,
      description: faker.commerce.productDescription(),
      price: price,
      category: category.name,
      imageUrl: `https://images.unsplash.com/photo-${1568901346375 + Math.floor(Math.random() * 1000)}?w=800`,
      imageUrls: [
        `https://images.unsplash.com/photo-${1568901346375 + Math.floor(Math.random() * 1000)}?w=800`,
        `https://images.unsplash.com/photo-${1568901346375 + Math.floor(Math.random() * 1000) + 1000}?w=800`,
      ],
      merchantId: sellerId,
      sellerId: sellerId,
      isAvailable: Math.random() > 0.05,
      inStock: Math.random() > 0.1,
      stock: Math.floor(Math.random() * 100) + 1,
      lowStockThreshold: 10,
      preparationTime: Math.floor(Math.random() * 60) + 10,
      tags: faker.helpers.arrayElements(['fresh', 'popular', 'organic', 'spicy', 'vegan', 'gluten-free', 'halal'], { min: 1, max: 3 }),
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 500),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    batch.push({ id: productId, data: product });
    
    if (batch.length >= BATCH_SIZE) {
      await writeBatch('products', batch);
      batch.length = 0;
    }
    
    if (i % 50000 === 0 && i > 0) {
      console.log(`  Generated ${i} products...`);
    }
  }
  
  if (batch.length > 0) {
    await writeBatch('products', batch);
  }
  
  console.log(`✓ Generated ${TARGETS.products} products`);
}

async function generateDrivers() {
  console.log(`Generating ${TARGETS.drivers} drivers...`);
  const batch = [];
  const statuses = ['online', 'offline', 'delivery'];
  const statusWeights = [0.3, 0.5, 0.2];
  
  for (let i = 0; i < TARGETS.drivers; i++) {
    const driverId = `driver-${i.toString().padStart(5, '0')}`;
    const status = faker.helpers.weightedArrayElement([
      { weight: 0.3, value: 'online' },
      { weight: 0.5, value: 'offline' },
      { weight: 0.2, value: 'delivery' },
    ]);
    
    const driver = {
      id: driverId,
      full_name: faker.person.fullName(),
      email: `driver${i}@smartsoko.test`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      current_location: {
        lat: -6.7924 + (Math.random() - 0.5) * 0.2,
        lng: 39.2083 + (Math.random() - 0.5) * 0.2,
      },
      status: status,
      vehicle_type: faker.helpers.arrayElement(VEHICLE_TYPES),
      vehicle_plate: `T${String(Math.floor(Math.random() * 900) + 100)}${faker.string.alpha({ length: 3, casing: 'upper' })}`,
      total_deliveries: Math.floor(Math.random() * 5000),
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      is_online: status === 'online' || status === 'delivery',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    batch.push({ id: driverId, data: driver });
    
    if (batch.length >= BATCH_SIZE) {
      await writeBatch('drivers', batch);
      batch.length = 0;
    }
  }
  
  if (batch.length > 0) {
    await writeBatch('drivers', batch);
  }
  
  console.log(`✓ Generated ${TARGETS.drivers} drivers`);
}

async function generateOrders(userIds, sellerIds, productIds, driverIds) {
  console.log(`Generating ${TARGETS.orders} orders...`);
  const batch = [];
  const statuses = ['pending', 'accepted', 'preparing', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
  const statusWeights = [0.05, 0.05, 0.08, 0.08, 0.1, 0.12, 0.12, 0.15, 0.2, 0.05];
  
  for (let i = 0; i < TARGETS.orders; i++) {
    const orderId = `order-${i.toString().padStart(7, '0')}`;
    const customerId = faker.helpers.arrayElement(userIds);
    const sellerId = faker.helpers.arrayElement(sellerIds);
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const productId = faker.helpers.arrayElement(productIds);
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = Math.floor(Math.random() * 30000) + 2000;
      items.push({
        productId,
        name: faker.commerce.productName(),
        quantity,
        price,
        sellerId,
      });
      subtotal += price * quantity;
    }
    
    const deliveryFee = Math.floor(Math.random() * 5000) + 2000;
    const tax = subtotal * 0.18;
    const total = subtotal + deliveryFee + tax;
    
    const status = faker.helpers.weightedArrayElement(
      statuses.map((s, idx) => ({ weight: statusWeights[idx], value: s }))
    );
    
    const order = {
      id: orderId,
      customerId,
      customerName: faker.person.fullName(),
      customerPhone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      customerEmail: `customer${i}@test.com`,
      sellerId,
      sellerName: `Seller ${sellerId}`,
      driverId: ['assigned', 'picked_up', 'in_transit', 'delivered', 'completed'].includes(status) 
        ? faker.helpers.arrayElement(driverIds) : null,
      deliveryAddress: faker.location.streetAddress({ useFullAddress: true }),
      deliveryLocation: {
        lat: -6.7924 + (Math.random() - 0.5) * 0.3,
        lng: 39.2083 + (Math.random() - 0.5) * 0.3,
      },
      items,
      subtotal,
      deliveryFee,
      tax: Math.round(tax),
      total: Math.round(total),
      status,
      paymentMethod: faker.helpers.arrayElement(['mpesa', 'card', 'cash', 'wallet']),
      paymentStatus: status === 'completed' || status === 'delivered' ? 'completed' : 'pending',
      notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : '',
      createdAt: admin.firestore.Timestamp.fromDate(faker.date.past({ years: 1 })),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedAt: ['accepted', 'preparing', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed'].includes(status)
        ? admin.firestore.Timestamp.fromDate(faker.date.recent({ days: 30 })) : null,
      preparingAt: ['preparing', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed'].includes(status)
        ? admin.firestore.Timestamp.fromDate(faker.date.recent({ days: 30 })) : null,
      dispatchedAt: ['assigned', 'picked_up', 'in_transit', 'delivered', 'completed'].includes(status)
        ? admin.firestore.Timestamp.fromDate(faker.date.recent({ days: 30 })) : null,
      deliveredAt: ['delivered', 'completed'].includes(status)
        ? admin.firestore.Timestamp.fromDate(faker.date.recent({ days: 30 })) : null,
    };
    
    batch.push({ id: orderId, data: order });
    
    if (batch.length >= BATCH_SIZE) {
      await writeBatch('orders', batch);
      batch.length = 0;
    }
    
    if (i % 500000 === 0 && i > 0) {
      console.log(`  Generated ${i} orders...`);
    }
  }
  
  if (batch.length > 0) {
    await writeBatch('orders', batch);
  }
  
  console.log(`✓ Generated ${TARGETS.orders} orders`);
}

async function writeBatch(collectionName, batch) {
  const writeBatch = db.batch();
  
  for (const item of batch) {
    const ref = db.collection(collectionName).doc(item.id);
    writeBatch.set(ref, item.data);
  }
  
  await writeBatch.commit();
}

async function main() {
  console.log('=== SmartSoko Data Generation Started ===');
  console.log(`Targets: ${JSON.stringify(TARGETS, null, 2)}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Generate in order: users -> sellers -> products -> drivers -> orders
    const userIds = await generateUsers();
    await generateSellers(userIds);
    
    // Get seller IDs for products
    const sellerIds = Array.from({ length: TARGETS.sellers }, (_, i) => `seller-${i.toString().padStart(5, '0')}`);
    await generateProducts(sellerIds);
    
    await generateDrivers();
    
    // Get product and driver IDs for orders
    const productIds = Array.from({ length: TARGETS.products }, (_, i) => `product-${i.toString().padStart(6, '0')}`);
    const driverIds = Array.from({ length: TARGETS.drivers }, (_, i) => `driver-${i.toString().padStart(5, '0')}`);
    
    await generateOrders(userIds, sellerIds, productIds, driverIds);
    
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    console.log(`\n=== Data Generation Complete ===`);
    console.log(`Time elapsed: ${elapsed.toFixed(2)} minutes`);
    console.log(`Total documents: ${TARGETS.users + TARGETS.sellers + TARGETS.products + TARGETS.drivers + TARGETS.orders}`);
    
  } catch (error) {
    console.error('Error during data generation:', error);
    process.exit(1);
  }
}

main();