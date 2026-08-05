/**
 * Production Server for SmartSoko
 * Optimized for production with compression, security headers, and error handling
 */

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Firebase Admin SDK for real data
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
let db;
try {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    );
  } else {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Firebase service account is not configured');
    }
    serviceAccount = require(serviceAccountPath);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('✓ Firebase Admin initialized - Using REAL data from Firestore');
} catch (e) {
  console.warn('⚠ Firebase Admin not initialized:', e.message);
  console.log('  Falling back to simulated data');
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Trust proxy for accurate client IP behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://api.mapbox.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://www.google.com", "https://apis.google.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com", "https://cdn.tailwindcss.com", "https://www.googletagmanager.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://api.mapbox.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:", "https://*.mapbox.com", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://www.gstatic.com", "https://api.mapbox.com", "https://events.mapbox.com", "https://cdn.jsdelivr.net", "https://www.google-analytics.com", "https://www.google.com", "https://region1.google-analytics.com", "https://unpkg.com", "https://nominatim.openstreetmap.org", "https://*.tile.openstreetmap.org"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:", "https://fooddelievry-dce15.firebaseapp.com"],
      frameSrc: ["'self'", "https://fooddelievry-dce15.firebaseapp.com", "https://*.firebaseapp.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression middleware
app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}

// Static file serving with caching
app.use(express.static(path.join(__dirname, 'web'), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Cache images, fonts, and CSS/JS for longer
    if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));

function sendHealthPayload(res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
}

// Health check endpoint (root and /api for clients that expect /api/health)
app.get('/health', (req, res) => sendHealthPayload(res));
app.get('/api/health', (req, res) => sendHealthPayload(res));

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Public configuration endpoint (safe to expose to frontend)
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
    }
  });
});

async function resolveUserRole(uid) {
  if (!db) return 'customer';

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data().role || 'customer';
    }
  } catch (error) {
    console.error('Failed to resolve user role:', error.message);
  }

  return 'customer';
}

async function verifyFirebaseToken(req, res, next) {
  try {
    const idToken = getBearerTokenFromRequest(req);
    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Missing Authorization bearer token' });
    }

    req.user = await verifyFirebaseIdToken(idToken);
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient role permissions' });
    }

    next();
  };
}

function getBearerTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return '';
}

async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    throw new Error('Missing token');
  }

  if (!db || !admin.apps.length) {
    throw new Error('Authentication service not available');
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const role = decodedToken.role || await resolveUserRole(decodedToken.uid);
  return { ...decodedToken, role };
}

function toPublicRider(id, data, changeType) {
  return {
    id,
    name: data.full_name || data.name || 'Unknown Driver',
    lat: data.current_location?.lat || data.location?.lat || data.latitude || -6.7924,
    lng: data.current_location?.lng || data.location?.lng || data.longitude || 39.2083,
    status: data.status || (data.isOnline ? 'online' : 'offline'),
    type: data.vehicle_type || data.vehicle || data.type || 'moped',
    deliveries: data.total_deliveries || data.deliveries || 0,
    rating: data.rating || 0,
    ...(changeType ? { changeType } : {})
  };
}

const MARKETPLACE_CATEGORIES = [
  { name: 'food', displayName: 'Restaurants', icon: 'restaurant' },
  { name: 'dairy', displayName: 'Dairy', icon: 'water_drop' },
  { name: 'fruits', displayName: 'Fruits', icon: 'nutrition' },
  { name: 'groceries', displayName: 'Groceries', icon: 'shopping_basket' },
  { name: 'bakery', displayName: 'Bakery', icon: 'bakery_dining' },
  { name: 'other', displayName: 'Other', icon: 'storefront' }
];

/** Public seller shape for listings (no owner PII). */
function toPublicSellerList(id, data) {
  return {
    id,
    name: data.name || '',
    slug: data.slug || id,
    description: data.description || '',
    category: data.category || 'other',
    isOpen: data.isOpen !== false,
    logoUrl: data.logoUrl || data.storefrontLogo || '',
    bannerUrl: data.bannerUrl || data.storefrontBanner || '',
    rating: data.rating != null ? Number(data.rating) : null,
    city: data.city || data.businessCity || ''
  };
}

/** Public seller detail (still no raw owner email/phone unless store contact is intended). */
function toPublicSellerDetail(id, data) {
  return {
    ...toPublicSellerList(id, data),
    seoDescription: data.seoDescription || '',
    brandColors: data.brandColors || null
  };
}

// ═══ Public marketplace catalog (Firestore) ═══
app.get('/api/sellers', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      count: 0,
      data: []
    });
  }
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const category = req.query.category ? String(req.query.category).trim() : '';
    const search = String(req.query.search || req.query.q || '').trim().toLowerCase();

    let ref = db.collection('sellers');
    if (category) {
      ref = ref.where('category', '==', category);
    }

    const snap = await ref.limit(Math.min(limit * 4, 400)).get();
    let sellers = snap.docs.map((doc) => toPublicSellerList(doc.id, doc.data()));

    sellers = sellers.filter((s) => s.isOpen !== false);

    if (search) {
      sellers = sellers.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(search)) ||
          (s.description && s.description.toLowerCase().includes(search)) ||
          (s.city && s.city.toLowerCase().includes(search))
      );
    }

    sellers = sellers.slice(0, limit);
    res.json({ success: true, count: sellers.length, data: sellers });
  } catch (error) {
    console.error('GET /api/sellers:', error);
    res.status(500).json({ success: false, error: 'Failed to list sellers' });
  }
});

app.get('/api/sellers/:id', async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { id } = req.params;
    const docRef = await db.collection('sellers').doc(id).get();
    if (!docRef.exists) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    const data = docRef.data();
    if (data.isOpen === false) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    res.json({ success: true, data: toPublicSellerDetail(docRef.id, data) });
  } catch (error) {
    console.error('GET /api/sellers/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seller' });
  }
});

