// SmartSoko API Server - Your Local Marketplace
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const { body, param, validationResult } = require('express-validator');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.google.com", "https://pay.pesapal.com", "https://cybqa.pesapal.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://api.mapbox.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://fonts.googleapis.com", "https://apis.google.com", "https://accounts.google.com", "https://api.mapbox.com", "https://unpkg.com", "https://www.googletagmanager.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.mapbox.com", "https://*.tile.openstreetmap.org", "https://*.tile.thunderforest.com"],
      connectSrc: ["'self'", "https://firestore.googleapis.com", "https://firebase.googleapis.com", "https://firebaseinstallations.googleapis.com", "https://*.firebaseio.com", "https://www.gstatic.com", "https://accounts.google.com", "https://apis.google.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.firebaseapp.com", "https://*.supabase.co", "https://api.mapbox.com", "https://events.mapbox.com", "https://*.openstreetmap.org", "https://unpkg.com", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.google.com", "https://*.google.com", "https://*.gstatic.com", "https://*.googletagmanager.com", "https://*.googleapis.com"]
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

app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

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

// Public assets (favicon, images, PWA icons)
app.use(express.static(path.join(__dirname, 'public')));

// AI Product Agent routes
const aiProductAgentRoutes = require('./server/src/routes/ai/product-agent');

// Extensionless HTML URL support
const webDir = path.join(__dirname, 'web');
const htmlFiles = fs.readdirSync(webDir).filter(f => f.endsWith('.html'));
htmlFiles.forEach(f => {
  const route = '/' + f.replace(/\.html$/, '');
  if (route !== '/index') {
    app.get(route, (req, res) => {
      res.sendFile(path.join(webDir, f));
    });
  }
});

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
    // Check for base64 encoded service account (firebase-admin)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const adminModule = require('firebase-admin');
      admin = adminModule;
      const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'fooddelievry-dce15'
      });
      db = admin.firestore();
      console.log('✅ Firebase initialized from service account');
      return true;
    }

    // Fallback: web SDK config (public read rules allow duplicate detection)
    if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
      const firebase = require('firebase/compat/app');
      require('firebase/compat/firestore');
      const firebaseApp = firebase.initializeApp({
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      });
      db = firebaseApp.firestore();
      admin = null;
      console.log('✅ Firebase initialized from web SDK config (compat)');
      return true;
    }
    
    console.log('⚠️ No Firebase configuration. Using mock mode.');
    return false;
  } catch (err) {
    console.log('⚠️ Firebase initialization failed:', err.message);
    return false;
  }
}

initFirebase();
app.set('db', db);

// Initialize Supabase as fallback
let supabase = null;
function initSupabase() {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('✅ Supabase client initialized');
      return true;
    }
    console.log('⚠️ No Supabase configuration.');
    return false;
  } catch (err) {
    console.log('⚠️ Supabase initialization failed:', err.message);
    return false;
  }
}
initSupabase();
app.set('supabase', supabase);

// Helper: reject if a promise does not settle within `ms` (prevents hung gRPC/REST calls
// from stalling requests indefinitely; the underlying op keeps running but is abandoned).
const FIRESTORE_TIMEOUT_MS = Number(process.env.FIRESTORE_TIMEOUT_MS || 4000);
const SUPABASE_TIMEOUT_MS = Number(process.env.SUPABASE_TIMEOUT_MS || 8000);

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'ETIMEDOUT_APP';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isTimeoutError(err) {
  return err && (err.code === 'ETIMEDOUT_APP' || /timed out after \d+ms/.test(err.message || ''));
}

// Safe server timestamp — works with both admin SDK and web SDK (compat) modes.
function serverTimestamp() {
  if (admin && admin.firestore && admin.firestore.FieldValue) {
    return admin.firestore.FieldValue.serverTimestamp();
  }
  return new Date().toISOString();
}

// Postgres columns are snake_case while Firestore documents are camelCase; translate both ways
// so the Supabase fallback returns responses shaped exactly like the Firestore path.
function toSnakeCase(s) {
  return String(s).replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}
function toCamelCase(s) {
  return String(s).replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function rowToCamel(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toCamelCase(k)] = v;
  return out;
}

// Helper: query Firestore with Supabase fallback on quota exhaustion or slow/hung responses.
// Rationale: the Firebase admin SDK's gRPC channels can stall for 10-45s+ on degraded
// networks while Supabase REST stays fast; without a timeout every DB-backed request hangs.
// Circuit breaker: after consecutive Firestore timeouts, skip Firestore entirely for a
// cooldown window so users don't pay the timeout cost on every request.
const FS_BREAK_THRESHOLD = Number(process.env.FIRESTORE_BREAK_THRESHOLD || 2);
const FS_BREAK_COOLDOWN_MS = Number(process.env.FIRESTORE_BREAK_COOLDOWN_MS || 5 * 60 * 1000);
let _fsConsecutiveTimeouts = 0;
let _fsBreakOpenUntil = 0;

