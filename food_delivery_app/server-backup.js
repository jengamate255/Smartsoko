// SmartSoko API Server - Your Local Marketplace
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'main.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'admin.html'));
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

let db = null;
let admin = null;

try {
  const serviceAccountPath = path.join(__dirname, 'fooddelievry-dce15-firebase-adminsdk-fbsvc-3542bf4162.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    const adminModule = require('firebase-admin');
    admin = adminModule;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'fooddelievry-dce15'
    });
    db = admin.firestore();
    console.log('✅ Firebase initialized successfully - using real database');
  }
} catch (err) {
  console.log('⚠️ Firebase initialization failed:', err.message);
}

// Categories: food, dairy, fruits, groceries, bakery
const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all sellers (restaurants, dairy, fruits, etc.)
app.get('/api/sellers', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const { category } = req.query;
    let query = db.collection('sellers').where('isOpen', '==', true);
    if (category && CATEGORIES.includes(category)) {
      query = query.where('category', '==', category);
    }
    const snapshot = await query.get();
    const sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories with seller counts
app.get('/api/categories', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const categories = [];
    for (const cat of CATEGORIES) {
      const snapshot = await db.collection('sellers')
        .where('isOpen', '==', true)
        .where('category', '==', cat)
        .get();
      categories.push({ name: cat, count: snapshot.size });
    }
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller by ID
app.get('/api/sellers/:sellerId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const doc = await db.collection('sellers').doc(req.params.sellerId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Seller not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products for a seller
app.get('/api/products/:sellerId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('products')
      .where('sellerId', '==', req.params.sellerId)
      .where('isAvailable', '==', true)
      .get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const orderData = {
      ...req.body,
      status: 'pending',
      currency: 'TSh',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('orders').add(orderData);
    res.json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer orders
app.get('/api/orders/:customerId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('orders')
      .where('customerId', '==', req.params.customerId)
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Get available orders
app.get('/api/driver/available-orders', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('orders')
      .where('status', '==', 'ready_for_delivery')
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Accept order
app.put('/api/driver/orders/:orderId/accept', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('orders').doc(req.params.orderId).update({
      driverId: req.body.driverId,
      driverName: req.body.driverName,
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Order accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Update order status
app.put('/api/driver/orders/:orderId/status', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('orders').doc(req.params.orderId).update({
      status: req.body.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: `Status updated to ${req.body.status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller: Get orders
app.get('/api/seller/orders/:sellerId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('orders')
      .where('sellerId', '==', req.params.sellerId)
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller: Update order status
app.put('/api/seller/orders/:orderId/status', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('orders').doc(req.params.orderId).update({
      status: req.body.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: `Status updated to ${req.body.status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller: Add product
app.post('/api/seller/:sellerId/products', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const productData = {
      ...req.body,
      sellerId: req.params.sellerId,
      isAvailable: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('products').add(productData);
    res.json({ id: docRef.id, ...productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller: Update product
app.put('/api/products/:productId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('products').doc(req.params.productId).update(req.body);
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Dashboard stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const ordersSnap = await db.collection('orders').get();
    const sellersSnap = await db.collection('sellers').get();
    const driversSnap = await db.collection('drivers').get();
    const stats = {
      totalOrders: ordersSnap.size,
      activeSellers: sellersSnap.docs.filter(d => d.data().isOpen).length,
      activeDrivers: driversSnap.docs.filter(d => d.data().isOnline).length,
      totalRevenue: ordersSnap.docs.reduce((s, d) => s + (d.data().total || 0), 0),
      categories: {}
    };
    for (const cat of CATEGORIES) {
      const snap = await db.collection('sellers').where('category', '==', cat).get();
      stats.categories[cat] = snap.size;
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', '404.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SmartSoko Server running on http://localhost:${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`📦 Categories: ${CATEGORIES.join(', ')}`);
  console.log(`💰 SmartSoko - Your Local Marketplace`);
  console.log(`🌐 Serving the community with fresh local products`);
});

module.exports = app;