app.get('/api/categories', async (req, res) => {
  const base = MARKETPLACE_CATEGORIES.map((c) => ({ ...c, count: null }));

  if (!db) {
    return res.json({
      success: true,
      data: base,
      categories: base.map((c) => ({
        name: c.name,
        displayName: c.displayName,
        count: c.count,
        icon: c.icon
      }))
    });
  }

  try {
    const counts = Object.fromEntries(MARKETPLACE_CATEGORIES.map((c) => [c.name, 0]));
    const snap = await db.collection('sellers').limit(500).get();
    snap.docs.forEach((d) => {
      const row = d.data();
      if (row.isOpen === false) return;
      const cat = row.category && counts[row.category] !== undefined ? row.category : 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const data = MARKETPLACE_CATEGORIES.map((c) => ({
      ...c,
      count: counts[c.name] || 0
    }));

    const categories = data.map((c) => ({
      name: c.name,
      displayName: c.displayName,
      count: c.count,
      icon: c.icon
    }));

    res.json({ success: true, data, categories });
  } catch (error) {
    console.error('GET /api/categories:', error);
    res.status(500).json({ success: false, error: 'Failed to load categories' });
  }
});

// ===== AUTHENTICATION API ENDPOINTS =====
app.post('/api/auth/login', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Backend password login is disabled. Use Firebase Auth on the client and send an ID token.'
  });
});

app.post('/api/auth/signup', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Backend signup is disabled. Use Firebase Auth on the client and create the user profile in Firestore.'
  });
});

app.get('/api/auth/verify', verifyFirebaseToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.uid,
      email: req.user.email || '',
      full_name: req.user.name || req.user.displayName || '',
      role: req.user.role
    }
  });
});

app.get('/api/driver/profile', verifyFirebaseToken, requireRole('driver', 'admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  try {
    const driverDoc = await db.collection('drivers').doc(req.user.uid).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ success: false, error: 'Driver profile not found' });
    }

    const driver = driverDoc.data();
    res.json({
      success: true,
      driver: {
        id: driverDoc.id,
        email: driver.email || req.user.email || '',
        full_name: driver.full_name || driver.name || req.user.name || '',
        phone: driver.phone || '',
        vehicle: driver.vehicle || driver.vehicle_type || '',
        plate: driver.plate || '',
        rating: driver.rating || 0,
        total_deliveries: driver.total_deliveries || driver.deliveries || 0,
        status: driver.status || 'offline'
      }
    });
  } catch (error) {
    console.error('Failed to load driver profile:', error);
    res.status(500).json({ success: false, error: 'Failed to load driver profile' });
  }
});

// Root redirects to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Handle specific HTML routes (extensionless URLs; static still serves *.html)
const routes = [
  'login', 'home', 'customer', 'merchant', 'driver', 'admin',
  'discovery', 'profile', 'cart', 'orders', 'product',
  'restaurant', 'chat', 'track-order', 'checkout', '404',
  'store',
  'signup', 'main', 'seller', 'index', 'onboarding', 'check-user',
  'fleet-manager', 'admin-panel', 'seed-merchant',
  'smartsoko-home', 'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout',
  'create-store', 'store-settings', 'customers', 'nearby'
];