function firestoreCircuitOpen() {
  return Date.now() < _fsBreakOpenUntil;
}

async function queryFirestoreWithFallback(collection, options = {}) {
  // Try Firestore first (unless the circuit breaker is open)
  if (db && !firestoreCircuitOpen()) {
    try {
      let query = db.collection(collection);
      if (options.where) {
        for (const [field, op, value] of options.where) {
          query = query.where(field, op, value);
        }
      }
      if (options.orderBy) query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
      if (options.limit) query = query.limit(options.limit);
      const snapshot = await withTimeout(query.get(), FIRESTORE_TIMEOUT_MS, `Firestore ${collection} query`);
      _fsConsecutiveTimeouts = 0;
      return { data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), source: 'firestore' };
    } catch (err) {
      if (err.code === 8 || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('Quota exceeded')) {
        console.warn(`⚠️ Firestore quota exceeded for ${collection}, falling back to Supabase`);
      } else if (isTimeoutError(err)) {
        _fsConsecutiveTimeouts += 1;
        if (_fsConsecutiveTimeouts >= FS_BREAK_THRESHOLD) {
          _fsBreakOpenUntil = Date.now() + FS_BREAK_COOLDOWN_MS;
          console.warn(`⚠️ Firestore circuit OPEN for ${Math.round(FS_BREAK_COOLDOWN_MS / 60000)}min after ${_fsConsecutiveTimeouts} timeouts`);
        }
        console.warn(`⚠️ Firestore ${collection} timed out (${FIRESTORE_TIMEOUT_MS}ms), falling back to Supabase`);
      } else {
        throw err;
      }
    }
  } else if (db && firestoreCircuitOpen()) {
    console.log(`[db] Firestore circuit open; serving ${collection} from Supabase`);
  }
  // Fallback to Supabase
  if (supabase) {
    let queryBuilder = supabase.from(collection).select('*');
    if (options.where) {
      for (const [field, op, value] of options.where) {
        const col = toSnakeCase(field);
        if (op === '==') queryBuilder = queryBuilder.eq(col, value);
        else if (op === '!=') queryBuilder = queryBuilder.neq(col, value);
        else if (op === '>') queryBuilder = queryBuilder.gt(col, value);
        else if (op === '<') queryBuilder = queryBuilder.lt(col, value);
        else if (op === '>=') queryBuilder = queryBuilder.gte(col, value);
        else if (op === '<=') queryBuilder = queryBuilder.lte(col, value);
        else if (op === 'in') queryBuilder = queryBuilder.in(col, value);
      }
    }
    if (options.orderBy) queryBuilder = queryBuilder.order(toSnakeCase(options.orderBy.field), { ascending: (options.orderBy.direction || 'asc') === 'asc' });
    if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
    const { data, error } = await withTimeout(queryBuilder, SUPABASE_TIMEOUT_MS, `Supabase ${collection} query`);
    if (error) throw error;
    return { data: (data || []).map(rowToCamel), source: 'supabase' };
  }
  return { data: [], source: 'none' };
}

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
    supabase: supabase ? 'connected' : 'disconnected',
    firestoreCircuit: db ? (firestoreCircuitOpen() ? 'open (fallback)' : 'closed') : 'n/a',
    environment: process.env.NODE_ENV || 'development'
  });
});

// App config endpoint (pricing, currency, delivery fee)
app.get('/api/config', (req, res) => {
  res.json({
    pricing: {
      deliveryFee: parseInt(process.env.DELIVERY_FEE) || 2000,
      taxRate: parseFloat(process.env.TAX_RATE) || 0.18,
      currency: process.env.CURRENCY || 'TSh'
    },
    payment: {
      mpesa: !!process.env.MPESA_CONSUMER_KEY,
      pesapal: !!process.env.PESAPAL_CONSUMER_KEY,
      ntzs: !!process.env.NTZS_API_KEY
    }
  });
});

