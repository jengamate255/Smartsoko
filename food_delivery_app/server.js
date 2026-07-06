// SmartSoko API Server - Your Local Marketplace
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const { body, param, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://api.mapbox.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://fonts.googleapis.com", "https://apis.google.com", "https://accounts.google.com", "https://api.mapbox.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.mapbox.com", "https://*.tile.openstreetmap.org", "https://*.tile.thunderforest.com"],
      connectSrc: ["'self'", "https://firestore.googleapis.com", "https://*.firebaseio.com", "https://www.gstatic.com", "https://accounts.google.com", "https://apis.google.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.firebaseapp.com", "https://api.mapbox.com", "https://events.mapbox.com", "https://*.openstreetmap.org", "https://unpkg.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [/\.vercel\.app$/, /\.web\.app$/, /\.netlify\.app$/] : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Static files with caching
app.use(express.static(path.join(__dirname, 'web'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Validation middleware helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

let db = null;
let admin = null;

// Initialize Firebase with environment variable or fallback
function initFirebase() {
  try {
    const adminModule = require('firebase-admin');
    admin = adminModule;
    
    // Check for base64 encoded service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fooddelievry-dce15'
      });
      db = admin.firestore();
      console.log('✅ Firebase initialized from environment variable');
      return true;
    }
    
    console.log('⚠️ No Firebase service account configured. Using mock mode.');
    return false;
  } catch (err) {
    console.log('⚠️ Firebase initialization failed:', err.message);
    return false;
  }
}

initFirebase();

// Categories: food, dairy, fruits, groceries, bakery
const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];

// API Routes

// Health check endpoint with more details
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: db ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
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

// Create order with validation
app.post('/api/orders', [
  body('customerId').isString().trim().notEmpty(),
  body('sellerId').isString().trim().notEmpty(),
  body('items').isArray().notEmpty(),
  body('total').isFloat({ min: 0 }),
  body('deliveryAddress').isString().trim().notEmpty(),
  validate
], async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const orderData = {
      customerId: req.body.customerId,
      sellerId: req.body.sellerId,
      items: req.body.items,
      total: req.body.total,
      deliveryAddress: req.body.deliveryAddress,
      status: 'pending',
      currency: 'TSh',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('orders').add(orderData);
    res.status(201).json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer orders with ID validation
app.get('/api/orders/:customerId', [
  param('customerId').isString().trim().notEmpty(),
  validate
], async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('orders')
      .where('customerId', '==', req.params.customerId)
      .orderBy('createdAt', 'desc')
      .limit(50)
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

// Enhanced error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Auth API endpoints for mobile/web bridge
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password are required' 
    });
  }

  // If Firebase admin is available, authenticate with Firebase
  if (admin && admin.auth) {
    res.json({
      success: false,
      error: 'Please use Firebase Auth directly for authentication. Backend auth endpoint is for mobile bridge only.'
    });
    return;
  }

  // Mock response for development
  res.json({
    success: false,
    error: 'Firebase Admin not configured. Use Firebase Auth directly.'
  });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email, password, and name are required' 
    });
  }

  res.json({
    success: false,
    error: 'Please use Firebase Auth directly for registration.'
  });
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