routes.forEach(route => {
  app.get(`/${route}`, async (req, res) => {
    try {
      const filePath = path.join(__dirname, 'web', `${route}.html`);
      await fs.promises.access(filePath, fs.constants.F_OK);
      res.sendFile(filePath);
    } catch (error) {
      // File doesn't exist or access denied, serve 404
      res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// COMMERCE OS API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Public storefront data
app.get('/api/stores/:slug', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { slug } = req.params;
    const sellersRef = db.collection('sellers');
    const slugQuery = await sellersRef.where('slug', '==', slug).limit(1).get();

    let storeData = null;
    let storeId = null;

    if (!slugQuery.empty) {
      storeData = slugQuery.docs[0].data();
      storeId = slugQuery.docs[0].id;
    } else {
      // Fallback: try as document ID
      const docRef = await sellersRef.doc(slug).get();
      if (docRef.exists) {
        storeData = docRef.data();
        storeId = docRef.id;
      }
    }

    if (!storeData) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Sanitize: remove phone, email, external contact info
    const safeStore = {
      id: storeId,
      name: storeData.name || '',
      slug: storeData.slug || storeId,
      description: storeData.description || '',
      category: storeData.category || '',
      logoUrl: storeData.logoUrl || '',
      bannerUrl: storeData.bannerUrl || '',
      brandColors: storeData.brandColors || null,
      seoDescription: storeData.seoDescription || '',
      isOpen: storeData.isOpen !== false
    };

    res.json({ success: true, store: safeStore });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store' });
  }
});

// Vendor product CRUD
app.post('/api/vendor/products', verifyFirebaseToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const productData = req.body;
    if (!productData.name || !productData.price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const result = await db.collection('products').add({
      ...productData,
      merchantId: req.user.uid,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

app.put('/api/vendor/products/:id', verifyFirebaseToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (productDoc.data().merchantId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await productRef.update({
      ...req.body,
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

app.delete('/api/vendor/products/:id', verifyFirebaseToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (productDoc.data().merchantId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await productRef.delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// Vendor analytics
app.get('/api/vendor/analytics', verifyFirebaseToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const merchantId = req.query.merchantId || req.user.uid;
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ordersQuery = await db.collection('orders')
      .where('merchantId', '==', merchantId)
      .where('createdAt', '>=', startDate)
      .get();

    let totalSales = 0;
    let totalOrders = 0;
    const dailyMap = {};
    const productSales = {};
    const categorySales = {};

    ordersQuery.forEach(doc => {
      const order = doc.data();
      totalOrders++;
      const total = order.total || order.amount || 0;
      totalSales += total;

      const date = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)) : new Date();
      const key = date.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { sales: 0, orders: 0 };
      dailyMap[key].sales += total;
      dailyMap[key].orders++;

      (order.items || []).forEach(item => {
        const pid = item.productId || item.id || 'unknown';
        if (!productSales[pid]) productSales[pid] = { name: item.name || 'Unknown', count: 0, revenue: 0 };
        productSales[pid].count += (item.quantity || 1);
        productSales[pid].revenue += ((item.price || 0) * (item.quantity || 1));

        const cat = item.category || 'Uncategorized';
        if (!categorySales[cat]) categorySales[cat] = 0;
        categorySales[cat] += ((item.price || 0) * (item.quantity || 1));
      });
    });

    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const commission = Math.round(totalSales * 0.10);
    const netRevenue = totalSales - commission;

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      analytics: {
        totalSales, totalOrders, avgOrderValue, commission, netRevenue,
        dailyMap, topProducts, categorySales
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    const orderData = req.body;
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order data is required' });
    }

    const result = await db.collection('orders').add({
      ...orderData,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SHOPIFY-STYLE FEATURES API
// ═══════════════════════════════════════════════════════════════
const shopifyFeatures = require('./api/shopify-features.js');
shopifyFeatures.init(db, admin);
app.use('/api/shopify', shopifyFeatures);

// Additional creative features endpoints

// Flash Deals / Daily Deals
app.post('/api/deals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, productIds, dealPrice, discountPercent, startDate, endDate, merchantId, isActive } = req.body;

    if (!name || !productIds || !dealPrice) {
      return res.status(400).json({ success: false, error: 'Name, products, and deal price are required' });
    }

    const dealData = {
      name,
      productIds,
      dealPrice: parseFloat(dealPrice),
      discountPercent: discountPercent || 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      merchantId: merchantId || '',
      isActive: isActive !== false,
      type: 'flash', // 'flash' or 'daily'
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    };

    const result = await db.collection('deals').add(dealData);
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ success: false, error: 'Failed to create deal' });
  }
});

app.get('/api/deals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId, active } = req.query;
    let query = db.collection('deals');

    if (merchantId) {
      query = query.where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    let deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter active deals if requested
    if (active === 'true') {
      const now = new Date();
      deals = deals.filter(d => {
        if (!d.isActive) return false;
        if (d.startDate && new Date(d.startDate) > now) return false;
        if (d.endDate && new Date(d.endDate) < now) return false;
        return true;
      });
    }

    res.json({ success: true, deals });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals' });
  }
});

// Loyalty Points System
app.post('/api/loyalty/points', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { userId, points, type, description, orderId } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ success: false, error: 'User ID and points are required' });
    }

    const transactionData = {
      userId,
      points: parseInt(points),
      type: type || 'earn', // 'earn' or 'redeem'
      description: description || '',
      orderId: orderId || null,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    };

    const result = await db.collection('loyalty_transactions').add(transactionData);

    // Update user total points
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const currentPoints = userDoc.data().loyaltyPoints || 0;
      const newPoints = type === 'redeem' 
        ? Math.max(0, currentPoints - Math.abs(points)) 
        : currentPoints + points;
      
      await userRef.update({ loyaltyPoints: newPoints });
    }

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error processing loyalty points:', error);
    res.status(500).json({ success: false, error: 'Failed to process loyalty points' });
  }
});

app.get('/api/loyalty/points', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const loyaltyPoints = userDoc.exists ? (userDoc.data().loyaltyPoints || 0) : 0;

    const transactionsSnapshot = await db.collection('loyalty_transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, points: loyaltyPoints, transactions });
  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty points' });
  }
});

// Referral System
app.post('/api/referrals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referrerId, refereeId, referralCode } = req.body;

    if (!referrerId || !refereeId) {
      return res.status(400).json({ success: false, error: 'Referrer and referee IDs are required' });
    }

    const referralData = {
      referrerId,
      refereeId,
      referralCode: referralCode || '',
      status: 'pending', // 'pending', 'completed', 'rewarded'
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    };

    const result = await db.collection('referrals').add(referralData);

    // Generate referral code if not provided
    if (!referralCode) {
      const code = 'REF' + Math.random().toString(36).substr(2, 6).toUpperCase();
      await db.collection('referrals').doc(result.id).update({ referralCode: code });
    }

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ success: false, error: 'Failed to create referral' });
  }
});

app.get('/api/referrals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Get referrals made by this user
    const madeSnapshot = await db.collection('referrals')
      .where('referrerId', '==', userId)
      .get();

    const referralsMade = madeSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get referrals received by this user
    const receivedSnapshot = await db.collection('referrals')
      .where('refereeId', '==', userId)
      .get();

    const referralsReceived = receivedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      success: true, 
      referrals: {
        made: referralsMade,
        received: referralsReceived,
        total: referralsMade.length + referralsReceived.length
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

// Dynamic Pricing (Surge Pricing)
app.get('/api/pricing/surge', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { location, time } = req.query;
    
    // Simple surge pricing based on time of day
    const hour = new Date().getHours();
    let surgeFactor = 1.0;
    
    // Peak hours: 12-14 (lunch) and 18-21 (dinner)
    if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      surgeFactor = 1.2;
    }
    
    // Weekend surge
    const day = new Date().getDay();
    if (day === 5 || day === 6) { // Friday, Saturday
      surgeFactor = Math.max(surgeFactor, 1.15);
    }

    res.json({ 
      success: true, 
      surge: {
        factor: surgeFactor,
        applied: surgeFactor > 1,
        reason: surgeFactor > 1 ? 'Peak hours pricing' : 'Standard pricing',
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      }
    });
  } catch (error) {
    console.error('Error calculating surge pricing:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate pricing' });
  }
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

module.exports = app;

// ===== WEBSOCKET & REAL-TIME RIDER TRACKING =====
const WebSocket = require('ws');
const http = require('http');

let server = null;
let wss = null;
let simulationInterval = null;