// Get all sellers (restaurants, dairy, fruits, etc.)
app.get('/api/sellers', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const { category } = req.query;
    const where = [['isOpen', '==', true]];
    if (category && CATEGORIES.includes(category)) {
      where.push(['category', '==', category]);
    }
    const result = await queryFirestoreWithFallback('sellers', { where });
    console.log(`[API] /api/sellers: ${result.data.length} sellers (source: ${result.source})`);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories with seller counts
let _categoriesCache = null;
let _categoriesCacheTime = 0;

app.get('/api/categories', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    
    const now = Date.now();
    if (_categoriesCache && (now - _categoriesCacheTime) < 60000) {
      return res.json(_categoriesCache);
    }

    // Fetch all open sellers once, count by category in memory
    const result = await queryFirestoreWithFallback('sellers', {
      where: [['isOpen', '==', true]]
    });
    const counts = {};
    for (const cat of CATEGORIES) counts[cat] = 0;
    result.data.forEach(doc => {
      const cat = doc.category;
      if (counts[cat] !== undefined) counts[cat]++;
    });
    
    const categories = CATEGORIES.map(cat => ({ name: cat, count: counts[cat] }));
    _categoriesCache = categories;
    _categoriesCacheTime = now;
    console.log(`[API] /api/categories: ${result.data.length} sellers (source: ${result.source})`);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller by ID
app.get('/api/sellers/:sellerId', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const result = await queryFirestoreWithFallback('sellers', {
      where: [['__name__', '==', req.params.sellerId]],
      limit: 1
    });
    if (!result.data.length) return res.status(404).json({ error: 'Seller not found' });
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products for a seller
app.get('/api/products/:sellerId', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const result = await queryFirestoreWithFallback('products', {
      where: [['sellerId', '==', req.params.sellerId], ['isAvailable', '==', true]]
    });
    res.json(result.data);
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const result = await queryFirestoreWithFallback('orders', {
      where: [['customerId', '==', req.params.customerId]],
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 50
    });
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Get available orders
let _availableOrdersCache = [];
let _availableOrdersCacheTime = 0;

app.get('/api/driver/available-orders', async (req, res) => {
  const start = Date.now();
  console.log('[API] GET /api/driver/available-orders');
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    
    const now = Date.now();
    if (_availableOrdersCache.length > 0 && (now - _availableOrdersCacheTime) < 30000) {
      console.log('[API] available-orders: serving from cache');
      return res.json(_availableOrdersCache);
    }
    
    if (now - _availableOrdersCacheTime > 300000) {
      console.log('[API] available-orders: cache expired, attempting query');
      try {
        const result = await queryFirestoreWithFallback('orders', {
          where: [['status', '==', 'ready_for_delivery']]
        });
        _availableOrdersCache = result.data;
        _availableOrdersCacheTime = now;
        console.log(`[API] available-orders: ${result.data.length} orders in ${Date.now() - start}ms (source: ${result.source})`);
        return res.json(result.data);
      } catch (e) {
        console.warn('[API] available-orders: query failed:', e.message);
      }
    }
    
    console.log('[API] available-orders: returning cached data');
    res.json(_availableOrdersCache);
  } catch (error) {
    console.error('[API] available-orders error:', error);
    res.json(_availableOrdersCache);
  }
});

// Driver: Get active orders for a driver
app.get('/api/driver/:driverId/active-orders', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const result = await queryFirestoreWithFallback('orders', {
      where: [['driverId', '==', req.params.driverId]]
    });
    const ACTIVE = ['assigned', 'accepted', 'picked_up', 'pickedup', 'in_transit'];
    const orders = result.data.filter(o => ACTIVE.includes(o.status));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Get profile
app.get('/api/driver/:driverId/profile', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snap = await db.collection('drivers').doc(req.params.driverId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Create or update profile
app.put('/api/driver/:driverId/profile', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('drivers').doc(req.params.driverId).set({
      ...req.body,
      ownerId: req.params.driverId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    res.json({ message: 'Profile saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Update online status
app.put('/api/driver/:driverId/status', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    await db.collection('drivers').doc(req.params.driverId).set({
      isOnline: req.body.isOnline,
      available: req.body.isOnline,
      status: req.body.isOnline ? 'online' : 'offline',
      updatedAt: serverTimestamp()
    }, { merge: true });
    res.json({ message: `Driver is now ${req.body.isOnline ? 'online' : 'offline'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Get earnings
app.get('/api/driver/:driverId/earnings', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const uid = req.params.driverId;
    
    const [walletSnap, txnSnap, ordersSnap] = await Promise.all([
      db.collection('wallets').doc(uid).get(),
      db.collection('transactions').where('userId', '==', uid).where('type', '==', 'delivery_earning').get(),
      db.collection('orders').where('driverId', '==', uid).get()
    ]);
    
    const wallet = walletSnap.exists ? walletSnap.data() : {};
    const txns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const delivered = allOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
    
    res.json({
      balance: Number(wallet.balance) || 0,
      totalEarned: Number(wallet.totalEarned) || 0,
      totalDeliveries: Number(wallet.totalDeliveries) || 0,
      transactions: txns,
      completedCount: delivered.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Get order with seller coordinates (for navigation)
app.get('/api/driver/order/:orderId/navigation', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const orderSnap = await db.collection('orders').doc(req.params.orderId).get();
    if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });
    const order = orderSnap.data();
    
    const sellerId = order.sellerId || order.merchantId;
    let sellerCoords = null;
    if (sellerId) {
      const sellerSnap = await db.collection('sellers').doc(sellerId).get();
      if (sellerSnap.exists) {
        const s = sellerSnap.data();
        if (s.latitude != null && s.longitude != null) {
          sellerCoords = { lat: s.latitude, lng: s.longitude, name: s.name || s.storeName || 'Merchant' };
        }
      }
    }
    
    res.json({
      orderId: req.params.orderId,
      status: order.status,
      sellerId,
      sellerCoords,
      customerCoords: (order.deliveryLat != null && order.deliveryLng != null)
        ? { lat: order.deliveryLat, lng: order.deliveryLng }
        : null,
      customerAddress: order.customerAddress || order.deliveryAddress || ''
    });
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
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
      updatedAt: serverTimestamp()
    });
    res.json({ message: `Status updated to ${req.body.status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Driver: Complete delivery (handles wallet/earnings)
app.put('/api/driver/orders/:orderId/complete', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    
    const uid = req.body.driverId;
    if (!uid) return res.status(400).json({ error: 'driverId required' });
    
    const orderRef = db.collection('orders').doc(req.params.orderId);
    const walletRef = db.collection('wallets').doc(uid);
    const driverRef = db.collection('drivers').doc(uid);
    
    await db.runTransaction(async (tx) => {
      const [orderSnap, walletSnap] = await Promise.all([
        tx.get(orderRef),
        tx.get(walletRef)
      ]);
      
      if (!orderSnap.exists) throw new Error('ORDER_GONE');
      const order = orderSnap.data();
      if (order.status === 'delivered' || order.status === 'completed') throw new Error('ALREADY_DONE');
      if (order.driverId !== uid) throw new Error('NOT_YOURS');
      
      const fee = Number(order.deliveryFee) || 0;
      const txnId = 'del_' + req.params.orderId;
      
      const walletData = walletSnap.exists ? walletSnap.data() : {};
      const balance = (Number(walletData.balance) || 0) + fee;
      const totalEarned = (Number(walletData.totalEarned) || 0) + fee;
      const totalDeliveries = (Number(walletData.totalDeliveries) || 0) + 1;
      
      tx.update(orderRef, {
        status: 'delivered',
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      tx.set(walletRef, {
        userId: uid,
        balance,
        totalEarned,
        totalDeliveries,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      tx.set(db.collection('transactions').doc(txnId), {
        userId: uid,
        type: 'delivery_earning',
        amount: fee,
        orderId: req.params.orderId,
        orderTotal: Number(order.total) || 0,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      const prevCount = Number(order.driverDoc?.totalDeliveries) || 0;
      tx.update(driverRef, {
        available: true,
        currentOrderId: null,
        totalDeliveries: prevCount + 1,
        updatedAt: serverTimestamp()
      });
    });
    
    res.json({ success: true, message: 'Delivery completed! Earnings credited.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seller: Get orders
app.get('/api/seller/orders/:sellerId', async (req, res) => {
  try {
    if (!db && !supabase) return res.status(500).json({ error: 'No database connected' });
    const result = await queryFirestoreWithFallback('orders', {
      where: [['sellerId', '==', req.params.sellerId]]
    });
    res.json(result.data);
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
      updatedAt: serverTimestamp()
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
      createdAt: serverTimestamp()
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

// Product image upload (base64 → persisted file)
// Used by the merchant app so AI-created and manual products keep real images.
app.post('/api/upload', async (req, res) => {
  try {
    const { imageBase64, mimeType, folder } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const mime = mimeType || 'image/jpeg';
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(mime)) {
      return res.status(400).json({ error: `Unsupported image format. Allowed: ${allowed.join(', ')}` });
    }

    const buf = Buffer.from(imageBase64, 'base64');
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 10MB.' });
    }

    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const sub = folder === 'products' ? 'products' : 'uploads';
    const dir = path.join(__dirname, 'public', 'images', sub);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buf);

    const url = `/images/${sub}/${filename}`;
    res.json({ success: true, url, filename });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Enhanced error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Payload too large (e.g. oversized image uploads)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'Image too large. Maximum size is 10MB.' });
  }
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const { Bot } = require('node-telegram-bot-api');

// Telegram Bot setup (initialized when bot token is available)
let telegramBot = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot = new Bot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('🤖 Telegram bot initialized with polling');

  // Handle /status command to check server status
  telegramBot.command('status', async (ctx) => {
    const chatId = ctx.chat.id;
    try {
      await ctx.reply('🟡 Server is running', { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Telegram send error:', err.message);
    }
  });

  // Handle /edit command for admin actions
  telegramBot.command('edit', async (ctx) => {
    const command = ctx.update.message.text.split(' ').slice(1).join(' ') || '';
    const chatId = ctx.chat.id;
    
    if (command.trim()) {
      try {
        await ctx.reply(`🛠️ Admin command: ${command}`, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Telegram send error:', err.message);
      }
    }
  });

  // Handle /sellers command to list sellers
  telegramBot.command('sellers', async (ctx) => {
    ctx.reply('📋 Fetching sellers... Use /api/sellers from the app to view seller list');
  });

  // Handle /products command to list products
  telegramBot.command('products', async (ctx) => {
    ctx.reply('📦 Fetching products... Use /api/products from the app to view product list');
  });

  // Handle /orders command to list orders
  telegramBot.command('orders', async (ctx) => {
    ctx.reply('📋 Fetching orders... Use /api/orders from the app to view order list');
  });

  // Handle /dashboard command for server stats
  telegramBot.command('dashboard', async (ctx) => {
    ctx.reply('📊 Server dashboard stats available via /api/admin/dashboard');
  });
}

// Register AI Product Agent routes
app.use('/ai', aiProductAgentRoutes);

// Register PesaPal payment routes (v3 integration)
const pesapalModule = require('./api/pesapal');
pesapalModule.init(db, null);
app.use('/api/payments/pesapal', pesapalModule);

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

// Verify a Firebase ID token and return the user's role (used by auth-check.js).
// Falls back to 200 { success:false } when server-side verification is unavailable
// so clients silently continue to their Firestore fallback instead of logging 404s.
app.get('/api/auth/verify', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing bearer token' });
  }
  if (!admin || !admin.auth) {
    return res.json({ success: false, error: 'Server-side token verification unavailable' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ success: true, user: { uid: decoded.uid, role: decoded.role || 'customer' } });
  } catch (e) {
    res.status(401).json({ success: false, error: e.message });
  }
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

// Legacy /dashboard shortcut (previously mapped to merchant.html by public/server.js)
app.get('/dashboard', (req, res) => res.redirect('/merchant'));

// Extensionless HTML routes (e.g. /login, /home, /merchant -> public/<name>.html).
// Must come before the catch-all so unknown paths fall through to 404.html.
const PUBLIC_DIR = path.join(__dirname, 'public');
const PUBLIC_ROUTES = ['login', 'home', 'customer', 'merchant', 'driver', 'admin', 'admin-panel',
  'discovery', 'profile', 'cart', 'orders', 'product', 'restaurant', 'chat', 'track-order',
  'checkout', 'wallet', 'store', 'signup', 'main', 'index', 'onboarding',
  'check-user', 'fleet-manager', 'supabase', 'seed-merchant', 'smartsoko-home',
  'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout', 'referral', '404'];
for (const route of PUBLIC_ROUTES) {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(PUBLIC_DIR, `${route}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });
}

// Error monitoring dashboard (advanced error reporting)
const ERROR_SCAN_MODULE = process.env.SMARTSOKO_MCP_ERRORSCAN || 'E:\\Project\\notsmartsoko\\smartsoko-mcp\\dist\\errorScan.js';
app.get('/errors/data', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const mod = require(ERROR_SCAN_MODULE);
    if (!mod || typeof mod.getDashboardData !== 'function') {
      return res.status(500).json({ error: `Dashboard module ${ERROR_SCAN_MODULE} has no getDashboardData export (rebuild smartsoko-mcp?).` });
    }
    res.json(mod.getDashboardData());
  } catch (e) {
    res.status(500).json({ error: `Dashboard data unavailable: ${e instanceof Error ? e.message : String(e)}` });
  }
});
app.get('/errors', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'errors.html');
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SmartSoko Server running on http://localhost:${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`📦 Categories: ${CATEGORIES.join(', ')}`);
  console.log(`💰 SmartSoko - Your Local Marketplace`);
  console.log(`🌐 Serving the community with fresh local products`);
});

module.exports = app;
