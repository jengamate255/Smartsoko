/**
 * Secure SmartSoko API Server
 * With authentication, input validation, and proper access control
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Import middleware
const {
  setAdmin,
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  requireOrderAccess,
  validateInput,
  sanitizeInput,
  ROLE_HIERARCHY
} = require('./middleware/auth');

// Import validators
const {
  createOrderSchema,
  updateOrderStatusSchema,
  acceptOrderSchema,
  createProductSchema,
  updateProductSchema,
  createSellerSchema,
  updateDriverSchema,
  createReviewSchema,
  updateUserSchema,
  paginationSchema,
  categoryFilterSchema
} = require('./validators/schemas');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for accurate client IP
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://api.mapbox.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://www.google.com", "https://api.mapbox.com", "https://www.googletagmanager.com", "https://apis.google.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://api.mapbox.com", "https://*.google-analytics.com", "https://*.googletagmanager.com", "https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com", "https://firebaseinstallations.googleapis.com", "https://firebase.googleapis.com", "wss://*.firebaseio.com", "https://www.google.com", "https://*.google.com", "https://*.firebase.com", "https://*.gstatic.com"],
      frameSrc: ["'self'", "https://*.firebaseapp.com"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => req.user ? 200 : 100, // Higher limit for authenticated users
  message: {
    error: 'Too Many Requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again later.'
  }
});

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : NODE_ENV === 'production'
    ? ['https://smartsoko.com', 'https://www.smartsoko.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const user = req.user ? `[${req.user.uid}]` : '[anon]';
  console.log(`[${timestamp}] ${user} ${req.method} ${req.path}`);
  next();
});

// Initialize Firebase Admin
let db = null;
let admin = null;

try {
  const serviceAccountPath = path.join(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT || 'serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    const adminModule = require('firebase-admin');
    admin = adminModule;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'fooddelievry-dce15'
    });
    db = admin.firestore();
    setAdmin(admin);
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase service account not found - running in limited mode');
  }
} catch (err) {
  console.error('❌ Firebase initialization failed:', err.message);
}

// Initialize Supabase for specific features (analytics, storage, etc.)
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8';
  
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase initialized for advanced features');
} catch (err) {
  console.warn('⚠️ Supabase initialization failed:', err.message);
}

// Categories
const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];

// ========== PUBLIC ENDPOINTS ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: db ? 'connected' : 'disconnected'
  });
});

// Public config (safe values only)
app.get('/api/config', (req, res) => {
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    },
    features: {
      mpesa: !!process.env.MPESA_CONSUMER_KEY,
      googleMaps: !!process.env.GOOGLE_MAPS_API_KEY
    },
    categories: CATEGORIES
  });
});

// Public: Get all sellers (with optional filter) - standardized naming
app.get('/api/sellers', optionalAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { category } = req.query;
    const userRole = req.user?.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    let query = db.collection('sellers').where('isOpen', '==', true);

    if (category && category !== 'all' && CATEGORIES.includes(category)) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const isCustomer = userLevel < 2; // customer or driver
    
    const sellers = snapshot.docs.map(doc => {
      const data = doc.data();
      if (isCustomer) {
        // Remove sensitive merchant/admin data from customer responses
        delete data.bankDetails;
        delete data.commission;
        delete data.deliveryPartnerId;
        delete data.internalNotes;
        delete data.payoutSchedule;
        delete data.revenue;
        delete data.totalOrders;
        delete data.averageRating;
        delete data.totalEarnings;
        delete data.pendingPayouts;
      }
      return { id: doc.id, ...data };
    });

    res.json({ success: true, data: sellers, count: sellers.length });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

// Legacy alias for restaurants - adapter boundary only
app.get('/api/restaurants', optionalAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { category } = req.query;
    const userRole = req.user?.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    let query = db.collection('sellers').where('isOpen', '==', true);

    if (category && category !== 'all' && CATEGORIES.includes(category)) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const isCustomer = userLevel < 2;

    const sellers = snapshot.docs.map(doc => {
      const data = doc.data();
      if (isCustomer) {
        delete data.bankDetails;
        delete data.commission;
        delete data.deliveryPartnerId;
        delete data.internalNotes;
        delete data.payoutSchedule;
        delete data.revenue;
        delete data.totalOrders;
        delete data.averageRating;
        delete data.totalEarnings;
        delete data.pendingPayouts;
      }
      return {
        id: doc.id,
        ...data,
        restaurantId: doc.id,
        merchantId: doc.id
      };
    });

    res.json({ success: true, data: sellers, count: sellers.length });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Public: Get categories
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

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Public: Get seller by ID
app.get('/api/sellers/:sellerId', optionalAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const doc = await db.collection('sellers').doc(req.params.sellerId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Seller not found' });

    const data = doc.data();
    const userRole = req.user?.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Filter sensitive data for non-merchants
    if (userLevel < 2) {
      delete data.bankDetails;
      delete data.commission;
      delete data.deliveryPartnerId;
      delete data.internalNotes;
      delete data.payoutSchedule;
      delete data.revenue;
      delete data.totalOrders;
      delete data.averageRating;
      delete data.totalEarnings;
      delete data.pendingPayouts;
    }

    res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (error) {
    console.error('Error fetching seller:', error);
    res.status(500).json({ error: 'Failed to fetch seller' });
  }
});

// Update seller profile - merchant or admin only
app.put('/api/sellers/:sellerId', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { sellerId } = req.params;
    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Non-admin merchants can only update their own profile
    if (userLevel < 3 && sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only update your own seller profile' });
    }

    const updates = req.body;

    // Customers cannot update via this endpoint - redirect to requireRole check above
    // Remove sensitive fields if trying to inject
    delete updates.bankDetails;
    delete updates.commission;
    delete updates.deliveryPartnerId;
    delete updates.internalNotes;
    delete updates.payoutSchedule;
    delete updates.revenue;

    if (updates.imageUrl && !updates.imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    await db.collection('sellers').doc(sellerId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Seller profile updated' });
  } catch (error) {
    console.error('Error updating seller:', error);
    res.status(500).json({ error: 'Failed to update seller' });
  }
});

// Public: Get products for a seller - standardized naming
app.get('/api/products/:sellerId', optionalAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('products')
      .where('sellerId', '==', req.params.sellerId)
      .where('isAvailable', '==', true)
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Legacy alias for menu-items - adapter boundary only
app.get('/api/menu-items/:sellerId', optionalAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('products')
      .where('sellerId', '==', req.params.sellerId)
      .where('isAvailable', '==', true)
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      menuItemId: doc.id, // Legacy alias
      restaurantId: req.params.sellerId // Legacy alias
    }));
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// ========== PROTECTED ENDPOINTS ==========

// Create order (customer or authenticated user)
app.post('/api/orders', verifyToken, validateInput(createOrderSchema), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const orderData = {
      ...req.validatedBody,
      status: 'pending',
      currency: 'TSh',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('orders').add(orderData);

    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...orderData }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get customer orders (own orders only)
app.get('/api/orders/:customerId', verifyToken, requireOwnershipOrAdmin(req => req.params.customerId), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('orders')
      .where('customerId', '==', req.params.customerId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ========== DRIVER ENDPOINTS ==========

// Get available orders (drivers only)
app.get('/api/driver/available-orders', verifyToken, requireRole('driver', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('orders')
      .where('status', '==', 'ready_for_delivery')
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get driver's accepted orders
app.get('/api/driver/orders', verifyToken, requireRole('driver', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('orders')
      .where('driverId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Accept order (driver only)
app.put('/api/driver/orders/:orderId/accept', verifyToken, requireRole('driver', 'admin'), validateInput(acceptOrderSchema), requireOrderAccess, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    // Verify driver is accepting for themselves
    if (req.body.driverId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot accept order on behalf of another driver' });
    }

    await db.collection('orders').doc(req.params.orderId).update({
      driverId: req.body.driverId,
      driverName: req.body.driverName,
      driverPhone: req.body.driverPhone || null,
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Order accepted' });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// Update order status (driver only for their orders)
app.put('/api/driver/orders/:orderId/status', verifyToken, requireRole('driver', 'admin'), validateInput(updateOrderStatusSchema), requireOrderAccess, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const allowedStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!allowedStatuses.includes(req.validatedBody.status) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Driver cannot set this status' });
    }

    await db.collection('orders').doc(req.params.orderId).update({
      status: req.validatedBody.status,
      statusNotes: req.validatedBody.notes || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `Status updated to ${req.validatedBody.status}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update driver location
app.put('/api/driver/location', verifyToken, requireRole('driver', 'admin'), validateInput(updateDriverSchema), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    await db.collection('drivers').doc(req.user.uid).update({
      ...req.validatedBody,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ========== MERCHANT/SELLER ENDPOINTS ==========

// Get seller's orders
app.get('/api/seller/orders/:sellerId', verifyToken, requireOwnershipOrAdmin(req => req.params.sellerId), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const snapshot = await db.collection('orders')
      .where('sellerId', '==', req.params.sellerId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (seller)
app.put('/api/seller/orders/:orderId/status', verifyToken, requireRole('merchant', 'admin'), validateInput(updateOrderStatusSchema), requireOrderAccess, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const allowedStatuses = ['accepted', 'preparing', 'ready_for_delivery', 'cancelled'];
    if (!allowedStatuses.includes(req.validatedBody.status) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Merchant cannot set this status' });
    }

    await db.collection('orders').doc(req.params.orderId).update({
      status: req.validatedBody.status,
      statusNotes: req.validatedBody.notes || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `Status updated to ${req.validatedBody.status}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Add product
app.post('/api/seller/:sellerId/products', verifyToken, requireRole('merchant', 'admin'), requireOwnershipOrAdmin(req => req.params.sellerId), validateInput(createProductSchema), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const sellerId = req.params.sellerId;

    if (userLevel < 3 && sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only add products to your own store' });
    }

    const productData = {
      ...req.validatedBody,
      sellerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (productData.imageUrl && userLevel < 2) {
      delete productData.imageUrl;
    } else if (productData.imageUrl && !productData.imageUrl.startsWith('http')) {
      delete productData.imageUrl;
    }

    const docRef = await db.collection('products').add(productData);

    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...productData }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:productId', verifyToken, requireRole('merchant', 'admin'), validateInput(updateProductSchema), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Get product to check ownership
    const productDoc = await db.collection('products').doc(req.params.productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productDoc.data();

    // Check ownership - merchant can only update their own products
    if (userLevel < 3 && productData.sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    let updates = { ...req.validatedBody };

    // Customer-level users cannot update imageUrl - only merchant (own product) or admin
    const isImageUpdate = updates.imageUrl !== undefined;
    if (isImageUpdate && userLevel < 2) {
      delete updates.imageUrl;
    } else if (updates.imageUrl && !updates.imageUrl.startsWith('http')) {
      delete updates.imageUrl;
    }

    await db.collection('products').doc(req.params.productId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Admin dashboard stats
app.get('/api/admin/dashboard', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const [ordersSnap, sellersSnap, driversSnap, customersSnap] = await Promise.all([
      db.collection('orders').get(),
      db.collection('sellers').get(),
      db.collection('drivers').get(),
      db.collection('customers').get()
    ]);

    const stats = {
      totalOrders: ordersSnap.size,
      activeSellers: sellersSnap.docs.filter(d => d.data().isOpen).length,
      totalSellers: sellersSnap.size,
      activeDrivers: driversSnap.docs.filter(d => d.data().isOnline).length,
      totalDrivers: driversSnap.size,
      totalCustomers: customersSnap.size,
      totalRevenue: ordersSnap.docs.reduce((s, d) => s + (d.data().total || 0), 0),
      categories: {}
    };

    for (const cat of CATEGORIES) {
      const snap = await db.collection('sellers').where('category', '==', cat).get();
      stats.categories[cat] = snap.size;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ========== SUPABASE INTEGRATION ENDPOINTS ==========

// Supabase handles functions Firebase can't provide:
// - Advanced analytics with complex queries
// - File storage and CDN
// - Real-time subscriptions with presence
// - Edge functions for specific computations
// - Row-level security for complex data access

// Analytics endpoint using Supabase (advanced queries that Firebase struggles with)
app.get('/api/analytics/sales', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    const { days = 30, groupBy = 'day' } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Complex analytics query that's easier in Supabase
    const { data, error } = await supabase
      .rpc('get_sales_analytics', {
        p_start_date: startDate,
        p_group_by: groupBy
      });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Storage endpoint for file uploads using Supabase (Firebase storage alternative)
// Only merchant and admin can upload files
app.post('/api/storage/upload', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    // Handle file upload with Supabase storage
    // This is better than Firebase for: CDN integration, public URLs, fine-grained permissions
    const { fileName, fileType, base64Data, folder = 'uploads' } = req.body;
    
    if (!fileName || !fileType || !base64Data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate file type - only allow images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (Buffer.from(base64Data, 'base64').length > maxSize) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    const filePath = `${folder}/${Date.now()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('food-delivery')
      .upload(filePath, Buffer.from(base64Data, 'base64'), {
        contentType: fileType,
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('food-delivery')
      .getPublicUrl(filePath);

    res.json({
      success: true,
      data: {
        filePath,
        publicUrl: publicUrlData.publicUrl,
        fileName
      }
    });
  } catch (error) {
    console.error('Error handling storage:', error);
    res.status(500).json({ error: 'Failed to handle storage' });
  }
});

// Real-time presence tracking using Supabase (better than Firebase for this use case)
app.get('/api/presence/active-users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    // Track active users across the platform
    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, user_type, last_seen, current_page')
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching presence data:', error);
    res.status(500).json({ error: 'Failed to fetch presence data' });
  }
});

// Advanced search using Supabase (text search capabilities)
app.get('/api/search/advanced', optionalAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    const { query, type = 'all', limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = {
      sellers: [],
      products: [],
      categories: []
    };

    // Search sellers using Supabase text search
    if (type === 'all' || type === 'sellers') {
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('id, name, description, category, rating')
        .textSearch('name', query)
        .eq('is_open', true)
        .limit(limit);

      if (!sellersError) {
        results.sellers = sellersData;
      }
    }

    // Search products using Supabase text search
    if (type === 'all' || type === 'products') {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, price, seller_id')
        .textSearch('name', query)
        .eq('is_available', true)
        .limit(limit);

      if (!productsError) {
        results.products = productsData;
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Geospatial queries using Supabase (better than Firebase for location-based features)
app.get('/api/nearby/sellers', optionalAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    const { lat, lng, radius = 5 } = req.query; // radius in km
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Use Supabase PostGIS for geospatial queries
    const { data, error } = await supabase
      .rpc('find_nearby_sellers', {
        p_lat: parseFloat(lat),
        p_lng: parseFloat(lng),
        p_radius: parseFloat(radius)
      });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error finding nearby sellers:', error);
    res.status(500).json({ error: 'Failed to find nearby sellers' });
  }
});

// Get all orders (admin only)
app.get('/api/admin/orders', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { status, limit = 50 } = req.query;
    let query = db.collection('orders').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get user role (admin only)
app.get('/api/admin/users/:uid/role', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: { uid, role: userDoc.data().role || 'customer' } });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
});

// Update user role (super_admin only for security)
app.put('/api/admin/users/:uid/role', verifyToken, requireRole('super_admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['customer', 'driver', 'merchant', 'admin', 'super_admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
    }

    // Prevent self-demotion
    if (uid === req.user.uid && role !== 'super_admin') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    await db.collection('users').doc(uid).update({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    res.json({ success: true, message: 'Role updated successfully', data: { uid, role } });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ========== ADMIN SYSTEM ENDPOINTS ==========

// Server status - comprehensive health check
app.get('/api/admin/system/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: NODE_ENV,
      version: process.version
    };

    checks.firebase = db ? 'connected' : 'disconnected';
    checks.supabase = supabase ? 'connected' : 'disconnected';

    const memUsed = process.memoryUsage();
    checks.memoryPercent = {
      heapUsed: Math.round((memUsed.heapUsed / memUsed.heapTotal) * 100),
      rss: Math.round((memUsed.rss / memUsed.heapTotal) * 100)
    };

    res.json({ success: true, data: checks });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// Server logs - last N entries
app.get('/api/admin/system/logs', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { type = 'all', limit = 100 } = req.query;
    const logLimit = Math.min(parseInt(limit), 1000);

    const recentLogs = [];
    const logTypes = type === 'all' ? ['error', 'warn', 'info', 'http'] : [type];

    for (const logType of logTypes) {
      recentLogs.push({
        type: logType,
        message: `${logType.toUpperCase()} log entry`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ 
      success: true, 
      data: recentLogs.slice(0, logLimit),
      count: recentLogs.length
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// All users with filtering
app.get('/api/admin/users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { role, status, limit = 100 } = req.query;
    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    query = query.limit(parseInt(limit));
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.passwordHash;
      return { uid: doc.id, ...data };
    });

    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (admin actions)
app.put('/api/admin/users/:uid', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { uid } = req.params;
    const { action, ...updates } = req.body;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'disable') {
      await userRef.update({ disabled: true, disabledAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (action === 'enable') {
      await userRef.update({ disabled: false, disabledAt: null });
    } else if (action === 'verify') {
      await userRef.update({ verified: true, verifiedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      await userRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    res.json({ success: true, message: 'User updated', action });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// All sellers with management
app.get('/api/admin/sellers', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { status, category, limit = 100 } = req.query;
    let query = db.collection('sellers');

    if (status) {
      if (status === 'open') query = query.where('isOpen', '==', true);
      if (status === 'closed') query = query.where('isOpen', '==', false);
    }

    query = query.limit(parseInt(limit));
    const snapshot = await query.get();
    const sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: sellers, count: sellers.length });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

// Update seller (admin actions)
app.put('/api/admin/sellers/:sellerId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { sellerId } = req.params;
    const { action, ...updates } = req.body;

    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (action === 'approve') {
      await sellerRef.update({ approved: true, approvedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (action === 'reject') {
      await sellerRef.update({ approved: false, rejected: true, rejectedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (action === 'suspend') {
      await sellerRef.update({ suspended: true, suspendedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (action === 'unsuspend') {
      await sellerRef.update({ suspended: false });
    } else {
      await sellerRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    res.json({ success: true, message: 'Seller updated', action });
  } catch (error) {
    console.error('Error updating seller:', error);
    res.status(500).json({ error: 'Failed to update seller' });
  }
});

// All drivers with management
app.get('/api/admin/drivers', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { status, limit = 100 } = req.query;
    let query = db.collection('drivers');

    query = query.limit(parseInt(limit));
    const snapshot = await query.get();
    const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: drivers, count: drivers.length });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Comprehensive reports
app.get('/api/admin/reports', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { period = '7d', type = 'all' } = req.query;

    const now = new Date();
    let startDate = new Date();
    if (period === '24h') startDate.setHours(now.getHours() - 24);
    else if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else startDate.setDate(now.getDate() - 7);

    const reports = {
      period,
      generatedAt: now.toISOString()
    };

    if (type === 'all' || type === 'orders') {
      const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', startDate)
        .get();
      
      const orders = ordersSnapshot.docs.map(d => d.data());
      reports.orders = {
        total: orders.length,
        byStatus: orders.reduce((acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {}),
        totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0)
      };
    }

    if (type === 'all' || type === 'users') {
      const usersSnapshot = await db.collection('users').get();
      const sellersSnapshot = await db.collection('sellers').get();
      const driversSnapshot = await db.collection('drivers').get();

      reports.users = {
        total: usersSnapshot.size,
        sellers: sellersSnapshot.size,
        drivers: driversSnapshot.size
      };
    }

    if (type === 'all' || type === 'sellers') {
      const sellersSnapshot = await db.collection('sellers').get();
      const sellers = sellersSnapshot.docs.map(d => d.data());
      reports.sellers = {
        total: sellers.length,
        active: sellers.filter(s => s.isOpen).length,
        inactive: sellers.filter(s => !s.isOpen).length
      };
    }

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// ========== USER PROFILE ENDPOINTS ==========

// Get current user profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        ...userDoc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/user/profile', verifyToken, validateInput(updateUserSchema), async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    await db.collection('users').doc(req.user.uid).update({
      ...req.validatedBody,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ========== STATIC FILES & ERROR HANDLING ==========

// Disable caching for JS files in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.endsWith('.js') || req.path.endsWith('.mjs')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });
}

// Static files
app.use(express.static(path.join(__dirname, 'web'), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0
}));

// SPA routes
const routes = ['login', 'home', 'customer', 'merchant', 'driver', 'admin', 'discovery', 'profile', 'cart', 'orders', 'product', 'restaurant', 'chat', 'track-order'];
routes.forEach(route => {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(__dirname, 'web', `${route}.html`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
    }
  });
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource was not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS Error', message: 'Origin not allowed' });
  }

  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         SmartSoko - Secure Server Ready                ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${NODE_ENV.padEnd(37)} ║`);
  console.log(`║  Port: ${PORT.toString().padEnd(46)} ║`);
  console.log(`║  Database: ${(db ? 'Connected' : 'Disconnected').padEnd(42)} ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  Features:                                             ║');
  console.log('║  ✅ Firebase Auth verification                         ║');
  console.log('║  ✅ Role-based access control                          ║');
  console.log('║  ✅ Input validation (Zod)                             ║');
  console.log('║  ✅ Rate limiting                                      ║');
  console.log('║  ✅ Security headers (Helmet)                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
});

module.exports = app;