function broadcastToFleet(payload) {
  if (!wss) return;

  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Cache for riders data
let ridersCache = [];

// Function to fetch riders from Firestore
async function fetchRidersFromDB() {
  if (!db) {
    console.log('Firestore not available, using cache/simulation');
    return ridersCache;
  }
  
  try {
    console.log('Fetching real drivers from Firestore...');
    const snapshot = await db.collection('drivers').get();
    console.log(`Found ${snapshot.size} drivers in Firestore`);
    
    if (snapshot.empty) {
      console.log('No drivers found in Firestore');
      if (process.env.ENABLE_TEST_DATA_SEEDING === 'true') {
        console.log('ENABLE_TEST_DATA_SEEDING=true, seeding test data...');
        await seedTestDrivers();
      }
      return ridersCache;
    }
    
    const riders = snapshot.docs.map(doc => toPublicRider(doc.id, doc.data()));
    ridersCache = riders;
    console.log(`Loaded ${riders.length} real drivers from Firestore`);
    return riders;
  } catch (error) {
    console.error('Error fetching riders from Firestore:', error);
    return ridersCache;
  }
}

// Seed test drivers if Firestore is empty
async function seedTestDrivers() {
  if (!db) return;
  
  const testDrivers = [
    { id: 'RC-9921', name: 'Marcus Jensen', lat: -6.7924, lng: 39.2083, status: 'online', type: 'moped', deliveries: 14, rating: 4.9, phone: '+255712345001', email: 'marcus@smartsoko.com' },
    { id: 'RC-8234', name: 'Elena Rodriguez', lat: -6.8050, lng: 39.2150, status: 'delivery', type: 'motorcycle', deliveries: 8, rating: 4.8, phone: '+255712345002', email: 'elena@smartsoko.com' },
    { id: 'RC-1102', name: 'Samuel Wright', lat: -6.7800, lng: 39.1950, status: 'offline', type: 'bicycle', deliveries: 0, rating: 4.5, phone: '+255712345003', email: 'samuel@smartsoko.com' },
    { id: 'RC-4456', name: 'James Chen', lat: -6.8000, lng: 39.2300, status: 'online', type: 'moped', deliveries: 12, rating: 4.7, phone: '+255712345004', email: 'james@smartsoko.com' },
    { id: 'RC-7789', name: 'Aisha Mohamed', lat: -6.7750, lng: 39.2200, status: 'delivery', type: 'motorcycle', deliveries: 6, rating: 4.9, phone: '+255712345005', email: 'aisha@smartsoko.com' }
  ];
  
  try {
    const batch = db.batch();
    testDrivers.forEach(driver => {
      const ref = db.collection('drivers').doc(driver.id);
      batch.set(ref, {
        full_name: driver.name,
        current_location: { lat: driver.lat, lng: driver.lng },
        status: driver.status,
        vehicle_type: driver.type,
        total_deliveries: driver.deliveries,
        rating: driver.rating,
        phone: driver.phone,
        email: driver.email,
        created_at: new Date().toISOString()
      });
    });
    await batch.commit();
    console.log(`Seeded ${testDrivers.length} test drivers to Firestore`);
    ridersCache = testDrivers.map(driver => toPublicRider(driver.id, driver));
  } catch (error) {
    console.error('Error seeding test drivers:', error);
    ridersCache = testDrivers.map(driver => toPublicRider(driver.id, driver));
  }
}

// API endpoint to get all riders
app.get('/api/riders', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  const riders = await fetchRidersFromDB();
  res.json({ success: true, riders });
});

// API endpoint to get real dashboard statistics (shared with legacy /api/admin/dashboard path)
async function handleAdminDashboardStats(req, res) {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  try {
    const driversSnapshot = await db.collection('drivers').get();
    const ordersSnapshot = await db.collection('orders').get();

    const totalDrivers = driversSnapshot.size;
    const totalOrders = ordersSnapshot.size;

    let onlineDrivers = 0;
    let offlineDrivers = 0;
    let deliveryDrivers = 0;

    driversSnapshot.docs.forEach(doc => {
      const status = doc.data().status || 'offline';
      if (status === 'online') onlineDrivers++;
      else if (status === 'delivery') deliveryDrivers++;
      else offlineDrivers++;
    });

    let pendingOrders = 0;
    let inProgressOrders = 0;
    let completedOrders = 0;
    let totalRevenue = 0;

    ordersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'pending';
      const amount = data.amount || data.total || 0;

      if (status === 'pending') pendingOrders++;
      else if (status === 'in_progress' || status === 'assigned') inProgressOrders++;
      else if (status === 'completed') {
        completedOrders++;
        totalRevenue += amount;
      }
    });

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = ordersSnapshot.docs.filter(doc => {
      const orderDate = doc.data().created_at?.split('T')[0];
      return orderDate === today && doc.data().status === 'completed';
    });
    const todayEarnings = todayOrders.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    res.json({
      success: true,
      stats: {
        drivers: {
          total: totalDrivers,
          online: onlineDrivers,
          offline: offlineDrivers,
          onDelivery: deliveryDrivers
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          inProgress: inProgressOrders,
          completed: completedOrders,
          totalRevenue: totalRevenue,
          todayEarnings: todayEarnings
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}

app.get('/api/dashboard/stats', verifyFirebaseToken, requireRole('admin'), handleAdminDashboardStats);
app.get('/api/admin/dashboard', verifyFirebaseToken, requireRole('admin'), handleAdminDashboardStats);

// API endpoint to get single rider
app.get('/api/riders/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  try {
    const doc = await db.collection('drivers').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Rider not found' });
    }
    
    const rider = toPublicRider(doc.id, doc.data());
    
    res.json({ success: true, rider });
  } catch (error) {
    console.error('Error fetching rider:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rider' });
  }
});

// Firestore real-time listener for driver locations
let driversUnsubscribe = null;

function startFirestoreListeners() {
  if (!db) {
    console.log('Firestore not available, using simulation mode');
    startSimulationMode();
    return;
  }

  console.log('Starting Firestore real-time listeners...');

  // Listen to drivers collection for real-time updates
  driversUnsubscribe = db.collection('drivers')
    .onSnapshot((snapshot) => {
      const changes = [];
      
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const rider = toPublicRider(change.doc.id, data, change.type);
        changes.push(rider);

        // Update cache
        const index = ridersCache.findIndex(r => r.id === rider.id);
        if (change.type === 'removed') {
          if (index > -1) ridersCache.splice(index, 1);
        } else {
          if (index > -1) {
            ridersCache[index] = rider;
          } else {
            ridersCache.push(rider);
          }
        }
      });

      // Broadcast changes to all connected clients
      if (changes.length > 0) {
        broadcastToFleet({
          type: 'rider_locations',
          data: changes
        });
        console.log(`Broadcasted ${changes.length} rider update(s) to clients`);
      }
    }, (error) => {
      console.error('Firestore listener error:', error);
      // Fallback to simulation mode
      startSimulationMode();
    });
}

// Simulation mode (fallback when Firestore unavailable)
function startSimulationMode() {
  console.log('Starting simulation mode for rider movement');

  if (simulationInterval) return;
  
  // Simulate rider movement every 3 seconds
  simulationInterval = setInterval(() => {
    ridersCache.forEach(rider => {
      if (rider.status !== 'offline') {
        rider.lat += (Math.random() - 0.5) * 0.001;
        rider.lng += (Math.random() - 0.5) * 0.001;
      }
    });

    broadcastToFleet({
      type: 'rider_locations',
      data: ridersCache
    });
  }, 3000);
}

// Route Optimization API using Mapbox Directions
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || '';

app.get('/api/route', verifyFirebaseToken, requireRole('admin', 'driver', 'merchant'), async (req, res) => {
  const { origin, destination, waypoints } = req.query;
  
  if (!origin || !destination) {
    return res.status(400).json({ 
      success: false, 
      error: 'Origin and destination required (format: lng,lat)' 
    });
  }

  try {
    if (!MAPBOX_TOKEN) {
      return res.status(503).json({
        success: false,
        error: 'Mapbox access token is not configured'
      });
    }

    // Build Mapbox Directions API URL
    let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}`;
    
    if (waypoints) {
      url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${waypoints};${destination}`;
    }
    
    url += `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      return res.status(400).json({ 
        success: false, 
        error: data.message || 'Route calculation failed' 
      });
    }

    const route = data.routes[0];
    
    res.json({
      success: true,
      route: {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry, // GeoJSON LineString
        legs: route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map(step => ({
            instruction: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration,
            name: step.name
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate route' });
  }
});

// Optimize route with multiple waypoints (Traveling Salesman)
app.post('/api/route/optimize', verifyFirebaseToken, requireRole('admin', 'driver', 'merchant'), async (req, res) => {
  const { riderLocation, pickups, deliveries } = req.body;
  
  if (!riderLocation || !pickups || !deliveries) {
    return res.status(400).json({ 
      success: false, 
      error: 'riderLocation, pickups, and deliveries required' 
    });
  }

  // Simple nearest-neighbor optimization
  const waypoints = [...pickups, ...deliveries];
  const optimized = [riderLocation];
  let current = riderLocation;
  const unvisited = [...waypoints];

  while (unvisited.length > 0) {
    let nearest = null;
    let minDistance = Infinity;

    unvisited.forEach((point, index) => {
      const distance = calculateDistance(
        current.lat, current.lng,
        point.lat, point.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { point, index };
      }
    });

    if (nearest) {
      optimized.push(nearest.point);
      current = nearest.point;
      unvisited.splice(nearest.index, 1);
    }
  }

  res.json({
    success: true,
    optimizedRoute: optimized,
    totalStops: waypoints.length,
    estimatedDistance: calculateTotalDistance(optimized)
  });
});

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateTotalDistance(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(
      points[i].lat, points[i].lng,
      points[i+1].lat, points[i+1].lng
    );
  }
  return total;
}

// ─── Admin system & management (admin.html, admin-panel.html) ───
app.get('/api/admin/system/status', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const memUsed = process.memoryUsage();
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: memUsed,
        cpu: process.cpuUsage(),
        environment: NODE_ENV,
        version: process.version,
        firebase: db ? 'connected' : 'disconnected',
        memoryPercent: {
          heapUsed: memUsed.heapTotal ? Math.round((memUsed.heapUsed / memUsed.heapTotal) * 100) : 0,
          rss: memUsed.heapTotal ? Math.round((memUsed.rss / memUsed.heapTotal) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system status' });
  }
});

app.get('/api/admin/system/logs', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { type = 'all', limit = 100 } = req.query;
    const logLimit = Math.min(parseInt(String(limit), 10) || 100, 1000);
    const logTypes = type === 'all' ? ['error', 'warn', 'info', 'http'] : [String(type)];
    const recentLogs = logTypes.map((t) => ({
      type: t,
      message: `${t.toUpperCase()} log entry (demo — connect a log store for production)`,
      timestamp: new Date().toISOString()
    }));
    res.json({
      success: true,
      data: recentLogs.slice(0, logLimit),
      count: recentLogs.length
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

function orderCreatedTime(data) {
  const a = data.createdAt;
  const b = data.created_at;
  if (a && typeof a.toDate === 'function') return a.toDate().getTime();
  if (a && typeof a._seconds === 'number') return a._seconds * 1000;
  if (b && typeof b.toDate === 'function') return b.toDate().getTime();
  if (typeof b === 'string') {
    const t = new Date(b).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

app.get('/api/admin/reports', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { period = '7d', type = 'all' } = req.query;
    const now = new Date();
    let startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    if (period === '24h') startMs = now.getTime() - 24 * 60 * 60 * 1000;
    else if (period === '7d') startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    else if (period === '30d') startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    const reports = { period, generatedAt: now.toISOString() };

    if (type === 'all' || type === 'orders') {
      const ordersSnap = await db.collection('orders').get();
      const orders = ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => orderCreatedTime(o) >= startMs);
      reports.orders = {
        total: orders.length,
        byStatus: orders.reduce((acc, o) => {
          const s = o.status || 'unknown';
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {}),
        totalRevenue: orders.reduce((sum, o) => sum + (o.total || o.amount || 0), 0)
      };
    }

    if (type === 'all' || type === 'users') {
      const [usersSnap, sellersSnap, driversSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('sellers').get(),
        db.collection('drivers').get()
      ]);
      reports.users = {
        total: usersSnap.size,
        sellers: sellersSnap.size,
        drivers: driversSnap.size
      };
    }

    if (type === 'all' || type === 'sellers') {
      const sellersSnap = await db.collection('sellers').get();
      const sellers = sellersSnap.docs.map((d) => d.data());
      reports.sellers = {
        total: sellers.length,
        active: sellers.filter((s) => s.isOpen).length,
        inactive: sellers.filter((s) => !s.isOpen).length
      };
    }

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ success: false, error: 'Failed to generate reports' });
  }
});

app.get('/api/admin/sellers', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { status, limit = 100 } = req.query;
    let q = db.collection('sellers');
    if (status === 'open') q = q.where('isOpen', '==', true);
    if (status === 'closed') q = q.where('isOpen', '==', false);
    const snapshot = await q.limit(parseInt(String(limit), 10) || 100).get();
    const sellers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: sellers, count: sellers.length });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sellers' });
  }
});

app.put('/api/admin/sellers/:sellerId', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { sellerId } = req.params;
    const { action, ...updates } = req.body || {};
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    if (!sellerDoc.exists) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    const FieldValue = admin.firestore.FieldValue;
    if (action === 'approve') {
      await sellerRef.update({ approved: true, approvedAt: FieldValue.serverTimestamp() });
    } else if (action === 'reject') {
      await sellerRef.update({ approved: false, rejected: true, rejectedAt: FieldValue.serverTimestamp() });
    } else if (action === 'suspend') {
      await sellerRef.update({ suspended: true, suspendedAt: FieldValue.serverTimestamp() });
    } else if (action === 'unsuspend') {
      await sellerRef.update({ suspended: false });
    } else {
      await sellerRef.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
    }
    res.json({ success: true, message: 'Seller updated', action });
  } catch (error) {
    console.error('Error updating seller:', error);
    res.status(500).json({ success: false, error: 'Failed to update seller' });
  }
});

app.get('/api/admin/drivers', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { limit = 100 } = req.query;
    const snapshot = await db.collection('drivers').limit(parseInt(String(limit), 10) || 100).get();
    const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: drivers, count: drivers.length });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// Image upload endpoint (saves locally and serves via static)
const { v4: uuidv4 } = require('uuid');
const uploadsDir = path.join(__dirname, 'web', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.post('/api/upload', async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'No image data provided' });

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const ext = (filename || 'image.png').split('.').pop() || 'png';
    const objectName = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadsDir, objectName);

    await fs.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${objectName}`;

    res.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Admin Notifications API ───
app.get('/api/admin/notifications', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    if (!db) {
      return res.json({ success: true, data: [], count: 0 });
    }
    let q = db.collection('admin_notifications').orderBy('createdAt', 'desc');
    if (status) q = q.where('status', '==', status);
    const snap = await q.limit(parseInt(String(limit)) || 50).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    console.error('Error fetching notifications:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, type, priority, targetRole, targetUserIds } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message required' });
    }
    const notification = {
      title,
      message,
      type: type || 'info',
      priority: priority || 'normal',
      targetRole: targetRole || 'all',
      targetUserIds: targetUserIds || [],
      status: 'active',
      sentBy: req.user.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readCount: 0,
      deliveryCount: 0
    };
    if (db) {
      const ref = await db.collection('admin_notifications').add(notification);
      res.json({ success: true, id: ref.id, message: 'Notification sent' });
    } else {
      res.json({ success: true, id: 'sim_' + Date.now(), message: 'Notification sent (simulated)' });
    }
  } catch (e) {
    console.error('Error sending notification:', e);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

app.delete('/api/admin/notifications/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) {
      await db.collection('admin_notifications').doc(req.params.id).delete();
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// ─── Admin RBAC API ───
app.get('/api/admin/rbac/roles', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const roles = [
      { id: 'super_admin', name: 'Super Admin', permissions: ['*'], description: 'Full system access' },
      { id: 'admin', name: 'Admin', permissions: ['read', 'write', 'manage_users', 'manage_orders', 'manage_sellers', 'manage_drivers', 'view_analytics'], description: 'Standard admin access' },
      { id: 'moderator', name: 'Moderator', permissions: ['read', 'manage_orders', 'manage_sellers', 'view_analytics'], description: 'Content moderation access' },
      { id: 'support', name: 'Support Agent', permissions: ['read', 'manage_tickets', 'view_users'], description: 'Customer support access' },
      { id: 'finance', name: 'Finance', permissions: ['read', 'view_reports', 'manage_payouts'], description: 'Financial operations access' },
      { id: 'analyst', name: 'Analyst', permissions: ['read', 'view_analytics', 'view_reports'], description: 'Read-only analytics access' }
    ];
    if (db) {
      const snap = await db.collection('admin_roles').get();
      if (!snap.empty) {
        const customRoles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({ success: true, data: [...roles, ...customRoles] });
        return;
      }
    }
    res.json({ success: true, data: roles });
  } catch (e) {
    console.error('Error fetching roles:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

app.post('/api/admin/rbac/roles', verifyFirebaseToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { id, name, permissions, description } = req.body;
    if (!id || !name || !permissions) {
      return res.status(400).json({ success: false, error: 'id, name, and permissions required' });
    }
    if (db) {
      await db.collection('admin_roles').doc(id).set({ name, permissions, description, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    res.json({ success: true, message: `Role "${name}" created` });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

app.get('/api/admin/rbac/user-roles', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('admin_user_roles').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch user roles' });
  }
});

app.post('/api/admin/rbac/user-roles', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId, roleId, email } = req.body;
    if (!userId || !roleId) {
      return res.status(400).json({ success: false, error: 'userId and roleId required' });
    }
    if (db) {
      const existing = await db.collection('admin_user_roles').where('userId', '==', userId).get();
      if (!existing.empty) {
        await db.collection('admin_user_roles').doc(existing.docs[0].id).update({ roleId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        await db.collection('admin_user_roles').add({
          userId, roleId, email: email || '',
          assignedBy: req.user.uid,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    res.json({ success: true, message: 'Role assigned' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

app.delete('/api/admin/rbac/user-roles/:id', verifyFirebaseToken, requireRole('super_admin'), async (req, res) => {
  try {
    if (db) {
      await db.collection('admin_user_roles').doc(req.params.id).delete();
    }
    res.json({ success: true, message: 'Role assignment revoked' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to revoke role' });
  }
});

// ─── Admin Webhooks API ───
app.get('/api/admin/webhooks', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('admin_webhooks').orderBy('createdAt', 'desc').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
  }
});

app.post('/api/admin/webhooks', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, url, events, secret } = req.body;
    if (!name || !url || !events || !events.length) {
      return res.status(400).json({ success: false, error: 'name, url, and events required' });
    }
    const webhook = {
      name, url, events,
      secret: secret || '',
      isActive: true,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastTriggeredAt: null,
      failureCount: 0
    };
    if (db) {
      const ref = await db.collection('admin_webhooks').add(webhook);
      res.json({ success: true, id: ref.id, message: 'Webhook created' });
    } else {
      res.json({ success: true, id: 'sim_' + Date.now(), message: 'Webhook created (simulated)' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
});

app.put('/api/admin/webhooks/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, url, events, isActive, secret } = req.body;
    if (!db) return res.json({ success: true, message: 'Webhook updated (simulated)' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (isActive !== undefined) updates.isActive = isActive;
    if (secret !== undefined) updates.secret = secret;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('admin_webhooks').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Webhook updated' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update webhook' });
  }
});

app.delete('/api/admin/webhooks/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) {
      await db.collection('admin_webhooks').doc(req.params.id).delete();
    }
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
});

// ─── Admin API Keys ───
app.get('/api/admin/api-keys', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('admin_api_keys').orderBy('createdAt', 'desc').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data(), key: 'sk-****' + (d.data().key || '').slice(-4) }));
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
  }
});

app.post('/api/admin/api-keys', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, permissions, rateLimit } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const key = 'sk_' + require('crypto').randomBytes(32).toString('hex');
    const apiKey = {
      name, key,
      permissions: permissions || ['read'],
      rateLimit: rateLimit || 100,
      isActive: true,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
      useCount: 0
    };
    if (db) {
      const ref = await db.collection('admin_api_keys').add(apiKey);
      res.json({ success: true, id: ref.id, key, message: 'API key created. Save this key - it will not be shown again.' });
    } else {
      res.json({ success: true, id: 'sim_' + Date.now(), key, message: 'API key created (simulated). Save this key.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

app.put('/api/admin/api-keys/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, isActive, permissions, rateLimit } = req.body;
    if (!db) return res.json({ success: true, message: 'API key updated (simulated)' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (permissions !== undefined) updates.permissions = permissions;
    if (rateLimit !== undefined) updates.rateLimit = rateLimit;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('admin_api_keys').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'API key updated' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
});

app.delete('/api/admin/api-keys/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) {
      await db.collection('admin_api_keys').doc(req.params.id).delete();
    }
    res.json({ success: true, message: 'API key revoked' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to revoke API key' });
  }
});

// ─── Admin Payouts API ───
app.get('/api/admin/payouts', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    if (!db) return res.json({ success: true, data: [] });
    let q = db.collection('payout_batches').orderBy('createdAt', 'desc');
    if (status) q = q.where('status', '==', status);
    const snap = await q.limit(parseInt(String(limit)) || 50).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch payouts' });
  }
});

app.post('/api/admin/payouts', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { batchName, totalAmount, recipientCount, recipients } = req.body;
    if (!batchName || !totalAmount) {
      return res.status(400).json({ success: false, error: 'batchName and totalAmount required' });
    }
    const batch = {
      batchName,
      totalAmount: parseInt(totalAmount),
      recipientCount: recipientCount || (recipients ? recipients.length : 0),
      status: 'pending',
      processedCount: 0,
      failedCount: 0,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
      recipients: recipients || []
    };
    if (db) {
      const ref = await db.collection('payout_batches').add(batch);
      if (recipients && recipients.length) {
        const batchRef = db.collection('payout_batches').doc(ref.id);
        for (const r of recipients) {
          await batchRef.collection('items').add({
            recipientId: r.id,
            recipientName: r.name,
            amount: parseInt(r.amount),
            accountNumber: r.account || '',
            status: 'pending',
            processedAt: null
          });
        }
      }
      res.json({ success: true, id: ref.id, message: `Payout batch "${batchName}" created` });
    } else {
      res.json({ success: true, id: 'sim_' + Date.now(), message: 'Payout batch created (simulated)' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create payout batch' });
  }
});

app.post('/api/admin/payouts/:id/process', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ success: true, message: 'Payout processed (simulated)' });
    await db.collection('payout_batches').doc(req.params.id).update({
      status: 'processing',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Simulate processing delay, then mark completed
    setTimeout(async () => {
      try {
        await db.collection('payout_batches').doc(req.params.id).update({
          status: 'completed',
          processedCount: admin.firestore.FieldValue.increment(1)
        });
      } catch (_) {}
    }, 2000);
    res.json({ success: true, message: 'Payout batch processing started' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to process payout' });
  }
});

// ─── Admin Risk Scoring API ───
app.get('/api/admin/risk-score', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { entity, id } = req.query;
    if (!db) {
      return res.json({ success: true, data: { riskScore: 0, flags: [], recommendations: [] } });
    }
    const result = { riskScore: 0, flags: [], recommendations: [] };
    if (entity === 'user' && id) {
      const userDoc = await db.collection('users').doc(id).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const ordersSnap = await db.collection('orders').where('userId', '==', id).get();
        const cancelRate = ordersSnap.size ? ordersSnap.docs.filter(d => d.data().status === 'cancelled').length / ordersSnap.size : 0;
        result.riskScore = Math.round(cancelRate * 100);
        if (cancelRate > 0.3) result.flags.push('High cancellation rate');
        if (data.suspended) result.flags.push('Previously suspended');
        result.recommendations = result.riskScore > 50 ? ['Review account activity', 'Consider verification'] : [];
      }
    } else if (entity === 'order' && id) {
      const orderDoc = await db.collection('orders').doc(id).get();
      if (orderDoc.exists) {
        const data = orderDoc.data();
        const amount = data.total || data.amount || 0;
        if (amount > 1000000) { result.riskScore += 30; result.flags.push('High value order'); }
        if (data.status === 'pending' && !data.paymentMethod) { result.riskScore += 20; result.flags.push('No payment method'); }
        result.riskScore = Math.min(result.riskScore, 100);
        result.recommendations = result.riskScore > 40 ? ['Manual review recommended', 'Verify payment'] : [];
      }
    } else if (entity === 'seller' && id) {
      const sellerDoc = await db.collection('sellers').doc(id).get();
      if (sellerDoc.exists) {
        const data = sellerDoc.data();
        const productsSnap = await db.collection('products').where('sellerId', '==', id).get();
        const flaggedProducts = productsSnap.docs.filter(d => d.data().flagged).length;
        result.riskScore = Math.min(flaggedProducts * 20, 100);
        if (flaggedProducts > 0) result.flags.push(`${flaggedProducts} flagged products`);
        result.recommendations = result.riskScore > 40 ? ['Audit seller listings', 'Verify business documents'] : [];
      }
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Risk assessment failed' });
  }
});

// ─── Admin Flagged Items API ───
app.get('/api/admin/flagged-items', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, data: [
        { id: '1', type: 'Product', item: 'iPhone 15 Pro - $50', issue: 'Price too low - scam indicator', confidence: 92, status: 'pending', flaggedAt: new Date().toISOString() },
        { id: '2', type: 'Order', item: 'ORD-8923', issue: 'Multiple orders same address', confidence: 78, status: 'pending', flaggedAt: new Date().toISOString() }
      ]});
    }
    const [productsSnap, ordersSnap] = await Promise.all([
      db.collection('products').where('flagged', '==', true).get(),
      db.collection('orders').where('flagged', '==', true).get()
    ]);
    const products = productsSnap.docs.map(d => ({ id: d.id, type: 'Product', item: d.data().name, issue: d.data().flagReason || 'AI flagged', confidence: d.data().confidence || 75, status: d.data().flagStatus || 'pending', flaggedAt: d.data().flaggedAt?.toDate?.()?.toISOString() || d.data().createdAt }));
    const orders = ordersSnap.docs.map(d => ({ id: d.id, type: 'Order', item: d.id, issue: d.data().flagReason || 'Suspicious activity', confidence: d.data().confidence || 60, status: d.data().flagStatus || 'pending', flaggedAt: d.data().flaggedAt?.toDate?.()?.toISOString() || d.data().createdAt }));
    res.json({ success: true, data: [...products, ...orders] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch flagged items' });
  }
});

app.put('/api/admin/flagged-items/:id', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { action, type } = req.body;
    if (!db) return res.json({ success: true, message: 'Flagged item resolved (simulated)' });
    const collection = type === 'Order' ? 'orders' : 'products';
    const updates = { flagStatus: action === 'dismiss' ? 'dismissed' : 'resolved', resolvedBy: req.user.uid, resolvedAt: admin.firestore.FieldValue.serverTimestamp() };
    await db.collection(collection).doc(req.params.id).update(updates);
    res.json({ success: true, message: `Flagged item ${action === 'dismiss' ? 'dismissed' : 'resolved'}` });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update flagged item' });
  }
});

// ─── Admin System Settings API ───
app.get('/api/admin/settings', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, data: { platformName: 'SmartSoko', maintenanceMode: false, version: '1.0.0', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam' } });
    }
    const snap = await db.collection('admin_system_settings').get();
    const data = {};
    snap.docs.forEach(d => { data[d.id] = d.data().value; });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings/:key', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { value } = req.body;
    if (db) {
      await db.collection('admin_system_settings').doc(req.params.key).set({
        value,
        updatedBy: req.user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    res.json({ success: true, message: 'Setting updated' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// ─── Admin Audit Logs API ───
app.get('/api/admin/audit-logs', verifyFirebaseToken, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('admin_audit_logs').orderBy('timestamp', 'desc').limit(parseInt(String(limit)) || 100).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// API 404 handler must stay after all API routes.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path
  });
});

// HTML 404 handler.
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
});

// Error handling middleware.
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// WebSocket connection handler
async function handleWebSocketConnection(ws, req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || '';
    const user = await verifyFirebaseIdToken(token);

    if (user.role !== 'admin') {
      ws.close(1008, 'Forbidden');
      return;
    }

    ws.user = user;
  } catch (error) {
    console.error('WebSocket auth failed:', error.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }));
    }
    ws.close(1008, 'Unauthorized');
    return;
  }

  console.log('Fleet manager connected via WebSocket');
  ws.send(JSON.stringify({
    type: 'initial_data',
    data: ridersCache
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'get_rider_details') {
        const rider = ridersCache.find(r => r.id === data.riderId);
        ws.send(JSON.stringify({
          type: 'rider_details',
          data: rider
        }));
      }

      if (data.type === 'update_rider_status') {
        const validStatuses = new Set(['online', 'offline', 'delivery']);
        if (!validStatuses.has(data.status)) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid rider status' }));
          return;
        }

        const rider = ridersCache.find(r => r.id === data.riderId);
        if (rider) {
          rider.status = data.status;
          broadcastToFleet({
            type: 'rider_status_updated',
            data: { id: rider.id, status: rider.status }
          });
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Fleet manager disconnected');
  });
}

function startRealtimeServer() {
  server = http.createServer(app);
  wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', handleWebSocketConnection);
  startFirestoreListeners();

  server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         SmartSoko - Production Server Ready            ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${NODE_ENV.padEnd(37)} ║`);
  console.log(`║  Port: ${PORT.toString().padEnd(46)} ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  URLs:                                                 ║');
  console.log(`║  - Login:     http://localhost:${PORT}/login`.padEnd(56) + '║');
  console.log(`║  - Home:     http://localhost:${PORT}/home`.padEnd(56) + '║');
  console.log(`║  - Customer: http://localhost:${PORT}/customer`.padEnd(56) + '║');
  console.log(`║  - Merchant: http://localhost:${PORT}/merchant`.padEnd(56) + '║');
  console.log(`║  - Driver:   http://localhost:${PORT}/driver`.padEnd(56) + '║');
  console.log(`║  - Admin:    http://localhost:${PORT}/admin`.padEnd(56) + '║');
  console.log(`║  - Fleet:    http://localhost:${PORT}/fleet-manager.html`.padEnd(56) + '║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  API Endpoints:                                        ║');
  console.log(`║  - Health:   http://localhost:${PORT}/health`.padEnd(56) + '║');
  console.log(`║  - Config:   http://localhost:${PORT}/api/config`.padEnd(56) + '║');
  console.log(`║  - Riders:   http://localhost:${PORT}/api/riders`.padEnd(56) + '║');
  console.log(`║  - WebSocket: ws://localhost:${PORT}/ws`.padEnd(56) + '║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('✓ WebSocket server active - Real-time rider tracking enabled\n');
});
  return server;
}

if (require.main === module) {
  startRealtimeServer();
}

module.exports.startRealtimeServer = startRealtimeServer;
