/**
 * Production Server for SmartSoko
 * Optimized for production with compression, security headers, and error handling
 */

require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const winston = require('winston');

// Firebase Admin SDK for real data
const admin = require('firebase-admin');
const { createDualDb } = require('./lib/server-db');

// ─── In-memory log ring buffer ───────────────────────────────────────
const MAX_LOG_ENTRIES = 2000;
const logBuffer = [];
class MemoryTransport extends winston.Transport {
  constructor(opts) { super(opts); this.name = 'memoryTransport'; }
  log(info, callback) {
    logBuffer.push({ timestamp: info.timestamp || new Date().toISOString(), level: info.level, message: info.message, meta: info.meta || null, stack: info.stack || null });
    if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
    callback();
  }
}

// ─── Audit log buffer ────────────────────────────────────────────────
const MAX_AUDIT_ENTRIES = 1000;
const auditBuffer = [];
function logAudit(action, details, req) {
  const entry = { timestamp: new Date().toISOString(), action: action, details: details || '', user: req && req.user ? (req.user.email || req.user.uid || 'unknown') : 'system', ip: req ? req.ip : '0.0.0.0', uid: req && req.user ? req.user.uid || null : null };
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_AUDIT_ENTRIES) auditBuffer.splice(0, auditBuffer.length - MAX_AUDIT_ENTRIES);
  logger.info('AUDIT: ' + action + (details ? ' — ' + details : ''), { user: entry.user, ip: entry.ip });
}

// Initialize Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
        })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new MemoryTransport()
  ]
});

// Keep the server alive when background services (Firestore, Supabase, payment webhooks)
// fail asynchronously — log instead of crashing the process.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection (recovered):', { error: reason && reason.stack ? reason.stack : String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception (recovered):', { error: err && err.stack ? err.stack : String(err) });
});

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
  db = createDualDb(admin.firestore());
  logger.info('Firebase Admin initialized - Using REAL data from Firestore');
} catch (e) {
  logger.warn('Firebase Admin not initialized: ' + e.message);
  db = createDualDb(null);
  logger.info('Running in Supabase-only mode');
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
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.mapbox.com"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://www.gstatic.com", "https://fonts.gstatic.com", "https://api.mapbox.com", "https://events.mapbox.com", "https://api.mapbox.com", "https://nominatim.openstreetmap.org", "https://cdn.jsdelivr.net", "https://www.google-analytics.com", "https://www.google.com", "https://region1.google-analytics.com", "https://pay.pesapal.com", "https://vonkqyiczeqhuqhahsxm.supabase.co", "https://tiles.stadiamaps.com", "https://*.stadiamaps.com", "https://unpkg.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:", "https://fooddelievry-dce15.firebaseapp.com", "https://pay.pesapal.com"],
      frameSrc: ["'self'", "https://fooddelievry-dce15.firebaseapp.com", "https://*.firebaseapp.com", "https://pay.pesapal.com", "https://cybqa.pesapal.com"],
      upgradeInsecureRequests: null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware — gzip (existing) + brotli
app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Brotli middleware for static text assets (skips API routes — use gzip there)
app.use(function(req, res, next) {
  if (req.path.indexOf('/api/') === 0 || req.path.indexOf('/health') === 0) return next();
  var accept = req.headers['accept-encoding'] || '';
  if (accept.indexOf('br') < 0 || req.headers['x-no-compression']) return next();
  var _write = res.write.bind(res), _end = res.end.bind(res);
  var chunks = [], size = 0;
  res.write = function(chunk) {
    if (chunk) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); size += chunks[chunks.length-1].length; }
    return true;
  };
  res.end = function(chunk, encoding, cb) {
    if (chunk) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); size += chunks[chunks.length-1].length; }
    if (typeof encoding === 'function') { cb = encoding; encoding = null; }
    var raw = size > 0 ? Buffer.concat(chunks, size) : (chunk ? (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)) : Buffer.alloc(0));
    if (raw.length < 1024) { _end(raw, encoding, cb); return; }
    var ct = res.getHeader('content-type') || '';
    if (ct.indexOf('image/') >= 0 || ct.indexOf('video/') >= 0) { _end(raw, encoding, cb); return; }
    zlib.brotliCompress(raw, { params: { [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT, [zlib.constants.BROTLI_PARAM_QUALITY]: 4, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }, function(err, compressed) {
      if (err || compressed.length >= raw.length) { _end(raw, encoding, cb); return; }
      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', 'br');
      _end(compressed, encoding, cb);
    });
  };
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,  // Increased for load testing
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging via Winston
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent') || ''
    });
  });
  next();
});

// Handle /favicon.ico requests (serve SVG directly, avoid redirect that Chrome retries as HTTPS)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Root redirects to login (before static middleware so index.html isn't served)
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Static file serving with caching (public/ is the real site root — matches Firebase/Netlify/Vercel)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true,
  dotfiles: 'allow',
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
    } else if (filePath.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=259200'); // 3 days
    } else if (filePath.match(/\.(html|json)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=600'); // 10 min
    }
  }
}));

// Legacy fallback for any asset still only present in web/
app.use(express.static(path.join(__dirname, 'web')));

function sendHealthPayload(res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
}

// ─── Performance: API response caching & Cache-Control helpers ──────
const apiCache = new Map();
const CACHE_TTL = 60 * 1000;
// Periodic cache cleanup every 5 minutes
setInterval(function() {
  var now = Date.now();
  for (var [key, entry] of apiCache) {
    if ((now - entry.timestamp) > CACHE_TTL * 2) apiCache.delete(key);
  }
}, 300000).unref();

// Invalidate cache entries matching a pattern
function invalidateCache(pattern) {
  var escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  var regex = new RegExp('^' + escaped + '$');
  for (var [key] of apiCache) {
    if (regex.test(key)) apiCache.delete(key);
  }
}

// In-memory cache middleware for GET endpoints
function cacheApiResponse(duration) {
  return (req, res, next) => {
    var key = req.originalUrl;
    var cached = apiCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < (duration || CACHE_TTL)) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }
    var originalJson = res.json.bind(res);
    res.json = function(body) {
      if (res.statusCode === 200) { apiCache.set(key, { data: body, timestamp: Date.now() }); }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}

// Set Cache-Control header on GET responses for browser caching
function setAPICacheControl(maxAgeSeconds, staleWhileRevalidate) {
  if (staleWhileRevalidate === undefined) staleWhileRevalidate = Math.floor(maxAgeSeconds / 2);
  return function(req, res, next) {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=' + maxAgeSeconds + ', stale-while-revalidate=' + staleWhileRevalidate);
      res.setHeader('Vary', 'Accept-Encoding, Authorization');
    }
    next();
  };
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
      pesapal: !!process.env.PESAPAL_CONSUMER_KEY,
      googleMaps: !!process.env.GOOGLE_MAPS_API_KEY
    },
    pricing: {
      deliveryFee: parseInt(process.env.DELIVERY_FEE, 10) || 2000,
      taxRate: parseFloat(process.env.TAX_RATE) || 0.18,
      currency: process.env.CURRENCY || 'TSh'
    }
  });
});

const authMiddleware = require('./middleware/auth');
const validators = require('./validators/schemas');
authMiddleware.setAdmin(admin);

// Re-export auth helpers for use in this file
const { verifyToken, requireRole, optionalAuth, validateInput, sanitizeInput } = authMiddleware;

// Global request sanitization
app.use(sanitizeInput);

async function verifyFirebaseIdToken(idToken) {
  if (!idToken) throw new Error('Missing token');
  if (!db || !admin.apps.length) throw new Error('Authentication service not available');
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const role = decodedToken.role || await authMiddleware.resolveUserRole(decodedToken.uid, db);
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

/** Serialize a Firestore Timestamp (or compatible) to an ISO string. */
function serializeTs(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v.seconds != null) return new Date(v.seconds * 1000).toISOString();
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Public order shape for the admin API (timestamps as ISO strings). */
function toPublicOrder(id, data) {
  return {
    id,
    customerName: data.customerName || data.customer?.name || '',
    customerPhone: data.customerPhone || data.customer?.phone || '',
    customerEmail: data.customerEmail || data.customer?.email || '',
    sellerName: data.sellerName || data.merchantName || '',
    sellerPhone: data.sellerPhone || data.merchantPhone || '',
    customerAddress: data.customerAddress || data.deliveryAddress || '',
    items: data.items || [],
    subtotal: data.subtotal || 0,
    deliveryFee: data.deliveryFee || 0,
    total: data.total || data.amount || 0,
    status: data.status || 'pending',
    createdAt: serializeTs(data.createdAt),
    updatedAt: serializeTs(data.updatedAt),
    confirmedAt: serializeTs(data.confirmedAt),
    preparingAt: serializeTs(data.preparingAt),
    dispatchedAt: serializeTs(data.dispatchedAt),
    deliveredAt: serializeTs(data.deliveredAt)
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
app.get('/api/sellers', cacheApiResponse(30000), async (req, res) => {
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
    logger.error('GET /api/sellers:', error);
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
    logger.error('GET /api/sellers/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seller' });
  }
});

app.get('/api/categories', cacheApiResponse(60000), async (req, res) => {
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
    logger.error('GET /api/categories:', error);
    // Return base categories without counts on Firestore error
    res.json({
      success: true,
      data: base,
      categories: base.map((c) => ({ name: c.name, displayName: c.displayName, count: null, icon: c.icon }))
    });
  }
});

// ===== PUBLIC PRODUCT API ENDPOINTS (customer-facing) =====

/** Convert a raw product doc + optional seller into the shape the Android app expects. */
async function toPublicProduct(id, data) {
  var seller = { id: '', name: 'Unknown', rating: 0, delivery_time: '', image_url: '' };
  if (data.merchantId) {
    try {
      var snap = await db.collection('sellers').doc(data.merchantId).get();
      if (snap.exists) {
        var s = snap.data();
        seller = {
          id: data.merchantId,
          name: s.name || s.businessName || 'Unknown',
          rating: s.rating || 0,
          delivery_time: s.deliveryTime || s.deliveryTimeMinutes || '',
          image_url: s.logoUrl || s.imageUrl || ''
        };
      }
    } catch (e) { /* seller lookup best-effort */ }
  }

  var catInfo = MARKETPLACE_CATEGORIES.find(function(c) { return c.name === data.category; }) || { name: data.category || 'other', displayName: 'Other', icon: 'storefront' };
  var category = { id: data.category || 'other', name: catInfo.displayName, image_url: '', description: '' };

  function toEpochMs(v) {
    if (!v) return Date.now();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v.seconds != null) return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    var d = new Date(v);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  var createdAt = toEpochMs(data.createdAt);
  var updatedAt = toEpochMs(data.updatedAt);

    var stockVal = typeof data.stock === 'number' ? data.stock : parseInt(data.stock, 10);
    if (isNaN(stockVal)) stockVal = -1;

    return {
    id: id,
    name: data.name || '',
    description: data.description || '',
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
    currency: data.currency || process.env.CURRENCY || 'TSh',
    images: data.images || (data.imageUrl ? [data.imageUrl] : []),
    category: category,
    seller: seller,
    stock: stockVal,
    rating: data.rating || 0,
    review_count: data.reviewCount || 0,
    is_featured: data.isFeatured === true || data.is_featured === true,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

// GET /api/products (public, cached 30s)
app.get('/api/products', cacheApiResponse(30000), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var page = Math.max(1, parseInt(req.query.page) || 1);
    var perPage = Math.min(Math.max(1, parseInt(req.query.per_page) || 20), 100);
    var categoryId = req.query.category_id || null;
    var search = req.query.search || null;

    var query = db.collection('products');
    if (categoryId) query = query.where('category', '==', categoryId);
    query = query.orderBy('createdAt', 'desc').limit(perPage);
    if (page > 1) query = query.offset((page - 1) * perPage);

    var snapshot = await query.get();
    var products = snapshot.docs.map(function(d) { var obj = d.data(); obj.id = d.id; return obj; });

    if (search) {
      var q = search.toLowerCase();
      products = products.filter(function(p) {
        return (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
               (p.description && p.description.toLowerCase().indexOf(q) !== -1);
      });
    }

    var data = await Promise.all(products.map(function(p) { return toPublicProduct(p.id, p); }));

    res.json({
      success: true,
      data: {
        data: data,
        pagination: {
          current_page: page,
          per_page: perPage,
          total: snapshot.size,
          total_pages: Math.ceil(snapshot.size / perPage)
        }
      }
    });
  } catch (error) {
    logger.error('GET /api/products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/featured (public, cached 30s)
app.get('/api/products/featured', cacheApiResponse(30000), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var limit = Math.min(parseInt(req.query.limit) || 20, 100);
    var snapshot = await db.collection('products').where('isFeatured', '==', true).limit(limit).get();
    var products = snapshot.docs.map(function(d) { var obj = d.data(); obj.id = d.id; return obj; });
    
    // If no featured products, fallback to latest in-stock products
    if (products.length === 0) {
      snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(Math.max(limit * 3, 60)).get();
      products = snapshot.docs.map(function(d) { var obj = d.data(); obj.id = d.id; return obj; })
        .filter(function(p) {
          var s = typeof p.stock === 'number' ? p.stock : parseInt(p.stock, 10);
          return isNaN(s) || s !== 0;
        })
        .slice(0, limit)
        .map(function(p) { p.isFeatured = true; return p; });
    }
    
    var data = await Promise.all(products.map(function(p) { return toPublicProduct(p.id, p); }));
    return res.json({ success: true, data: data });
  } catch (error) {
    // Fallback: return latest in-stock products if isFeatured filter fails
    logger.warn('Featured query failed, returning latest products:', error.message);
    try {
      var limit = Math.min(parseInt(req.query.limit) || 20, 100);
      var snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(Math.max(limit * 3, 60)).get();
      var products = snapshot.docs.map(function(d) { var obj = d.data(); obj.id = d.id; return obj; })
        .filter(function(p) {
          var s = typeof p.stock === 'number' ? p.stock : parseInt(p.stock, 10);
          return isNaN(s) || s !== 0;
        })
        .slice(0, limit)
        .map(function(p) { p.isFeatured = true; return p; });
      var data = await Promise.all(products.map(function(p) { return toPublicProduct(p.id, p); }));
      return res.json({ success: true, data: data });
    } catch (e2) {
      res.status(500).json({ success: false, error: 'Failed to fetch featured products' });
    }
  }
});

// GET /api/products/:product_id (public)
app.get('/api/products/:product_id', async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('products').doc(req.params.product_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Product not found' });
    var data = await toPublicProduct(doc.id, doc.data());
    res.json({ success: true, data: data });
  } catch (error) {
    logger.error('GET /api/products/:product_id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// ===== AUTHENTICATION API ENDPOINTS =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      return res.status(500).json({ success: false, error: 'Authentication service not configured' });
    }

    const fetch = require('node-fetch');
    const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      const code = fbData.error?.message || 'INVALID_CREDENTIALS';
      const status = code === 'USER_DISABLED' ? 403 : 401;
      return res.status(status).json({ success: false, error: code });
    }

    const decodedToken = await admin.auth().verifyIdToken(fbData.idToken);
    const uid = decodedToken.uid;

    let role = 'customer';
    let userData = {};
    let now = Date.now();

    if (db) {
      const collections = ['users', 'drivers', 'restaurants', 'sellers'];
      for (const col of collections) {
        const doc = await db.collection(col).doc(uid).get();
        if (doc.exists) {
          userData = doc.data();
          if (userData.role) role = userData.role;
          break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        token: fbData.idToken,
        user: {
          id: uid,
          phone_number: userData.phone_number || userData.phone || '',
          name: userData.full_name || userData.name || decodedToken.name || '',
          email: fbData.email || email,
          image_url: userData.image_url || userData.photoURL || null,
          is_verified: userData.is_verified !== undefined ? userData.is_verified : true,
          created_at: userData.created_at || userData.createdAt || now,
          updated_at: userData.updated_at || userData.updatedAt || now
        },
        is_new_user: false
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, phone_number } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: full_name || '',
        ...(phone_number ? { phoneNumber: phone_number } : {})
      });
    } catch (fbErr) {
      const code = fbErr.code || 'UNKNOWN';
      if (code === 'auth/email-already-exists') {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }
      throw fbErr;
    }

    const uid = userRecord.uid;
    const now = Date.now();

    if (db) {
      await db.collection('users').doc(uid).set({
        id: uid,
        email,
        full_name: full_name || '',
        phone_number: phone_number || '',
        role: 'customer',
        is_verified: false,
        created_at: now,
        updated_at: now
      });
    }

    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    let idToken;
    if (firebaseApiKey) {
      const fetch = require('node-fetch');
      const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const fbData = await fbRes.json();
      if (fbRes.ok) idToken = fbData.idToken;
    }

    res.status(201).json({
      success: true,
      data: {
        token: idToken || '',
        user: {
          id: uid,
          phone_number: phone_number || '',
          name: full_name || '',
          email,
          image_url: null,
          is_verified: false,
          created_at: now,
          updated_at: now
        },
        is_new_user: true
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/auth/verify', verifyToken, (req, res) => {
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

// Backwards-compatible endpoints for native Android app
app.post('/api/auth/send-otp', async (req, res) => {
  req.body.phone = req.body.phoneNumber;
  req.url = '/api/auth/otp/send';
  app._router.handle(req, res);
});

app.post('/api/auth/verify-otp', async (req, res) => {
  req.body.phone = req.body.phoneNumber;
  req.body.otp = req.body.otp;
  req.url = '/api/auth/otp/verify';
  app._router.handle(req, res);
});

// ===== OTP (One-Time Password) ENDPOINTS =====
// In-memory OTP store (use Redis in production)
const otpStore = new Map();
const OTP_TTL = 5 * 60 * 1000; // 5 minutes

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

function cleanupOTPStore() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now - value.createdAt > OTP_TTL) {
      otpStore.delete(key);
    }
  }
}
setInterval(cleanupOTPStore, 60000).unref(); // Cleanup every minute

// Send OTP via SMS (simulated - integrate with Twilio/Africa's Talking in production)
async function sendOTP(phone, otp) {
  // TODO: Integrate with SMS provider (Twilio, Africa's Talking, etc.)
  logger.info('Sending OTP to ' + phone);
  // Simulate SMS sending delay
  await new Promise(r => setTimeout(r, 500));
  return { success: true, messageId: 'sim-' + Date.now() };
}

app.post('/api/auth/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    // Normalize phone (Tanzania format: +255XXXXXXXXX or 0XXXXXXXXX)
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '255' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('255')) {
      normalizedPhone = '255' + normalizedPhone;
    }
    normalizedPhone = '+' + normalizedPhone;

    // Look up user (optional - for informational purposes, not blocking)
    let existingUser = null;
    if (db) {
      try {
        const usersRef = db.collection('users');
        const queryPromise = usersRef.where('phone', '==', normalizedPhone).limit(1).get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 5000));
        const query = await Promise.race([queryPromise, timeoutPromise]);
        if (!query.empty) {
          existingUser = { id: query.docs[0].id, ...query.docs[0].data() };
        }
      } catch (queryError) {
        console.error('[OTP SEND] Query error:', queryError.message);
      }
    }

    // Generate and store OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_TTL;
    otpStore.set(normalizedPhone, { otp, createdAt: Date.now(), expiresAt, attempts: 0 });
    console.log('[OTP SEND] Generated OTP:', otp, 'for', normalizedPhone);

    // Send OTP via SMS
    await sendOTP(normalizedPhone, otp);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      phone: normalizedPhone,
      expiresIn: OTP_TTL / 1000
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '255' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('255')) {
      normalizedPhone = '255' + normalizedPhone;
    }
    normalizedPhone = '+' + normalizedPhone;

    const record = otpStore.get(normalizedPhone);
    if (!record) {
      return res.status(400).json({ success: false, error: 'OTP expired or not sent' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }

    if (record.attempts >= 3) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ success: false, error: 'Too many attempts, request new OTP' });
    }

    if (record.otp !== otp) {
      record.attempts++;
      otpStore.set(normalizedPhone, record);
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP verified - get or create user
    let userData = null;
    let customToken = null;
    let uid = null;

    if (db) {
      try {
        const usersRef = db.collection('users');
        const queryPromise = usersRef.where('phone', '==', normalizedPhone).limit(1).get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 5000));
        const query = await Promise.race([queryPromise, timeoutPromise]);

        if (!query.empty) {
          // Existing user
          const doc = query.docs[0];
          uid = doc.id;
          userData = { id: uid, ...doc.data() };
          console.log('[OTP VERIFY] Existing user:', uid);
        } else if (admin && admin.apps.length) {
          // New user - create Firebase Auth account and Firestore profile
          try {
            const hasAuth = !!(admin.auth && admin.auth());
            console.log('[OTP VERIFY] admin.auth() available:', hasAuth);
            if (!hasAuth) { throw new Error('admin.auth() not available'); }
            const newUser = await admin.auth().createUser({
              phoneNumber: normalizedPhone,
              displayName: '',
              emailVerified: false
            });
            uid = newUser.uid;

            // Create basic Firestore profile
            try {
              const userRef = db.collection('users').doc(uid);
              const ts = (admin.firestore && admin.firestore.FieldValue) ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
              userData = {
                phone: normalizedPhone,
                role: 'customer',
                fullName: '',
                email: '',
                createdAt: ts,
                onboardingComplete: false,
                onboardingVersion: 1,
                emailVerified: false
              };
              await userRef.set(userData);
              userData.id = uid;
              console.log('[OTP VERIFY] Created Firestore profile:', uid);
            } catch (fsErr) {
              console.error('[OTP VERIFY] Firestore profile error:', fsErr.message);
              userData = { id: uid, phone: normalizedPhone, role: 'customer', onboardingComplete: false };
            }
          } catch (createErr) {
            console.error('[OTP VERIFY] Failed to create user:', createErr.message);
            // If phone already exists, look up the existing user
            if (createErr.code === 'auth/phone-number-exists' || createErr.message.includes('already exists')) {
              try {
                const existingUser = await admin.auth().getUserByPhoneNumber(normalizedPhone);
                uid = existingUser.uid;
                console.log('[OTP VERIFY] Found existing auth user:', uid);
                // Create Firestore profile if missing
                try {
                  const userRef = db.collection('users').doc(uid);
                  const snap = await userRef.get();
                  if (!snap.exists) {
                    const ts = (admin.firestore && admin.firestore.FieldValue) ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
                    userData = { id: uid, phone: normalizedPhone, role: 'customer', fullName: '', email: '', createdAt: ts, onboardingComplete: false, onboardingVersion: 1, emailVerified: false };
                    await userRef.set(userData);
                    console.log('[OTP VERIFY] Created missing Firestore profile:', uid);
                  } else {
                    userData = { id: uid, ...snap.data() };
                    console.log('[OTP VERIFY] Found existing Firestore profile:', uid);
                  }
                } catch (fsErr) {
                  console.error('[OTP VERIFY] Firestore read/write error:', fsErr.message);
                  userData = { id: uid, phone: normalizedPhone, role: 'customer', onboardingComplete: false };
                }
              } catch (lookupErr) {
                console.error('[OTP VERIFY] Lookup failed:', lookupErr.message);
              }
            }
          }
        }

        // Create custom token for sign-in
        if (uid && admin && admin.apps.length) {
          try {
            customToken = await admin.auth().createCustomToken(uid, {
              role: userData?.role || 'customer',
              phone_verified: true,
              auth_method: 'phone_otp'
            });
          } catch (tokenErr) {
            console.error('[OTP VERIFY] Custom token error:', tokenErr.message);
          }
        }
      } catch (queryError) {
        console.error('[OTP VERIFY] Query error:', queryError.message);
      }
    }

    // Clean up OTP
    otpStore.delete(normalizedPhone);

    // Return user data and custom token for client-side sign-in
    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      user: userData,
      token: customToken,
      phone: normalizedPhone
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
});

// Resend OTP
app.post('/api/auth/otp/resend', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '255' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('255')) {
      normalizedPhone = '255' + normalizedPhone;
    }
    normalizedPhone = '+' + normalizedPhone;

    // Check if recent OTP exists (rate limit: 1 per minute)
    const record = otpStore.get(normalizedPhone);
    if (record && Date.now() - record.createdAt < 60000) {
      return res.status(429).json({ success: false, error: 'Please wait before requesting another OTP' });
    }

    // Generate and store new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_TTL;
    otpStore.set(normalizedPhone, { otp, createdAt: Date.now(), expiresAt, attempts: 0 });

    await sendOTP(normalizedPhone, otp);

    res.json({ 
      success: true, 
      message: 'OTP resent successfully',
      phone: normalizedPhone,
      expiresIn: OTP_TTL / 1000
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend OTP' });
  }
});

// Custom token for Firebase Auth (after OTP verification)
app.post('/api/auth/custom-token', verifyToken, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { uid, phone, role } = req.body;
    if (!uid && !phone) {
      return res.status(400).json({ success: false, error: 'UID or phone required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not initialized' });
    }

    let targetUid = uid;
    if (!targetUid && phone) {
      // Look up user by phone
      const usersRef = db.collection('users');
      const query = await usersRef.where('phone', '==', phone).limit(1).get();
      if (!query.empty) {
        targetUid = query.docs[0].id;
      }
    }

    if (!targetUid) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Create custom token with claims
    const customToken = await admin.auth().createCustomToken(targetUid, {
      role: role || 'customer',
      phone_verified: true
    });

    res.json({ success: true, token: customToken });
  } catch (error) {
    console.error('Custom token error:', error);
    res.status(500).json({ success: false, error: 'Failed to create custom token' });
  }
});

app.get('/api/driver/profile', verifyToken, requireRole('driver', 'admin'), async (req, res) => {
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
    logger.error('Failed to load driver profile:', error);
    res.status(500).json({ success: false, error: 'Failed to load driver profile' });
  }
});

const routes = [
  'login', 'home', 'merchant', 'driver', 'admin',
  'discovery', 'profile', 'cart', 'orders', 'product',
  'restaurant', 'chat', 'track-order', 'checkout', '404', 'wallet',
  'store',
  'signup', 'main', 'seller', 'index', 'onboarding', 'check-user',
  'fleet-manager', 'admin-panel', 'supabase', 'seed-merchant',
  'smartsoko-home', 'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout'
];

routes.forEach(route => {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', `${route}.html`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  });
});

// SPA fallback for merchant/* and driver/* routes (client-side routing)
app.get('/merchant*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'merchant.html'));
});
app.get('/driver*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'driver.html'));
});
app.get('/customer*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'customer.html'));
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
    logger.error('Error fetching store:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store' });
  }
});

// Vendor product CRUD
app.post('/api/vendor/products', verifyToken, requireRole('merchant', 'admin'), sanitizeInput, validateInput(validators.createProductSchema), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const productData = req.validatedBody;
    const result = await db.collection('products').add({
      ...productData,
      merchantId: req.user.uid,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

app.put('/api/vendor/products/:id', verifyToken, requireRole('merchant', 'admin'), sanitizeInput, validateInput(validators.updateProductSchema), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const updates = req.validatedBody;
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (productDoc.data().merchantId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await productRef.update({
      ...updates,
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

app.delete('/api/vendor/products/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
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
    logger.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// Vendor analytics
app.get('/api/vendor/analytics', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const merchantId = req.query.merchantId || req.user.uid;
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let ordersQuery;
    try {
      ordersQuery = await db.collection('orders')
        .where('merchantId', '==', merchantId)
        .where('createdAt', '>=', startDate)
        .get();
    } catch (qErr) {
      // Fallback: composite index may be missing (FAILED_PRECONDITION) or Firestore unreachable.
      // Fetch all merchant orders and filter by date in memory.
      logger.warn('Analytics indexed query failed, falling back to full scan: ' + (qErr && qErr.message));
      const all = await db.collection('orders').where('merchantId', '==', merchantId).get();
      const docs = all.docs.filter(d => {
        const o = d.data();
        const ts = o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) : null;
        return ts && ts >= startDate;
      });
      ordersQuery = { forEach: (cb) => docs.forEach(d => cb(d)), size: docs.length };
    }

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

      const items = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
      items.forEach(item => {
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
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Get merchant's orders
app.get('/api/vendor/orders', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const merchantId = req.query.merchantId || req.user.uid;
    const limitNum = Math.min(parseInt(req.query.limit) || 50, 200);
    const status = req.query.status;

    let snapshot;
    try {
      let query = db.collection('orders').where('merchantId', '==', merchantId);
      if (status) query = query.where('status', '==', status);
      query = query.orderBy('createdAt', 'desc').limit(limitNum);
      snapshot = await query.get();
    } catch (qErr) {
      // Fallback when composite index (merchantId + createdAt) is missing or Firestore unreachable.
      logger.warn('Vendor orders indexed query failed, falling back to full scan: ' + (qErr && qErr.message));
      const all = await db.collection('orders').where('merchantId', '==', merchantId).get();
      let docs = all.docs;
      if (status) docs = docs.filter(d => (d.data().status || 'pending') === status);
      docs = docs
        .sort((a, b) => {
          const ta = a.data().createdAt ? (a.data().createdAt.toDate ? a.data().createdAt.toDate().getTime() : new Date(a.data().createdAt).getTime()) : 0;
          const tb = b.data().createdAt ? (b.data().createdAt.toDate ? b.data().createdAt.toDate().getTime() : new Date(b.data().createdAt).getTime()) : 0;
          return tb - ta;
        })
        .slice(0, limitNum);
      snapshot = { docs: docs.map(d => ({ id: d.id, data: () => d.data() })), size: docs.length };
    }

    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, orders, total: orders.length });
  } catch (error) {
    logger.error('Error fetching vendor orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Get single order detail
app.get('/api/vendor/orders/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const data = doc.data();
    if (data.merchantId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    res.json({ success: true, order: { id: doc.id, ...data } });
  } catch (error) {
    logger.error('Error fetching order detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// Update order status
app.put('/api/vendor/orders/:id/status', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const ref = db.collection('orders').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const data = doc.data();
    if (data.merchantId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await ref.update({
      status,
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
      [`statusHistory.${status}`]: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// List merchant products
app.get('/api/vendor/products', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('products').where('merchantId', '==', req.user.uid).get();
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, products, total: products.length });
  } catch (error) {
    logger.error('Error listing products:', error);
    res.status(500).json({ success: false, error: 'Failed to list products' });
  }
});

// Wallet: get balance
app.get('/api/vendor/wallet', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snap = await db.collection('wallets').doc(req.user.uid).get();
    if (!snap.exists) {
      await db.collection('wallets').doc(req.user.uid).set({ balance: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0, createdAt: new Date().toISOString() });
      return res.json({ success: true, wallet: { balance: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 } });
    }
    res.json({ success: true, wallet: { id: snap.id, ...snap.data() } });
  } catch (error) {
    logger.error('Error fetching wallet:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet' });
  }
});

// Wallet: transactions
app.get('/api/vendor/wallet/transactions', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const limitNum = Math.min(parseInt(req.query.limit) || 50, 200);
    const snapshot = await db.collection('walletTransactions')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .get();
    const txns = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, transactions: txns });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// Wallet: request withdrawal
app.post('/api/vendor/wallet/withdraw', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { amount, method, accountDetails } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
    const walletSnap = await db.collection('wallets').doc(req.user.uid).get();
    if (!walletSnap.exists || (walletSnap.data().balance || 0) < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }
    await db.collection('walletTransactions').add({
      userId: req.user.uid,
      type: 'withdrawal',
      amount,
      method: method || 'mobile_money',
      accountDetails: accountDetails || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await db.collection('wallets').doc(req.user.uid).update({
      balance: require('firebase-admin').firestore.FieldValue.increment(-amount),
      pending: require('firebase-admin').firestore.FieldValue.increment(amount)
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing withdrawal:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT SETTINGS
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/settings', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snap = await db.collection('merchantSettings').doc(req.user.uid).get();
    if (!snap.exists) {
      const defaults = {
        storeName: '', storeDescription: '', storeAddress: '', storePhone: '',
        storeCategory: 'Food & Drinks', storeLogo: '', storeCover: '',
        isOpen: true, openTime: '08:00', closeTime: '22:00',
        operatingHours: { mon: { open: '08:00', close: '22:00', active: true }, tue: { open: '08:00', close: '22:00', active: true }, wed: { open: '08:00', close: '22:00', active: true }, thu: { open: '08:00', close: '22:00', active: true }, fri: { open: '08:00', close: '22:00', active: true }, sat: { open: '08:00', close: '22:00', active: true }, sun: { open: '09:00', close: '20:00', active: false } },
        deliveryFee: 0, deliveryRadius: 5, minOrder: 0, estimatedDeliveryTime: '30-45 min',
        taxRate: 0, taxInclusive: true, tin: '',
        acceptedPayments: ['cash', 'mobile_money', 'card'],
        createdAt: new Date().toISOString()
      };
      await db.collection('merchantSettings').doc(req.user.uid).set(defaults);
      return res.json({ success: true, settings: defaults });
    }
    res.json({ success: true, settings: { id: snap.id, ...snap.data() } });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/vendor/settings', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const updates = req.body;
    delete updates.createdAt;
    delete updates.id;
    await db.collection('merchantSettings').doc(req.user.uid).set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

app.put('/api/vendor/settings/status', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { isOpen } = req.body;
    await db.collection('merchantSettings').doc(req.user.uid).set({ isOpen: !!isOpen }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT PROMOTIONS / DEALS
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/promotions', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('promotions').where('merchantId', '==', req.user.uid).orderBy('createdAt', 'desc').get();
    const promos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, promotions: promos });
  } catch (error) {
    logger.error('Error fetching promotions:', error);
    res.json({ success: true, promotions: [] });
  }
});

app.post('/api/vendor/promotions', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { name, type, value, minOrder, maxUses, startDate, endDate, code, productIds } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, error: 'Name and type required' });
    const result = await db.collection('promotions').add({
      merchantId: req.user.uid, name, type, value: value || 0,
      minOrder: minOrder || 0, maxUses: maxUses || 0, usedCount: 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null, code: code || '', productIds: productIds || [],
      isActive: true, createdAt: new Date().toISOString()
    });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    logger.error('Error creating promotion:', error);
    res.status(500).json({ success: false, error: 'Failed to create promotion' });
  }
});

app.put('/api/vendor/promotions/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('promotions').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    const updates = req.body;
    delete updates.merchantId;
    delete updates.createdAt;
    await ref.update(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.delete('/api/vendor/promotions/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('promotions').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT REVIEWS
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/reviews', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('reviews').where('merchantId', '==', req.user.uid).orderBy('createdAt', 'desc').limit(100).get();
    const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalRating = reviews.reduce((s, r) => s + (r.rating || 0), 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    res.json({ success: true, reviews, avgRating: parseFloat(avgRating), total: reviews.length });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.json({ success: true, reviews: [], avgRating: 0, total: 0 });
  }
});

app.post('/api/vendor/reviews/:id/reply', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ success: false, error: 'Reply text required' });
    const ref = db.collection('reviews').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Review not found' });
    await ref.update({ reply, replyBy: req.user.uid, repliedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reply' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT STAFF
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/staff', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('merchantStaff').where('merchantId', '==', req.user.uid).get();
    const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, staff });
  } catch (error) {
    res.json({ success: true, staff: [] });
  }
});

app.post('/api/vendor/staff', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { name, email, phone, role, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    const result = await db.collection('merchantStaff').add({
      merchantId: req.user.uid, name, email: email || '', phone: phone || '',
      role: role || 'staff', permissions: permissions || ['orders', 'inventory'],
      isActive: true, createdAt: new Date().toISOString()
    });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add staff' });
  }
});

app.put('/api/vendor/staff/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('merchantStaff').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    const updates = req.body;
    delete updates.merchantId;
    delete updates.createdAt;
    await ref.update(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.delete('/api/vendor/staff/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('merchantStaff').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT BRANCHES / MULTI-LOCATION
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/branches', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('merchantBranches').where('merchantId', '==', req.user.uid).get();
    const branches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, branches });
  } catch (error) {
    res.json({ success: true, branches: [] });
  }
});

app.post('/api/vendor/branches', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { name, address, phone, latitude, longitude, managerId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    const result = await db.collection('merchantBranches').add({
      merchantId: req.user.uid, name, address: address || '', phone: phone || '',
      latitude: latitude || 0, longitude: longitude || 0, managerId: managerId || '',
      isActive: true, createdAt: new Date().toISOString()
    });
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add branch' });
  }
});

app.put('/api/vendor/branches/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('merchantBranches').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    const updates = req.body;
    delete updates.merchantId;
    delete updates.createdAt;
    await ref.update(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.delete('/api/vendor/branches/:id', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const ref = db.collection('merchantBranches').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().merchantId !== req.user.uid) return res.status(404).json({ success: false, error: 'Not found' });
    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
app.get('/api/vendor/notifications', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = notifications.filter(n => !n.read).length;
    res.json({ success: true, notifications, unread });
  } catch (error) {
    res.json({ success: true, notifications: [], unread: 0 });
  }
});

app.put('/api/vendor/notifications/read', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const snapshot = await db.collection('notifications').where('userId', '==', req.user.uid).where('read', '==', false).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT PRODUCT AVAILABILITY TOGGLE
// ═══════════════════════════════════════════════════════════════
app.put('/api/vendor/products/:id/availability', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { available } = req.body;
    const ref = db.collection('products').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Product not found' });
    if (doc.data().merchantId !== req.user.uid && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Not authorized' });
    await ref.update({ available: !!available, updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle availability' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MERCHANT IMAGE UPLOAD
// ═══════════════════════════════════════════════════════════════
app.post('/api/vendor/upload', verifyToken, requireRole('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const { imageBase64, fileName, folder } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Image data required' });
    const bucket = require('firebase-admin').storage().bucket();
    const filePath = `merchants/${req.user.uid}/${folder || 'uploads'}/${fileName || Date.now() + '.jpg'}`;
    const file = bucket.file(filePath);
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    await file.save(buffer, { metadata: { contentType: 'image/jpeg' } });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    res.json({ success: true, url: publicUrl });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// Create new order
app.post('/api/orders', verifyToken, sanitizeInput, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    // ── MOBILE APP FLOW: body is { addressId, paymentMethodId, notes } ──
    if (req.body && req.body.addressId) {
      const addressDoc = await db.collection('addresses').doc(req.body.addressId).get();
      if (!addressDoc.exists || addressDoc.data().userId !== req.user.uid) {
        return res.status(404).json({ success: false, error: 'Address not found' });
      }
      const cartDoc = await db.collection('carts').doc(req.user.uid).get();
      const cart = cartDoc.exists ? cartDoc.data() : { items: [] };
      const items = (cart.items || []).map(serializeCartItem);
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart is empty' });
      }
      let paymentDoc = null;
      if (req.body.paymentMethodId) {
        paymentDoc = await db.collection('payment_methods').doc(req.body.paymentMethodId).get();
        if (!paymentDoc.exists || paymentDoc.data().userId !== req.user.uid) {
          return res.status(404).json({ success: false, error: 'Payment method not found' });
        }
      }
      const addr = addressDoc.data();
      const subtotal = items.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
      const deliveryFee = 0;
      const total = Math.round(subtotal + deliveryFee);
      const now = Date.now();
      const orderRef = await db.collection('orders').add({
        customerId: req.user.uid,
        customerName: addr.fullName || 'Customer',
        customerPhone: addr.phoneNumber || '',
        customerEmail: req.user.email || '',
        addressId: req.body.addressId,
        deliveryAddress: [addr.streetAddress, addr.apartment, addr.city].filter(Boolean).join(', '),
        deliveryCity: addr.city || '',
        deliveryApartment: addr.apartment || null,
        deliveryPostalCode: addr.postalCode || null,
        deliveryLat: addr.latitude || 0,
        deliveryLng: addr.longitude || 0,
        items: items,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        tax: 0,
        discountAmount: 0,
        total: total,
        paymentMethod: paymentDoc ? (paymentDoc.data().type || 'cash') : 'cash',
        paymentStatus: 'pending',
        status: 'pending',
        orderType: 'delivery',
        notes: req.body.notes || '',
        createdAt: now,
        updatedAt: now
      });

      // Broadcast order status via WebSocket if available
      broadcastToFleet({
        type: 'new_order',
        data: { id: orderRef.id, status: 'pending', items: items.length }
      });
      // Broadcast full driver payload so connected drivers see the order live
      try {
        var newOrderDoc = await db.collection('orders').doc(orderRef.id).get();
        broadcastToFleet({ type: 'order_update', data: await serializeOrderForDriver(newOrderDoc) });
      } catch (e) { /* best effort */ }

      return res.status(201).json({
        success: true,
        data: {
          id: orderRef.id,
          user_id: req.user.uid,
          items: items,
          status: 'pending',
          delivery_address: serializeAddressDoc(addressDoc),
          payment_method: paymentDoc ? serializePaymentMethodDoc(paymentDoc) : null,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          total: total,
          currency: 'TSh',
          created_at: now,
          updated_at: now,
          estimated_delivery_time: null,
          driver: null,
          tracking: null
        }
      });
    }

    // ── WEB FLOW (original) ──
    const orderData = validators.createOrderSchema.parse(req.body);
    const result = await db.collection('orders').add({
      ...orderData,
      customerId: req.user.uid,
      customerEmail: req.user.email || '',
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    // Broadcast order status via WebSocket if available
    broadcastToFleet({
      type: 'new_order',
      data: { id: result.id, status: 'pending', items: orderData.items.length }
    });

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation Error' });
    }
    logger.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ===== CUSTOMER ORDER API ENDPOINTS =====

// GET /api/orders (customer - list own orders)
app.get('/api/orders', verifyToken, cacheApiResponse(30000), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var page = Math.max(1, parseInt(req.query.page) || 1);
    var perPage = Math.min(Math.max(1, parseInt(req.query.per_page) || 20), 100);
    var status = req.query.status || null;

    var query = db.collection('orders').where('customerId', '==', req.user.uid).orderBy('createdAt', 'desc');
    if (status) {
      query = query.where('status', '==', status);
    }
    query = query.limit(perPage);
    if (page > 1) query = query.offset((page - 1) * perPage);

    var snapshot = await query.get();
    var isMobile = /okhttp|curl/i.test(req.get('user-agent') || '');
    var orders = snapshot.docs.map(function(d) {
      if (isMobile) return serializeOrderForMobile(d);
      var obj = d.data(); obj.id = d.id; return obj;
    });

    res.json({
      success: true,
      data: {
        data: orders,
        pagination: {
          current_page: page,
          per_page: perPage,
          total: snapshot.size,
          total_pages: Math.ceil(snapshot.size / perPage)
        }
      }
    });
  } catch (error) {
    logger.error('GET /api/orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/available (driver - list orders available to accept)
app.get('/api/orders/available', verifyToken, requireRole('driver', 'admin'), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    var offset = Math.max(parseInt(req.query.offset) || 0, 0);
    var snapshot = await db.collection('orders').where('status', 'in', ['pending', 'new']).get();
    var open = [];
    for (var i = 0; i < snapshot.docs.length; i++) {
      var d = snapshot.docs[i].data();
      if (d.driverId) continue;
      if (d.status === 'pending' || d.status === 'new') open.push(snapshot.docs[i]);
    }
    open.sort(function(a, b) {
      var ta = toEpochMillis(a.data().createdAt);
      var tb = toEpochMillis(b.data().createdAt);
      return tb - ta;
    });
    var paged = open.slice(offset, offset + limit);
    var orders = [];
    for (var j = 0; j < paged.length; j++) {
      orders.push(await serializeOrderForDriver(paged[j]));
    }
    res.json({ success: true, orders: orders });
  } catch (error) {
    logger.error('GET /api/orders/available:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available orders' });
  }
});

// GET /api/orders/:order_id (customer - single order detail)
app.get('/api/orders/:order_id', verifyToken, async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('orders').doc(req.params.order_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    var data = doc.data();
    if (req.user.role === 'driver') {
      if (data.driverId && data.driverId !== req.user.uid) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      var driverOrder = await serializeOrderForDriver(doc);
      return res.json({ success: true, order: driverOrder });
    }
    if (data.customerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    if (/okhttp|curl/i.test(req.get('user-agent') || '')) {
      return res.json({ success: true, data: serializeOrderForMobile(doc) });
    }
    res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (error) {
    logger.error('GET /api/orders/:order_id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// POST /api/orders/:order_id/cancel (customer - cancel own order)
app.post('/api/orders/:order_id/cancel', verifyToken, async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('orders').doc(req.params.order_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    var data = doc.data();
    if (data.customerId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    var currentStatus = data.status;
    if (['delivered', 'cancelled', 'refunded'].includes(currentStatus)) {
      return res.status(400).json({ success: false, error: 'Cannot cancel order in status: ' + currentStatus });
    }
    await doc.update({ status: 'cancelled', updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    logger.error('POST /api/orders/:order_id/cancel:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// GET /api/orders/:order_id/tracking (customer - order tracking)
app.get('/api/orders/:order_id/tracking', verifyToken, async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('orders').doc(req.params.order_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    var data = doc.data();
    if (data.customerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    var tracking = {
      orderId: doc.id,
      status: data.status,
      driver: data.driver || null,
      estimatedDeliveryTime: data.estimatedDeliveryTime || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
    if (/okhttp|curl/i.test(req.get('user-agent') || '')) {
      const dest = {
        latitude: Number(data.deliveryLat) || 0,
        longitude: Number(data.deliveryLng) || 0,
        address: data.deliveryAddress || ''
      };
      return res.json({
        success: true,
        data: {
          driver_location: data.driver && data.driver.currentLocation ? {
            latitude: Number(data.driver.currentLocation.latitude) || 0,
            longitude: Number(data.driver.currentLocation.longitude) || 0,
            address: data.driver.currentLocation.address || null
          } : null,
          destination: dest,
          route: [],
          eta: data.estimatedDeliveryTime ? Number(data.estimatedDeliveryTime) : 0,
          distance_remaining: 0,
          last_updated: data.updatedAt ? Number(data.updatedAt) : Date.now()
        }
      });
    }
    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('GET /api/orders/:order_id/tracking:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DRIVER DELIVERY API (available, accept, status)
// ═══════════════════════════════════════════════════════════════

// POST /api/orders/:orderId/accept (driver - accept an order)
app.post('/api/orders/:orderId/accept', verifyToken, requireRole('driver', 'admin'), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var orderRef = db.collection('orders').doc(req.params.orderId);
    var doc = await orderRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    var data = doc.data();
    if (data.driverId && data.driverId !== req.user.uid) {
      return res.status(409).json({ success: false, error: 'Order already accepted by another driver' });
    }
    if (['delivered', 'cancelled', 'refunded'].includes(data.status)) {
      return res.status(400).json({ success: false, error: 'Cannot accept order in status: ' + data.status });
    }
    var now = new Date().toISOString();
    await orderRef.update({
      driverId: req.user.uid,
      driverName: req.user.name || req.user.email || '',
      status: 'assigned',
      updatedAt: now
    });
    var freshDoc = await orderRef.get();
    var order = await serializeOrderForDriver(freshDoc);
    broadcastToFleet({ type: 'order_accepted', data: order });
    broadcastOrderStatus(order.id, order.status, { driverId: req.user.uid });
    res.json({ success: true, message: 'Order accepted', order: order });
  } catch (error) {
    logger.error('POST /api/orders/:orderId/accept:', error);
    res.status(500).json({ success: false, error: 'Failed to accept order' });
  }
});

// POST /api/orders/:orderId/status (driver - update delivery status)
app.post('/api/orders/:orderId/status', verifyToken, requireRole('driver', 'admin'), async function(req, res) {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var status = req.body && req.body.status ? String(req.body.status) : '';
    var allowed = ['pending', 'accepted', 'preparing', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    var orderRef = db.collection('orders').doc(req.params.orderId);
    var doc = await orderRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    var data = doc.data();
    if (req.user.role !== 'admin' && data.driverId && data.driverId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }
    var now = new Date().toISOString();
    await orderRef.update({ status: status, updatedAt: now });
    var freshDoc = await orderRef.get();
    var order = await serializeOrderForDriver(freshDoc);
    broadcastToFleet({ type: 'order_update', data: order });
    broadcastOrderStatus(order.id, order.status, { driverId: req.user.uid });
    res.json({ success: true, message: 'Order status updated to ' + status, order: order });
  } catch (error) {
    logger.error('POST /api/orders/:orderId/status:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CUSTOMER MOBILE APP API (addresses, cart, payment methods, profile)
// ═══════════════════════════════════════════════════════════════

function toEpochMillis(value) {
  if (value === null || value === undefined) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || Date.now();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  return Date.now();
}

function serializeAddressDoc(doc) {
  var d = doc.data() || {};
  return {
    id: doc.id,
    user_id: d.userId || '',
    title: d.title || 'Other',
    full_name: d.fullName || '',
    phone_number: d.phoneNumber || '',
    street_address: d.streetAddress || '',
    apartment: d.apartment || null,
    city: d.city || '',
    postal_code: d.postalCode || null,
    location: {
      latitude: Number(d.latitude) || 0,
      longitude: Number(d.longitude) || 0,
      address: d.address || d.streetAddress || null,
      timestamp: toEpochMillis(d.createdAt)
    },
    is_default: !!d.isDefault,
    delivery_instructions: d.deliveryInstructions || null
  };
}

function serializePaymentMethodDoc(doc) {
  var d = doc.data() || {};
  return {
    id: doc.id,
    type: d.type || 'cash',
    display_name: d.displayName || (d.type || 'cash'),
    is_default: !!d.isDefault,
    last_four_digits: d.lastFourDigits || null,
    provider: d.provider || null
  };
}

function serializeCartItem(item) {
  return {
    product_id: item.productId,
    product_name: item.productName || '',
    product_image: item.productImage || '',
    quantity: item.quantity || 1,
    price: Number(item.price) || 0,
    seller_id: item.sellerId || '',
    seller_name: item.sellerName || '',
    stock: item.stock !== undefined ? item.stock : 0
  };
}

function serializeOrderForMobile(doc) {
  var d = doc.data() || {};
  var items = (d.items || []).map(serializeCartItem);
  var street = d.deliveryAddress || '';
  var city = d.deliveryCity || '';
  var fullName = d.customerName || '';
  return {
    id: doc.id,
    user_id: d.customerId || '',
    items: items,
    status: d.status || 'pending',
    delivery_address: {
      id: d.addressId || '',
      user_id: d.customerId || '',
      title: d.addressTitle || 'Other',
      full_name: fullName,
      phone_number: d.customerPhone || '',
      street_address: street,
      apartment: d.deliveryApartment || null,
      city: city,
      postal_code: d.deliveryPostalCode || null,
      location: {
        latitude: Number(d.deliveryLat) || 0,
        longitude: Number(d.deliveryLng) || 0,
        address: street,
        timestamp: toEpochMillis(d.createdAt)
      },
      is_default: false,
      delivery_instructions: d.notes || null
    },
    payment_method: {
      id: '',
      type: d.paymentMethod || 'cash',
      display_name: d.paymentMethod || 'cash',
      is_default: false,
      last_four_digits: null,
      provider: null
    },
    subtotal: Number(d.subtotal) || 0,
    delivery_fee: Number(d.deliveryFee) || 0,
    total: Number(d.total) || 0,
    currency: d.currency || 'TSh',
    created_at: toEpochMillis(d.createdAt),
    updated_at: toEpochMillis(d.updatedAt),
    estimated_delivery_time: d.estimatedDeliveryTime ? toEpochMillis(d.estimatedDeliveryTime) : null,
    driver: d.driver ? {
      id: d.driver.id || '',
      name: d.driver.name || '',
      phone_number: d.driver.phoneNumber || '',
      vehicle_number: d.driver.vehicleNumber || '',
      vehicle_type: d.driver.vehicleType || '',
      rating: d.driver.rating || 0,
      image_url: d.driver.imageUrl || null,
      current_location: d.driver.currentLocation ? {
        latitude: Number(d.driver.currentLocation.latitude) || 0,
        longitude: Number(d.driver.currentLocation.longitude) || 0,
        address: d.driver.currentLocation.address || null,
        timestamp: toEpochMillis(d.driver.currentLocation.timestamp)
      } : null
    } : null,
    tracking: null
  };
}

/**
 * Serialize an order doc for the driver app (flat contract).
 * Restaurant/pickup info is resolved best-effort from the sellers collection.
 */
async function serializeOrderForDriver(doc) {
  var d = doc.data() || {};
  var items = (d.items || []).map(function(i) {
    return {
      name: i.product_name || i.name || 'Item',
      quantity: Number(i.quantity) || 1,
      price: Number(i.price) || 0,
      notes: i.notes || i.specialInstructions || null
    };
  });
  var restaurantName = d.restaurantName || d.sellerName || (d.items && d.items[0] ? d.items[0].seller_name : '') || '';
  var restaurantAddress = d.restaurantAddress || d.pickupAddress || '';
  var restaurantLat = null;
  var restaurantLng = null;
  var sellerId = d.restaurantId || d.sellerId || (d.items && d.items[0] ? (d.items[0].sellerId || d.items[0].seller_id) : '');
  if (sellerId && db) {
    try {
      var sellerDoc = await db.collection('sellers').doc(sellerId).get();
      if (sellerDoc.exists) {
        var s = sellerDoc.data();
        if (!restaurantName) restaurantName = s.name || 'Store';
        if (!restaurantAddress) restaurantAddress = s.address || s.fullAddress || '';
        if (s.latitude != null) restaurantLat = Number(s.latitude);
        if (s.longitude != null) restaurantLng = Number(s.longitude);
      }
    } catch (e) { /* best effort */ }
  }
  var customerLat = Number(d.deliveryLat) || Number(d.customerLat) || 0;
  var customerLng = Number(d.deliveryLng) || Number(d.customerLng) || 0;
  var createdAt = serializeTs(d.createdAt) || String(d.createdAt || '');
  var updatedAt = serializeTs(d.updatedAt) || String(d.updatedAt || '');
  return {
    id: doc.id,
    restaurantName: restaurantName || 'Unknown merchant',
    restaurantAddress: restaurantAddress || '',
    restaurantLat: restaurantLat,
    restaurantLng: restaurantLng,
    restaurantLocation: { lat: restaurantLat, lng: restaurantLng },
    customerName: d.customerName || 'Customer',
    customerAddress: d.deliveryAddress || '',
    customerLat: customerLat,
    customerLng: customerLng,
    customerLocation: { lat: customerLat, lng: customerLng },
    items: items,
    totalAmount: Number(d.total) || Number(d.amount) || 0,
    status: d.status || 'pending',
    createdAt: createdAt,
    updatedAt: updatedAt,
    deliveryInstructions: d.notes || d.deliveryInstructions || null
  };
}

// GET /api/addresses (customer - list own addresses)
app.get('/api/addresses', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var snapshot = await db.collection('addresses').where('userId', '==', req.user.uid).get();
    var addresses = snapshot.docs.map(serializeAddressDoc);
    res.json({ success: true, data: addresses });
  } catch (error) {
    logger.error('GET /api/addresses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch addresses' });
  }
});

// POST /api/addresses (customer - create address)
app.post('/api/addresses', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var b = req.body || {};
    if (!b.streetAddress || !b.city || !b.fullName) {
      return res.status(400).json({ success: false, error: 'streetAddress, city and fullName are required' });
    }
    var now = Date.now();
    var data = {
      userId: req.user.uid,
      title: b.title || 'Other',
      fullName: b.fullName,
      phoneNumber: b.phoneNumber || '',
      streetAddress: b.streetAddress,
      apartment: b.apartment || null,
      city: b.city,
      postalCode: b.postalCode || null,
      latitude: Number(b.latitude) || 0,
      longitude: Number(b.longitude) || 0,
      address: b.address || b.streetAddress,
      isDefault: !!b.isDefault,
      deliveryInstructions: b.deliveryInstructions || null,
      createdAt: now,
      updatedAt: now
    };
    var ref = await db.collection('addresses').add(data);
    var doc = await db.collection('addresses').doc(ref.id).get();
    res.status(201).json({ success: true, data: serializeAddressDoc(doc) });
  } catch (error) {
    logger.error('POST /api/addresses:', error);
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
});

// PUT /api/addresses/:address_id (customer - update own address)
app.put('/api/addresses/:address_id', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('addresses').doc(req.params.address_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Address not found' });
    var existing = doc.data();
    if (existing.userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    var b = req.body || {};
    var patch = {
      title: b.title !== undefined ? b.title : existing.title,
      fullName: b.fullName !== undefined ? b.fullName : existing.fullName,
      phoneNumber: b.phoneNumber !== undefined ? b.phoneNumber : existing.phoneNumber,
      streetAddress: b.streetAddress !== undefined ? b.streetAddress : existing.streetAddress,
      apartment: b.apartment !== undefined ? b.apartment : existing.apartment,
      city: b.city !== undefined ? b.city : existing.city,
      postalCode: b.postalCode !== undefined ? b.postalCode : existing.postalCode,
      latitude: b.latitude !== undefined ? Number(b.latitude) : existing.latitude,
      longitude: b.longitude !== undefined ? Number(b.longitude) : existing.longitude,
      address: b.address !== undefined ? b.address : existing.address,
      isDefault: b.isDefault !== undefined ? !!b.isDefault : !!existing.isDefault,
      deliveryInstructions: b.deliveryInstructions !== undefined ? b.deliveryInstructions : existing.deliveryInstructions,
      updatedAt: Date.now()
    };
    await doc.update(patch);
    var updated = await db.collection('addresses').doc(req.params.address_id).get();
    res.json({ success: true, data: serializeAddressDoc(updated) });
  } catch (error) {
    logger.error('PUT /api/addresses/:address_id:', error);
    res.status(500).json({ success: false, error: 'Failed to update address' });
  }
});

// DELETE /api/addresses/:address_id (customer - delete own address)
app.delete('/api/addresses/:address_id', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('addresses').doc(req.params.address_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Address not found' });
    if (doc.data().userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    await doc.delete();
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    logger.error('DELETE /api/addresses/:address_id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
});

// POST /api/addresses/:address_id/set-default (customer - set default address)
app.post('/api/addresses/:address_id/set-default', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('addresses').doc(req.params.address_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Address not found' });
    if (doc.data().userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    var mine = await db.collection('addresses').where('userId', '==', req.user.uid).get();
    for (var i = 0; i < mine.docs.length; i++) {
      var d = mine.docs[i];
      if (d.data().isDefault && d.id !== req.params.address_id) {
        await d.update({ isDefault: false });
      }
    }
    await doc.update({ isDefault: true });
    res.json({ success: true, message: 'Default address updated' });
  } catch (error) {
    logger.error('POST /api/addresses/:address_id/set-default:', error);
    res.status(500).json({ success: false, error: 'Failed to set default address' });
  }
});

// GET /api/cart (customer - get own cart)
app.get('/api/cart', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('carts').doc(req.user.uid).get();
    if (!doc.exists) {
      return res.json({ success: true, data: { id: req.user.uid, user_id: req.user.uid, items: [], updated_at: Date.now() } });
    }
    var cart = doc.data() || {};
    res.json({
      success: true,
      data: {
        id: doc.id,
        user_id: cart.userId || req.user.uid,
        items: (cart.items || []).map(serializeCartItem),
        updated_at: toEpochMillis(cart.updatedAt)
      }
    });
  } catch (error) {
    logger.error('GET /api/cart:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST /api/cart/items (customer - add item to cart)
app.post('/api/cart/items', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var b = req.body || {};
    var productId = b.product_id || b.productId;
    if (!productId) return res.status(400).json({ success: false, error: 'product_id is required' });
    var quantity = Math.max(1, parseInt(b.quantity) || 1);
    var productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) return res.status(404).json({ success: false, error: 'Product not found' });
    var p = productDoc.data() || {};
    var sellerName = p.sellerName || (p.seller && p.seller.name) || 'Unknown';
    var sellerId = p.sellerId || (p.seller && p.seller.id) || '';
    var productImage = Array.isArray(p.images) && p.images.length ? p.images[0] : (p.imageUrl || p.image_url || '');
    var price = Number(p.price) || 0;
    var stock = p.stock !== undefined && p.stock !== null ? Number(p.stock) : -1;

    var cartRef = db.collection('carts').doc(req.user.uid);
    var doc = await cartRef.get();
    var items = doc.exists ? ((doc.data() || {}).items || []) : [];
    var existing = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].productId === productId) { existing = items[i]; break; }
    }
    if (existing) {
      existing.quantity = existing.quantity + quantity;
      if (stock >= 0 && existing.quantity > stock) {
        return res.status(400).json({ success: false, error: 'Not enough stock available' });
      }
    } else {
      if (stock >= 0 && quantity > stock) {
        return res.status(400).json({ success: false, error: 'Not enough stock available' });
      }
      items.push({
        productId: productId,
        productName: p.name || '',
        productImage: productImage,
        quantity: quantity,
        price: price,
        sellerId: sellerId,
        sellerName: sellerName,
        stock: stock
      });
    }
    var now = Date.now();
    await cartRef.set({ userId: req.user.uid, items: items, updatedAt: now }, { merge: true });
    var cartDoc = await cartRef.get();
    res.json({
      success: true,
      data: {
        id: cartDoc.id,
        user_id: req.user.uid,
        items: (cartDoc.data().items || []).map(serializeCartItem),
        updated_at: now
      }
    });
  } catch (error) {
    logger.error('POST /api/cart/items:', error);
    res.status(500).json({ success: false, error: 'Failed to add item to cart' });
  }
});

// PUT /api/cart/items (customer - update item quantity; cart_item_id is the product_id)
app.put('/api/cart/items', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var b = req.body || {};
    var cartItemId = b.cart_item_id || b.cartItemId;
    var quantity = parseInt(b.quantity) || 1;
    if (!cartItemId) return res.status(400).json({ success: false, error: 'cart_item_id is required' });
    if (quantity < 1) return res.status(400).json({ success: false, error: 'quantity must be at least 1' });
    var cartRef = db.collection('carts').doc(req.user.uid);
    var doc = await cartRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Cart is empty' });
    var items = (doc.data() || {}).items || [];
    var found = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].productId === cartItemId) {
        var stock = items[i].stock;
        if (stock >= 0 && quantity > stock) {
          return res.status(400).json({ success: false, error: 'Not enough stock available' });
        }
        items[i].quantity = quantity;
        found = true;
        break;
      }
    }
    if (!found) return res.status(404).json({ success: false, error: 'Cart item not found' });
    var now = Date.now();
    await cartRef.set({ userId: req.user.uid, items: items, updatedAt: now }, { merge: true });
    res.json({
      success: true,
      data: {
        id: doc.id,
        user_id: req.user.uid,
        items: items.map(serializeCartItem),
        updated_at: now
      }
    });
  } catch (error) {
    logger.error('PUT /api/cart/items:', error);
    res.status(500).json({ success: false, error: 'Failed to update cart item' });
  }
});

// DELETE /api/cart/items/:cart_item_id (customer - remove item; cart_item_id is the product_id)
app.delete('/api/cart/items/:cart_item_id', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var cartRef = db.collection('carts').doc(req.user.uid);
    var doc = await cartRef.get();
    if (!doc.exists) return res.json({ success: true, data: { id: req.user.uid, user_id: req.user.uid, items: [], updated_at: Date.now() } });
    var items = ((doc.data() || {}).items || []).filter(function(item) { return item.productId !== req.params.cart_item_id; });
    var now = Date.now();
    await cartRef.set({ userId: req.user.uid, items: items, updatedAt: now }, { merge: true });
    res.json({
      success: true,
      data: {
        id: doc.id,
        user_id: req.user.uid,
        items: items.map(serializeCartItem),
        updated_at: now
      }
    });
  } catch (error) {
    logger.error('DELETE /api/cart/items/:cart_item_id:', error);
    res.status(500).json({ success: false, error: 'Failed to remove cart item' });
  }
});

// DELETE /api/cart (customer - clear cart)
app.delete('/api/cart', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('carts').doc(req.user.uid).set({ userId: req.user.uid, items: [], updatedAt: Date.now() }, { merge: true });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    logger.error('DELETE /api/cart:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
});

// GET /api/payment-methods (customer - list own payment methods)
app.get('/api/payment-methods', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var snapshot = await db.collection('payment_methods').where('userId', '==', req.user.uid).get();
    var methods = snapshot.docs.map(serializePaymentMethodDoc);
    res.json({ success: true, data: methods });
  } catch (error) {
    logger.error('GET /api/payment-methods:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
  }
});

// POST /api/payment-methods (customer - add payment method)
app.post('/api/payment-methods', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var b = req.body || {};
    if (!b.type) return res.status(400).json({ success: false, error: 'type is required' });
    var now = Date.now();
    var snapshot = await db.collection('payment_methods').where('userId', '==', req.user.uid).get();
    var isFirst = snapshot.size === 0;
    var ref = await db.collection('payment_methods').add({
      userId: req.user.uid,
      type: b.type,
      displayName: b.displayName || b.type,
      lastFourDigits: b.lastFourDigits || null,
      provider: b.provider || null,
      isDefault: isFirst ? true : !!b.isDefault,
      createdAt: now,
      updatedAt: now
    });
    var doc = await db.collection('payment_methods').doc(ref.id).get();
    res.status(201).json({ success: true, data: serializePaymentMethodDoc(doc) });
  } catch (error) {
    logger.error('POST /api/payment-methods:', error);
    res.status(500).json({ success: false, error: 'Failed to add payment method' });
  }
});

// DELETE /api/payment-methods/:payment_method_id (customer - delete own method)
app.delete('/api/payment-methods/:payment_method_id', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('payment_methods').doc(req.params.payment_method_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Payment method not found' });
    if (doc.data().userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    await doc.delete();
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    logger.error('DELETE /api/payment-methods/:payment_method_id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment method' });
  }
});

// POST /api/payment-methods/:payment_method_id/set-default (customer - set default)
app.post('/api/payment-methods/:payment_method_id/set-default', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('payment_methods').doc(req.params.payment_method_id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Payment method not found' });
    if (doc.data().userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Not authorized' });
    var mine = await db.collection('payment_methods').where('userId', '==', req.user.uid).get();
    for (var i = 0; i < mine.docs.length; i++) {
      var d = mine.docs[i];
      if (d.data().isDefault && d.id !== req.params.payment_method_id) {
        await d.update({ isDefault: false });
      }
    }
    await doc.update({ isDefault: true });
    res.json({ success: true, message: 'Default payment method updated' });
  } catch (error) {
    logger.error('POST /api/payment-methods/:payment_method_id/set-default:', error);
    res.status(500).json({ success: false, error: 'Failed to set default payment method' });
  }
});

// GET /api/users/profile (customer - get own profile)
app.get('/api/users/profile', verifyToken, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var doc = await db.collection('users').doc(req.user.uid).get();
    var u = doc.exists ? doc.data() : {};
    var now = Date.now();
    res.json({
      success: true,
      data: {
        id: req.user.uid,
        phone_number: u.phone_number || u.phone || u.phoneNumber || '',
        name: u.full_name || u.name || '',
        email: u.email || req.user.email || '',
        image_url: u.image_url || u.photoURL || u.imageUrl || null,
        is_verified: u.is_verified !== undefined ? !!u.is_verified : true,
        created_at: toEpochMillis(u.created_at || u.createdAt) || now,
        updated_at: toEpochMillis(u.updated_at || u.updatedAt) || now
      }
    });
  } catch (error) {
    logger.error('GET /api/users/profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile (customer - update own profile)
app.put('/api/users/profile', verifyToken, sanitizeInput, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    var b = req.body || {};
    var patch = { updatedAt: Date.now() };
    if (b.name !== undefined) patch.name = b.name;
    if (b.email !== undefined) patch.email = b.email;
    if (b.imageUrl !== undefined) patch.imageUrl = b.imageUrl;
    await db.collection('users').doc(req.user.uid).set(patch, { merge: true });
    var doc = await db.collection('users').doc(req.user.uid).get();
    var u = doc.exists ? doc.data() : {};
    var now = Date.now();
    res.json({
      success: true,
      data: {
        id: req.user.uid,
        phone_number: u.phone_number || u.phone || u.phoneNumber || '',
        name: u.full_name || u.name || '',
        email: u.email || req.user.email || '',
        image_url: u.image_url || u.photoURL || u.imageUrl || null,
        is_verified: u.is_verified !== undefined ? !!u.is_verified : true,
        created_at: toEpochMillis(u.created_at || u.createdAt) || now,
        updated_at: toEpochMillis(u.updated_at || u.updatedAt) || now
      }
    });
  } catch (error) {
    logger.error('PUT /api/users/profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /api/auth/refresh (customer - refresh Supabase session token)
app.post('/api/auth/refresh', async (req, res) => {
  try {
    var refreshToken = (req.body || {}).refresh_token || (req.body || {}).refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refresh_token is required' });
    }
    var supabaseUrl = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
    var apikey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!apikey) {
      return res.status(500).json({ success: false, error: 'Auth service not configured' });
    }
    var fetch = require('node-fetch');
    var fbRes = await fetch(supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    var data = await fbRes.json();
    if (!fbRes.ok || !data.access_token) {
      return res.status(fbRes.status || 401).json({ success: false, error: (data.error_description || data.error || 'Refresh failed') });
    }
    res.json({
      success: true,
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 3600
      }
    });
  } catch (error) {
    logger.error('POST /api/auth/refresh:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SHOPIFY-STYLE FEATURES API
// ═══════════════════════════════════════════════════════════════
const shopifyFeatures = require('./api/shopify-features.js');
shopifyFeatures.init(db, admin, authMiddleware, validateInput);
app.use('/api/shopify', shopifyFeatures);

// ═══════════════════════════════════════════════════════════════
// PESAPAL PAYMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════
const pesapalModule = require('./api/pesapal');
pesapalModule.init(db, authMiddleware);
app.use('/api/payments/pesapal', pesapalModule);

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
    logger.error('Error creating deal:', error);
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
    logger.error('Error fetching deals:', error);
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
    logger.error('Error processing loyalty points:', error);
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
    logger.error('Error fetching loyalty points:', error);
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
    logger.error('Error creating referral:', error);
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
    logger.error('Error fetching referrals:', error);
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
    logger.error('Error calculating surge pricing:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate pricing' });
  }
});

// ===== PUSH NOTIFICATIONS =====
// Store push subscriptions per user: { [userId]: [subscription, ...] }
const pushSubscriptions = {};

app.post('/api/notifications/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    const idToken = getBearerTokenFromRequest(req);
    if (!idToken || !db) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    if (!pushSubscriptions[uid]) pushSubscriptions[uid] = [];
    const exists = pushSubscriptions[uid].some(s => JSON.stringify(s) === JSON.stringify(subscription));
    if (!exists) pushSubscriptions[uid].push(subscription);

    await db.collection('push_subscriptions').doc(uid).set({
      subscriptions: pushSubscriptions[uid],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

app.post('/api/notifications/send', async (req, res) => {
  try {
    const { userId, title, body, url, orderId } = req.body;
    if (!userId || !title) return res.status(400).json({ success: false, error: 'userId and title required' });

    const subs = pushSubscriptions[userId] || [];
    if (subs.length === 0) {
      return res.json({ success: true, sent: 0, note: 'No subscriptions' });
    }

    const webpush = require('web-push');
    const vapidKeys = {
      publicKey: 'BNDx7CvSBCAWR8JUjr1pI37-vpF9kAfAER5pN_SRDSYy5sVnJvGuJgBU9Rz5bE5D8kOx1fAMmpaJ02wK8h9QjsA',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'default-private-key-do-not-use'
    };
    webpush.setVapidDetails('mailto:admin@smartsoko.com', vapidKeys.publicKey, vapidKeys.privateKey);

    const payload = JSON.stringify({ title, body, url: url || '/', orderId: orderId || null, tag: orderId || 'general' });
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          const idx = pushSubscriptions[userId].indexOf(sub);
          if (idx > -1) pushSubscriptions[userId].splice(idx, 1);
        }
      }
    }

    res.json({ success: true, sent });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Helper to send notification to a user by role
async function notifyUserByRole(role, title, body, url, orderId) {
  if (!db) return;
  try {
    const usersSnap = await db.collection('users').where('role', '==', role).get();
    for (const doc of usersSnap.docs) {
      const uid = doc.id;
      const subs = pushSubscriptions[uid] || [];
      if (subs.length === 0) continue;
      try {
        await fetch(`http://localhost:${PORT}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, title, body, url, orderId })
        });
      } catch (e) { /* skip */ }
    }
  } catch (e) {
    console.error('notifyUserByRole error:', e.message);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
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
    logger.info('Firestore not available, using cache/simulation');
    return ridersCache;
  }
  
  try {
    logger.info('Fetching real drivers from Firestore...');
    const snapshot = await db.collection('drivers').get();
    console.log(`Found ${snapshot.size} drivers in Firestore`);
    
    if (snapshot.empty) {
      logger.info('No drivers found in Firestore');
      if (process.env.ENABLE_TEST_DATA_SEEDING === 'true') {
        logger.info('ENABLE_TEST_DATA_SEEDING=true, seeding test data...');
        await seedTestDrivers();
      }
      return ridersCache;
    }
    
    const riders = snapshot.docs.map(doc => toPublicRider(doc.id, doc.data()));
    ridersCache = riders;
    console.log(`Loaded ${riders.length} real drivers from Firestore`);
    return riders;
  } catch (error) {
    logger.error('Error fetching riders from Firestore:', error);
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
    logger.error('Error seeding test drivers:', error);
    ridersCache = testDrivers.map(driver => toPublicRider(driver.id, driver));
  }
}

// API endpoint to get all riders
app.get('/api/riders', verifyToken, requireRole('admin'), async (req, res) => {
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
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}

app.get('/api/dashboard/stats', verifyToken, requireRole('admin'), handleAdminDashboardStats);
app.get('/api/admin/dashboard', verifyToken, requireRole('admin'), handleAdminDashboardStats);

// API endpoint to get single rider
app.get('/api/riders/:id', verifyToken, requireRole('admin'), async (req, res) => {
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
    logger.error('Error fetching rider:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rider' });
  }
});

// Firestore real-time listener for driver locations
let driversUnsubscribe = null;

function startFirestoreListeners() {
  if (!db) {
    logger.info('Firestore not available, using simulation mode');
    startSimulationMode();
    return;
  }

  logger.info('Starting Firestore real-time listeners...');

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
      logger.error('Firestore listener error:', error);
      // Fallback to simulation mode
      startSimulationMode();
    });
}

// Simulation mode (fallback when Firestore unavailable)
function startSimulationMode() {
  logger.info('Starting simulation mode for rider movement');

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

app.get('/api/route', verifyToken, requireRole('admin', 'driver', 'merchant'), async (req, res) => {
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
    logger.error('Route calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate route' });
  }
});

// Optimize route with multiple waypoints (Traveling Salesman)
app.post('/api/route/optimize', verifyToken, requireRole('admin', 'driver', 'merchant'), async (req, res) => {
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
app.get('/api/admin/system/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const memUsed = process.memoryUsage();

    // Check all external services in parallel
    var results = await Promise.all([
      // Supabase
      (async function() {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
          const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
          if (!supabaseKey) return 'unconfigured';
          const testClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          const { error } = await testClient.from('orders').select('id', { count: 'exact', head: true }).limit(1);
          return error ? 'error' : 'connected';
        } catch(e) { return 'unavailable'; }
      })(),
      // PesaPal
      (async function() {
        try {
          const https = require('https');
          return await new Promise(function(resolve) {
            var req = https.get('https://api.pesapal.com/', { timeout: 4000 }, function(res) {
              resolve(res.statusCode < 500 ? 'connected' : 'degraded');
            });
            req.on('error', function() { resolve('disconnected'); });
            req.on('timeout', function() { req.destroy(); resolve('timeout'); });
          });
        } catch(e) { return 'disconnected'; }
      })(),
      // Mapbox
      (async function() {
        try {
          const https = require('https');
          return await new Promise(function(resolve) {
            var req = https.get('https://api.mapbox.com/', { timeout: 4000 }, function(res) {
              resolve(res.statusCode < 500 ? 'connected' : 'degraded');
            });
            req.on('error', function() { resolve('disconnected'); });
            req.on('timeout', function() { req.destroy(); resolve('timeout'); });
          });
        } catch(e) { return 'disconnected'; }
      })()
    ]);

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
        supabase: results[0],
        pesapal: results[1],
        mapbox: results[2],
        activeConnections: process._getActiveRequests ? process._getActiveRequests().length : 0,
        memoryPercent: {
          heapUsed: memUsed.heapTotal ? Math.round((memUsed.heapUsed / memUsed.heapTotal) * 100) : 0,
          rss: memUsed.heapTotal ? Math.round((memUsed.rss / memUsed.heapTotal) * 100) : 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching system status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system status' });
  }
});

app.get('/api/admin/system/logs', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { type = 'all', limit = 100, search = '' } = req.query;
    const logLimit = Math.min(parseInt(String(limit), 10) || 100, 1000);
    var filtered = logBuffer;
    if (type !== 'all') filtered = filtered.filter(function(e) { return e.level === type; });
    if (search) {
      var q = String(search).toLowerCase();
      filtered = filtered.filter(function(e) { return e.message.toLowerCase().indexOf(q) >= 0 || (e.meta && JSON.stringify(e.meta).toLowerCase().indexOf(q) >= 0); });
    }
    var recent = filtered.slice(-logLimit).reverse();
    res.json({ success: true, data: recent, count: recent.length, total: filtered.length });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// Audit log endpoint
app.get('/api/admin/audit', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 100, action = '' } = req.query;
    const logLimit = Math.min(parseInt(String(limit), 10) || 100, 500);
    var filtered = auditBuffer;
    if (action) filtered = filtered.filter(function(e) { return e.action && e.action.toLowerCase().indexOf(action.toLowerCase()) >= 0; });
    var recent = filtered.slice(-logLimit).reverse();
    res.json({ success: true, data: recent, count: recent.length, total: filtered.length });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Settings storage (Firestore-backed, fallback to in-memory)
var settingsCache = null;
var SETTINGS_DOC = 'admin_settings';

async function getSettings() {
  if (settingsCache) return settingsCache;
  var defaults = { baseDeliveryFee: 3000, commissionRate: 10, minOrderAmount: 0, maxDeliveryDistance: 15, notifyNewSeller: true, notifyHighValueOrder: true, notifyDailySummary: true, notifyOrderStatus: false, storeOpenHour: 8, storeCloseHour: 22, maxDriverOrders: 3, maintenanceMode: false, currency: 'TSh', updatedAt: null, updatedBy: null };
  try {
    if (db) {
      var doc = await db.collection('system').doc(SETTINGS_DOC).get();
      if (doc.exists) { settingsCache = Object.assign({}, defaults, doc.data()); return settingsCache; }
    }
    settingsCache = Object.assign({}, defaults);
    return settingsCache;
  } catch (e) { settingsCache = Object.assign({}, defaults); return settingsCache; }
}

app.get('/api/admin/settings', verifyToken, requireRole('admin'), setAPICacheControl(60, 300), async (req, res) => {
  try {
    var s = await getSettings();
    res.json({ success: true, data: s });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    var allowed = ['baseDeliveryFee','commissionRate','minOrderAmount','maxDeliveryDistance','notifyNewSeller','notifyHighValueOrder','notifyDailySummary','notifyOrderStatus','storeOpenHour','storeCloseHour','maxDriverOrders','maintenanceMode','currency'];
    var updates = {};
    allowed.forEach(function(k) { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user ? req.user.email || req.user.uid || 'admin' : 'admin';
    // Persist if possible, but never fail the request if the backing store is
    // unavailable (e.g. Supabase 'system' table not provisioned). The in-memory
    // cache still serves subsequent GETs for this process.
    if (db) {
      try {
        await db.collection('system').doc(SETTINGS_DOC).set(updates, { merge: true });
      } catch (persistErr) {
        logger.warn('Settings persist skipped (using in-memory cache): ' + (persistErr && persistErr.message));
      }
    }
    settingsCache = Object.assign({}, settingsCache || {}, updates);
    var changed = Object.keys(updates).filter(function(k) { return k !== 'updatedAt' && k !== 'updatedBy'; }).map(function(k) { return k + '=' + updates[k]; }).join(', ');
    logAudit('settings_update', 'Settings changed: ' + changed, req);
    res.json({ success: true, data: settingsCache, message: 'Settings saved' });
  } catch (error) {
    logger.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
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

app.get('/api/admin/reports', verifyToken, requireRole('admin'), async (req, res) => {
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
    logger.error('Error generating reports:', error);
    res.json({ success: true, data: { period, generatedAt: new Date().toISOString(), orders: { total: 0, byStatus: {}, totalRevenue: 0 }, users: { total: 0, sellers: 0, drivers: 0 } } });
  }
});

app.get('/api/admin/sellers', verifyToken, requireRole('admin'), setAPICacheControl(30, 60), cacheApiResponse(10000), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { status, limit = 100, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, parseInt(String(limit), 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    let q = db.collection('sellers');
    if (status === 'open') q = q.where('isOpen', '==', true);
    if (status === 'closed') q = q.where('isOpen', '==', false);
    const snapshot = await q.offset(offset).limit(limitNum).get();
    const sellers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: sellers, count: sellers.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching sellers:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.get('/api/admin/users', verifyToken, requireRole('admin'), setAPICacheControl(30, 60), cacheApiResponse(10000), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { role, limit = 200, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(500, parseInt(String(limit), 10) || 200);
    const offset = (pageNum - 1) * limitNum;
    let q = db.collection('users');
    if (role && role !== 'all') q = q.where('role', '==', role);
    const snapshot = await q.offset(offset).limit(limitNum).get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: users, count: users.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.put('/api/admin/sellers/:sellerId', verifyToken, requireRole('admin'), async (req, res) => {
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
    const now = new Date().toISOString();
    // Map verification workflow flags onto the real schema. The live store
    // (Supabase) uses `is_verified` rather than `approved`/`rejected`, and has
    // no per-action timestamp columns — those are folded into `updated_at`.
    if (action === 'approve') {
      await sellerRef.update({ is_verified: true, updatedAt: now });
    } else if (action === 'reject') {
      await sellerRef.update({ is_verified: false, updatedAt: now });
    } else if (action === 'suspend') {
      await sellerRef.update({ is_open: false, updatedAt: now });
    } else if (action === 'unsuspend') {
      await sellerRef.update({ is_open: true, updatedAt: now });
    } else {
      await sellerRef.update({ ...updates, updatedAt: now });
    }
    logAudit('seller_' + (action || 'update'), 'Seller ' + sellerId + ' — ' + (action || 'updated fields'), req);
    invalidateCache('/api/admin/sellers*');
    res.json({ success: true, message: 'Seller updated', action });
  } catch (error) {
    logger.error('Error updating seller:', error);
    res.status(500).json({ success: false, error: 'Failed to update seller' });
  }
});

app.get('/api/admin/drivers', verifyToken, requireRole('admin'), setAPICacheControl(30, 60), cacheApiResponse(10000), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { limit = 100, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, parseInt(String(limit), 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snapshot = await db.collection('drivers').offset(offset).limit(limitNum).get();
    const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: drivers, count: drivers.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching drivers:', error);
    res.json({ success: true, data: [], count: 0, page: 1, limit: limitNum });
  }
});

// ─── Admin order management (REST API consumed by admin.html) ───
app.get('/api/admin/orders', verifyToken, requireRole('admin'), setAPICacheControl(15, 60), cacheApiResponse(5000), async (req, res) => {
  logger.info('admin/orders', 'GET request', { query: req.query, user: req.user ? req.user.email : 'unknown' });
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { limit = 100, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, parseInt(String(limit), 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const orders = snap.docs.map((doc) => toPublicOrder(doc.id, doc.data()));
    res.json({ success: true, orders, count: orders.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:orderId', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { orderId } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing status' });
    }
    const FieldValue = admin.firestore.FieldValue;
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });
    logAudit('order_status', 'Order ' + orderId + ' → ' + status, req);
    invalidateCache('/api/admin/orders*');
    invalidateCache('/api/admin/settings*');
    res.json({ success: true, message: 'Order updated', orderId, status });
  } catch (error) {
    logger.error('Error updating admin order:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// Client-side log ingestion endpoint for admin dashboard error reporting
app.post('/api/admin/log', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { level, area, msg, data, stack, url, userAgent } = req.body || {};
    const entry = { level: level || 'info', area: area || 'client', msg: msg || '', data: data || null, stack: stack || null, url: url || req.headers.referer || '', userAgent: userAgent || req.headers['user-agent'] || '', ip: req.ip, ts: new Date().toISOString(), uid: req.user?.uid || 'anonymous' };
    var logLevel = entry.level;
    var logMsg = '[CLIENT][' + entry.area + '] ' + entry.msg;
    if (logLevel === 'error') logger.error(logMsg, { data: entry.data, stack: entry.stack, uid: entry.uid, ip: entry.ip });
    else if (logLevel === 'warn') logger.warn(logMsg, { data: entry.data, uid: entry.uid });
    else logger.info(logMsg, { data: entry.data, uid: entry.uid });
    res.json({ success: true });
  } catch (err) {
    logger.error('Error ingesting client log:', err);
    res.status(500).json({ success: false, error: 'Log ingestion failed' });
  }
});

// GET /api/admin/users/export — Export users to CSV
app.get('/api/admin/users/export', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { role, status } = req.query;
    let q = db.collection('users');
    if (role && role !== 'all') q = q.where('role', '==', role);
    if (status && status !== 'all') q = q.where('status', '==', status);
    const snap = await q.limit(5000).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Created At', 'Last Login', 'Referral Code', 'Referral Count'];
    const rows = users.map(u => [
      u.id,
      u.name || u.fullName || '',
      u.email || '',
      u.phone || '',
      u.role || 'customer',
      u.status || 'active',
      u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '',
      u.referralCode || '',
      u.referralCount || 0
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users-export-' + new Date().toISOString().slice(0, 10) + '.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting users:', error);
    res.status(500).json({ success: false, error: 'Failed to export users' });
  }
});

// GET /api/admin/users/stats — User statistics overview
app.get('/api/admin/users/stats', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const [allSnap, activeSnap, suspendedSnap, deletedSnap, customerSnap, sellerSnap, driverSnap, adminSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('users').where('status', '==', 'active').get(),
      db.collection('users').where('status', '==', 'suspended').get(),
      db.collection('users').where('status', '==', 'deleted').get(),
      db.collection('users').where('role', '==', 'customer').get(),
      db.collection('users').where('role', '==', 'seller').get(),
      db.collection('users').where('role', '==', 'driver').get(),
      db.collection('users').where('role', '==', 'admin').get()
    ]);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newThisWeek = allSnap.docs.filter(d => d.data().createdAt && new Date(d.data().createdAt) > weekAgo).length;
    const newThisMonth = allSnap.docs.filter(d => d.data().createdAt && new Date(d.data().createdAt) > monthAgo).length;
    res.json({
      success: true,
      data: {
        total: allSnap.size,
        active: activeSnap.size,
        suspended: suspendedSnap.size,
        deleted: deletedSnap.size,
        byRole: { customer: customerSnap.size, seller: sellerSnap.size, driver: driverSnap.size, admin: adminSnap.size },
        growth: { thisWeek: newThisWeek, thisMonth: newThisMonth }
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user stats' });
  }
});

// ─── Admin user management (CRUD) ─────────────────────────────────
app.get('/api/admin/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

app.post('/api/admin/users', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, email, phone, role, status } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email are required' });
    const newUser = {
      name, email, phone: phone || '', role: role || 'customer', status: status || 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      createdBy: req.user?.email || 'admin'
    };
    const ref = await db.collection('users').add(newUser);
    logAudit('user_created', 'User ' + email + ' created by admin', req);
    invalidateCache('/api/admin/users*');
    res.json({ success: true, data: { id: ref.id, ...newUser }, message: 'User created' });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const { name, email, phone, role, status, imageUrl } = req.body || {};
    const updates = { updatedAt: new Date().toISOString(), updatedBy: req.user?.email || 'admin' };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    await db.collection('users').doc(id).update(updates);
    logAudit('user_updated', 'User ' + id + ' updated — ' + Object.keys(updates).filter(k => k !== 'updatedAt' && k !== 'updatedBy').join(', '), req);
    invalidateCache('/api/admin/users*');
    res.json({ success: true, message: 'User updated', updates: Object.keys(updates) });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

app.post('/api/admin/users/:id/suspend', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    await db.collection('users').doc(id).update({
      status: 'suspended', suspendedAt: new Date().toISOString(),
      suspendedBy: req.user?.email || 'admin', updatedAt: new Date().toISOString()
    });
    logAudit('user_suspended', 'User ' + id + ' suspended', req);
    invalidateCache('/api/admin/users*');
    res.json({ success: true, message: 'User suspended' });
  } catch (error) {
    logger.error('Error suspending user:', error);
    res.status(500).json({ success: false, error: 'Failed to suspend user' });
  }
});

app.post('/api/admin/users/:id/activate', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    await db.collection('users').doc(id).update({
      status: 'active', activatedAt: new Date().toISOString(),
      activatedBy: req.user?.email || 'admin', updatedAt: new Date().toISOString()
    });
    logAudit('user_activated', 'User ' + id + ' reactivated', req);
    invalidateCache('/api/admin/users*');
    res.json({ success: true, message: 'User activated' });
  } catch (error) {
    logger.error('Error activating user:', error);
    res.status(500).json({ success: false, error: 'Failed to activate user' });
  }
});

app.delete('/api/admin/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const userData = doc.data();
    // Soft delete — mark as deleted rather than removing
    await db.collection('users').doc(id).update({
      status: 'deleted', deletedAt: new Date().toISOString(),
      deletedBy: req.user?.email || 'admin', updatedAt: new Date().toISOString()
    });
    logAudit('user_deleted', 'User ' + id + ' (' + (userData.email || '') + ') deleted by admin', req);
    invalidateCache('/api/admin/users*');
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ─── Admin user management — Extended ────────────────────────────
// GET /api/admin/users/:id/activity — User activity/audit log
app.get('/api/admin/users/:id/activity', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const limitNum = Math.min(200, parseInt(limit, 10) || 50);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limitNum;
    const snap = await db.collection('audit_logs')
      .where('userId', '==', id)
      .orderBy('timestamp', 'desc')
      .offset(offset)
      .limit(limitNum)
      .get();
    const activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: activities, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user activity' });
  }
});

// GET /api/admin/users/:id/orders — User's orders
app.get('/api/admin/users/:id/orders', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, status } = req.query;
    const limitNum = Math.min(200, parseInt(limit, 10) || 50);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limitNum;
    let q = db.collection('orders').where('customerId', '==', id);
    if (status && status !== 'all') q = q.where('status', '==', status);
    const snap = await q.orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: orders, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user orders' });
  }
});

// GET /api/admin/users/:id/payments — User's payment methods & transactions
app.get('/api/admin/users/:id/payments', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    const limitNum = Math.min(200, parseInt(limit, 10) || 50);
    const [paymentMethodsSnap, transactionsSnap] = await Promise.all([
      db.collection('paymentMethods').where('userId', '==', id).limit(limitNum).get(),
      db.collection('transactions').where('userId', '==', id).orderBy('createdAt', 'desc').limit(limitNum).get()
    ]);
    const paymentMethods = paymentMethodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const transactions = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { paymentMethods, transactions } });
  } catch (error) {
    logger.error('Error fetching user payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user payments' });
  }
});

// GET /api/admin/users/:id/referrals — User's referral info
app.get('/api/admin/users/:id/referrals', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const userData = userDoc.data();
    const referralsSnap = await db.collection('users').where('referredBy', '==', id).get();
    const referrals = referralsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const referralCode = userData.referralCode || '—';
    const referralCount = referrals.length;
    const referralEarnings = referrals.reduce((sum, r) => sum + (r.referralEarnings || 0), 0);
    res.json({ success: true, data: { referralCode, referralCount, referralEarnings, referrals } });
  } catch (error) {
    logger.error('Error fetching user referrals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user referrals' });
  }
});

// POST /api/admin/users/bulk-action — Bulk suspend/activate/delete/role change
app.post('/api/admin/users/bulk-action', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { userIds, action, role, reason } = req.body || {};
    if (!Array.isArray(userIds) || !userIds.length) return res.status(400).json({ success: false, error: 'No users selected' });
    if (!['suspend', 'activate', 'delete', 'roleChange'].includes(action)) return res.status(400).json({ success: false, error: 'Invalid action' });
    if (action === 'roleChange' && !role) return res.status(400).json({ success: false, error: 'Role required for roleChange' });

    const batch = db.batch();
    const timestamp = new Date().toISOString();
    const updates = { updatedAt: timestamp, updatedBy: req.user?.email || 'admin' };

    for (const uid of userIds) {
      const docRef = db.collection('users').doc(uid);
      if (action === 'suspend') {
        batch.update(docRef, { ...updates, status: 'suspended', suspendedAt: timestamp, suspendedBy: req.user?.email || 'admin', suspendReason: reason || '' });
        logAudit('user_suspended', 'Bulk suspended user ' + uid, req);
      } else if (action === 'activate') {
        batch.update(docRef, { ...updates, status: 'active', activatedAt: timestamp, activatedBy: req.user?.email || 'admin' });
        logAudit('user_activated', 'Bulk activated user ' + uid, req);
      } else if (action === 'delete') {
        batch.update(docRef, { ...updates, status: 'deleted', deletedAt: timestamp, deletedBy: req.user?.email || 'admin' });
        logAudit('user_deleted', 'Bulk deleted user ' + uid, req);
      } else if (action === 'roleChange') {
        batch.update(docRef, { ...updates, role });
        logAudit('user_role_changed', 'Bulk role change user ' + uid + ' to ' + role, req);
      }
    }
    await batch.commit();
    invalidateCache('/api/admin/users*');
    res.json({ success: true, message: userIds.length + ' users ' + action + 'd' });
  } catch (error) {
    logger.error('Error bulk action users:', error);
    res.status(500).json({ success: false, error: 'Failed to perform bulk action' });
  }
});

// POST /api/admin/users/:id/impersonate — Generate impersonation token
app.post('/api/admin/users/:id/impersonate', verifyToken, requireRole('admin'), async (req, res) => {
  if (!admin) return res.status(503).json({ success: false, error: 'Auth service not available' });
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const userData = userDoc.data();
    if (userData.status === 'suspended' || userData.status === 'deleted') {
      return res.status(400).json({ success: false, error: 'Cannot impersonate suspended or deleted user' });
    }
    // Create custom token with admin impersonation claim
    const customToken = await admin.auth().createCustomToken(id, { impersonatedBy: req.user?.email || 'admin', isAdminImpersonation: true });
    logAudit('user_impersonated', 'Admin ' + (req.user?.email || 'unknown') + ' impersonated user ' + id, req);
    res.json({ success: true, data: { customToken, uid: id } });
  } catch (error) {
    logger.error('Error creating impersonation token:', error);
    res.status(500).json({ success: false, error: 'Failed to create impersonation token' });
  }
});

// POST /api/admin/users/:id/notify — Send notification to user
app.post('/api/admin/users/:id/notify', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { title, body, data, type = 'admin' } = req.body || {};
    if (!title || !body) return res.status(400).json({ success: false, error: 'Title and body required' });
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const notification = {
      userId: id, title, body, data: data || {}, type,
      read: false, createdAt: new Date().toISOString(), sentBy: req.user?.email || 'admin'
    };
    await db.collection('notifications').add(notification);
    logAudit('user_notified', 'Admin notification sent to user ' + id + ': ' + title, req);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// ─── Admin product catalog (CRUD) ────────────────────────────────
app.get('/api/admin/products', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { category, sellerId, limit = 100, page = 1 } = req.query;
    let q = db.collection('products');
    if (category && category !== 'all') q = q.where('category', '==', category);
    if (sellerId) q = q.where('merchantId', '==', sellerId);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await q.offset(offset).limit(limitNum).get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: products, count: products.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.get('/api/admin/products/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

app.post('/api/admin/products', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, description, price, category, imageUrl, stock, unit, merchantId } = req.body || {};
    if (!name || !price) return res.status(400).json({ success: false, error: 'Name and price required' });
    const product = {
      name, description: description || '', price: parseFloat(price),
      category: category || 'general', imageUrl: imageUrl || '',
      stock: stock != null ? parseInt(stock, 10) : 0, unit: unit || 'piece',
      merchantId: merchantId || 'admin', isAvailable: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const ref = await db.collection('products').add(product);
    invalidateCache('/api/admin/products*');
    res.json({ success: true, data: { id: ref.id, ...product }, message: 'Product created' });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Product not found' });
    const { name, description, price, category, imageUrl, stock, unit, isAvailable } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = parseFloat(price);
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (stock !== undefined) updates.stock = parseInt(stock, 10);
    if (unit !== undefined) updates.unit = unit;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    await db.collection('products').doc(req.params.id).update(updates);
    invalidateCache('/api/admin/products*');
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('products').doc(req.params.id).delete();
    invalidateCache('/api/admin/products*');
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// ─── Admin categories ────────────────────────────────────────────
app.get('/api/admin/categories', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('categories').get();
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: cats, count: cats.length });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.json({ success: true, data: [] });
  }
});

app.post('/api/admin/categories', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, icon, imageUrl } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    const cat = { name, icon: icon || '', imageUrl: imageUrl || '', createdAt: new Date().toISOString() };
    const ref = await db.collection('categories').add(cat);
    res.json({ success: true, data: { id: ref.id, ...cat }, message: 'Category created' });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

app.delete('/api/admin/categories/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('categories').doc(req.params.id).delete();
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// ─── Admin transactions / payment ledger ─────────────────────────
app.get('/api/admin/transactions', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { type, status, limit = 100, page = 1 } = req.query;
    let q = db.collection('transactions');
    if (type && type !== 'all') q = q.where('type', '==', type);
    if (status && status !== 'all') q = q.where('status', '==', status);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await q.orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: txs, count: txs.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

// ─── Admin seller verification ───────────────────────────────────
app.get('/api/admin/sellers/pending', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('sellers').where('is_verified', '==', false).get();
    const sellers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: sellers, count: sellers.length });
  } catch (error) {
    logger.error('Error fetching pending sellers:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.put('/api/admin/sellers/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { action, notes } = req.body || {};
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    const doc = await db.collection('sellers').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Seller not found' });
    const updates = { updatedAt: new Date().toISOString(), verifiedBy: req.user?.email || 'admin', verificationNotes: notes || '' };
    if (action === 'approve') { updates.is_verified = true; updates.is_open = true; }
    else { updates.is_verified = false; updates.is_open = false; }
    await db.collection('sellers').doc(id).update(updates);
    logAudit('seller_' + action, 'Seller ' + id + ' ' + action + 'd', req);
    invalidateCache('/api/admin/sellers*');
    res.json({ success: true, message: 'Seller ' + action + 'd', action: action });
  } catch (error) {
    logger.error('Error verifying seller:', error);
    res.status(500).json({ success: false, error: 'Failed to verify seller' });
  }
});

// ─── Admin commission rates ──────────────────────────────────────
app.get('/api/admin/commissions', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('commissions').get();
    const commissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: commissions, count: commissions.length });
  } catch (error) {
    logger.error('Error fetching commissions:', error);
    res.json({ success: true, data: [] });
  }
});

app.put('/api/admin/commissions/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const { rate } = req.body || {};
    if (rate === undefined || isNaN(parseFloat(rate))) return res.status(400).json({ success: false, error: 'Valid rate required' });
    await db.collection('commissions').doc(id).update({ rate: parseFloat(rate), updatedAt: new Date().toISOString(), updatedBy: req.user?.email || 'admin' });
    logAudit('commission_updated', 'Commission ' + id + ' rate set to ' + rate + '%', req);
    res.json({ success: true, message: 'Commission updated' });
  } catch (error) {
    logger.error('Error updating commission:', error);
    res.status(500).json({ success: false, error: 'Failed to update commission' });
  }
});

app.post('/api/admin/commissions', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, type, rate, applyTo } = req.body || {};
    if (!name || rate === undefined) return res.status(400).json({ success: false, error: 'Name and rate required' });
    const commission = { name, type: type || 'percentage', rate: parseFloat(rate), applyTo: applyTo || 'all', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('commissions').add(commission);
    res.json({ success: true, data: { id: ref.id, ...commission }, message: 'Commission created' });
  } catch (error) {
    logger.error('Error creating commission:', error);
    res.status(500).json({ success: false, error: 'Failed to create commission' });
  }
});

app.delete('/api/admin/commissions/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('commissions').doc(req.params.id).delete();
    res.json({ success: true, message: 'Commission deleted' });
  } catch (error) {
    logger.error('Error deleting commission:', error);
    res.status(500).json({ success: false, error: 'Failed to delete commission' });
  }
});

// ─── Admin review moderation ─────────────────────────────────────
app.get('/api/admin/reviews', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { status: rStatus, limit = 100, page = 1 } = req.query;
    let q = db.collection('reviews');
    if (rStatus && rStatus !== 'all') q = q.where('moderated', '==', rStatus === 'approved');
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await q.orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: reviews, count: reviews.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.put('/api/admin/reviews/:id/moderate', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { action } = req.body || {};
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    await db.collection('reviews').doc(req.params.id).update({
      moderated: action === 'approve', moderatedAt: new Date().toISOString(),
      moderatedBy: req.user?.email || 'admin'
    });
    logAudit('review_' + action, 'Review ' + req.params.id + ' ' + action + 'd', req);
    res.json({ success: true, message: 'Review ' + action + 'd' });
  } catch (error) {
    logger.error('Error moderating review:', error);
    res.status(500).json({ success: false, error: 'Failed to moderate review' });
  }
});

// ─── Admin CMS (content management) ──────────────────────────────
app.get('/api/admin/cms', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { type } = req.query;
    let q = db.collection('cms_content');
    if (type) q = q.where('type', '==', type);
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    logger.error('Error fetching CMS:', error);
    res.json({ success: true, data: [] });
  }
});

app.post('/api/admin/cms', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { type, key, title, content, imageUrl, sortOrder } = req.body || {};
    if (!type || !key) return res.status(400).json({ success: false, error: 'Type and key required' });
    const item = { type, key, title: title || '', content: content || '', imageUrl: imageUrl || '', sortOrder: sortOrder || 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('cms_content').add(item);
    res.json({ success: true, data: { id: ref.id, ...item }, message: 'Content created' });
  } catch (error) {
    logger.error('Error creating CMS:', error);
    res.status(500).json({ success: false, error: 'Failed to create content' });
  }
});

app.put('/api/admin/cms/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { title, content, imageUrl, sortOrder, isActive } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (isActive !== undefined) updates.isActive = isActive;
    await db.collection('cms_content').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Content updated' });
  } catch (error) {
    logger.error('Error updating CMS:', error);
    res.status(500).json({ success: false, error: 'Failed to update content' });
  }
});

app.delete('/api/admin/cms/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('cms_content').doc(req.params.id).delete();
    res.json({ success: true, message: 'Content deleted' });
  } catch (error) {
    logger.error('Error deleting CMS:', error);
    res.status(500).json({ success: false, error: 'Failed to delete content' });
  }
});

// ─── Admin support tickets ───────────────────────────────────────
app.get('/api/admin/tickets', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { status, priority, limit = 100, page = 1 } = req.query;
    let q = db.collection('support_tickets');
    if (status && status !== 'all') q = q.where('status', '==', status);
    if (priority && priority !== 'all') q = q.where('priority', '==', priority);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await q.orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: tickets, count: tickets.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching tickets:', error);
    res.json({ success: true, data: [], count: 0 });
  }
});

app.post('/api/admin/tickets', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { subject, description, customerName, customerEmail, priority } = req.body || {};
    if (!subject || !description) return res.status(400).json({ success: false, error: 'Subject and description required' });
    const ticket = {
      subject, description, customerName: customerName || '', customerEmail: customerEmail || '',
      priority: priority || 'medium', status: 'open',
      assignedTo: '', createdBy: req.user?.email || 'admin',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const ref = await db.collection('support_tickets').add(ticket);
    res.json({ success: true, data: { id: ref.id, ...ticket }, message: 'Ticket created' });
  } catch (error) {
    logger.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

app.put('/api/admin/tickets/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { status, assignedTo, response } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (assignedTo) updates.assignedTo = assignedTo;
    if (response) {
      updates.response = response;
      updates.respondedAt = new Date().toISOString();
      updates.respondedBy = req.user?.email || 'admin';
    }
    await db.collection('support_tickets').doc(req.params.id).update(updates);
    logAudit('ticket_updated', 'Ticket ' + req.params.id + ' — status: ' + (status || 'no change'), req);
    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

// ─── Enhanced Order Management ──────────────────────────────────
// GET /api/admin/orders/:id/timeline — Order timeline
app.get('/api/admin/orders/:id/timeline', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('order_events').where('orderId', '==', req.params.id).orderBy('timestamp', 'asc').get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: events });
  } catch (error) {
    logger.error('Error fetching order timeline:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/orders/:id/note — Add internal note to order
app.post('/api/admin/orders/:id/note', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { note } = req.body || {};
    if (!note) return res.status(400).json({ success: false, error: 'Note required' });
    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const existingNotes = orderDoc.data().internalNotes || [];
    existingNotes.push({ note, addedBy: req.user?.email || 'admin', timestamp: new Date().toISOString() });
    await db.collection('orders').doc(req.params.id).update({ internalNotes: existingNotes, updatedAt: new Date().toISOString() });
    await db.collection('order_events').add({ orderId: req.params.id, type: 'note_added', detail: note, actor: req.user?.email || 'admin', timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Note added' });
  } catch (error) {
    logger.error('Error adding order note:', error);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

// POST /api/admin/orders/:id/refund — Process refund
app.post('/api/admin/orders/:id/refund', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { amount, reason } = req.body || {};
    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = orderDoc.data();
    const refundAmount = amount || order.totalAmount || 0;
    const refunds = order.refunds || [];
    refunds.push({ amount: refundAmount, reason: reason || '', processedBy: req.user?.email || 'admin', processedAt: new Date().toISOString() });
    await db.collection('orders').doc(req.params.id).update({ refunds, status: refundAmount >= (order.totalAmount || 0) ? 'refunded' : 'partially_refunded', updatedAt: new Date().toISOString() });
    await db.collection('order_events').add({ orderId: req.params.id, type: 'refund_processed', detail: 'TSh ' + refundAmount + ' refunded: ' + (reason || 'no reason'), actor: req.user?.email || 'admin', timestamp: new Date().toISOString() });
    logAudit('order_refunded', 'Order ' + req.params.id + ' refunded TSh ' + refundAmount, req);
    res.json({ success: true, message: 'Refund processed for TSh ' + refundAmount });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});

// POST /api/admin/orders/bulk-status — Bulk update order status
app.post('/api/admin/orders/bulk-status', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { orderIds, status } = req.body || {};
    if (!Array.isArray(orderIds) || !orderIds.length) return res.status(400).json({ success: false, error: 'No orders selected' });
    if (!status) return res.status(400).json({ success: false, error: 'Status required' });
    const batch = db.batch();
    const timestamp = new Date().toISOString();
    for (const oid of orderIds) {
      batch.update(db.collection('orders').doc(oid), { status, updatedAt: timestamp, updatedBy: req.user?.email || 'admin' });
      await db.collection('order_events').add({ orderId: oid, type: 'status_changed', detail: 'Status changed to ' + status, actor: req.user?.email || 'admin', timestamp });
    }
    await batch.commit();
    res.json({ success: true, message: orderIds.length + ' orders updated to ' + status });
  } catch (error) {
    logger.error('Error bulk updating orders:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update orders' });
  }
});

// ─── Enhanced Product Catalog ───────────────────────────────────
// GET /api/admin/products/:id/variants — Product variants
app.get('/api/admin/products/:id/variants', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('product_variants').where('productId', '==', req.params.id).get();
    const variants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: variants });
  } catch (error) {
    logger.error('Error fetching variants:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/products/variants — Create variant
app.post('/api/admin/products/variants', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { productId, name, price, stock, sku, attributes } = req.body || {};
    if (!productId || !name || price === undefined) return res.status(400).json({ success: false, error: 'productId, name, price required' });
    const variant = { productId, name, price: parseFloat(price), stock: parseInt(stock) || 0, sku: sku || '', attributes: attributes || {}, createdAt: new Date().toISOString() };
    const ref = await db.collection('product_variants').add(variant);
    res.json({ success: true, data: { id: ref.id, ...variant }, message: 'Variant created' });
  } catch (error) {
    logger.error('Error creating variant:', error);
    res.status(500).json({ success: false, error: 'Failed to create variant' });
  }
});

// PUT /api/admin/products/variants/:id — Update variant
app.put('/api/admin/products/variants/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, price, stock, sku, attributes } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = parseFloat(price);
    if (stock !== undefined) updates.stock = parseInt(stock);
    if (sku !== undefined) updates.sku = sku;
    if (attributes !== undefined) updates.attributes = attributes;
    await db.collection('product_variants').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Variant updated' });
  } catch (error) {
    logger.error('Error updating variant:', error);
    res.status(500).json({ success: false, error: 'Failed to update variant' });
  }
});

// DELETE /api/admin/products/variants/:id
app.delete('/api/admin/products/variants/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('product_variants').doc(req.params.id).delete();
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) {
    logger.error('Error deleting variant:', error);
    res.status(500).json({ success: false, error: 'Failed to delete variant' });
  }
});

// GET /api/admin/inventory/alerts — Low stock alerts
app.get('/api/admin/inventory/alerts', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { threshold = 10 } = req.query;
    const thresholdNum = parseInt(threshold, 10) || 10;
    const [productsSnap, variantsSnap] = await Promise.all([
      db.collection('products').where('stock', '<', thresholdNum).get(),
      db.collection('product_variants').where('stock', '<', thresholdNum).get()
    ]);
    const lowStockProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const lowStockVariants = variantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { products: lowStockProducts, variants: lowStockVariants, count: lowStockProducts.length + lowStockVariants.length } });
  } catch (error) {
    logger.error('Error fetching inventory alerts:', error);
    res.json({ success: true, data: { products: [], variants: [], count: 0 } });
  }
});

// PUT /api/admin/inventory/restock — Bulk restock
app.put('/api/admin/inventory/restock', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { items } = req.body || [];
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, error: 'Items required' });
    const batch = db.batch();
    for (const item of items) {
      if (item.type === 'product') {
        batch.update(db.collection('products').doc(item.id), { stock: admin.firestore.FieldValue.increment(item.quantity || 0), updatedAt: new Date().toISOString() });
      } else if (item.type === 'variant') {
        batch.update(db.collection('product_variants').doc(item.id), { stock: admin.firestore.FieldValue.increment(item.quantity || 0) });
      }
    }
    await batch.commit();
    res.json({ success: true, message: items.length + ' items restocked' });
  } catch (error) {
    logger.error('Error restocking:', error);
    res.status(500).json({ success: false, error: 'Failed to restock' });
  }
});

// POST /api/admin/products/bulk-import — Bulk import products
app.post('/api/admin/products/bulk-import', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { products } = req.body || [];
    if (!Array.isArray(products) || !products.length) return res.status(400).json({ success: false, error: 'Products array required' });
    const batch = db.batch();
    const timestamp = new Date().toISOString();
    const results = [];
    for (const p of products) {
      const product = { name: p.name || 'Unnamed', price: parseFloat(p.price) || 0, description: p.description || '', category: p.category || 'general', stock: parseInt(p.stock) || 0, unit: p.unit || 'piece', imageUrl: p.imageUrl || '', isAvailable: true, createdAt: timestamp, updatedAt: timestamp };
      const ref = db.collection('products').doc();
      batch.set(ref, product);
      results.push({ id: ref.id, name: product.name });
    }
    await batch.commit();
    res.json({ success: true, message: results.length + ' products imported', data: results });
  } catch (error) {
    logger.error('Error bulk importing:', error);
    res.status(500).json({ success: false, error: 'Failed to import products' });
  }
});

// GET /api/admin/products/export — Export products to CSV
app.get('/api/admin/products/export', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { category } = req.query;
    let q = db.collection('products');
    if (category && category !== 'all') q = q.where('category', '==', category);
    const snap = await q.limit(5000).get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Unit', 'Description', 'Image URL', 'Created'];
    const rows = products.map(p => [p.id, p.name || '', p.category || '', p.price || 0, p.stock || 0, p.unit || '', p.description || '', p.imageUrl || '', p.createdAt ? new Date(p.createdAt).toLocaleString() : '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-export-' + new Date().toISOString().slice(0, 10) + '.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting products:', error);
    res.status(500).json({ success: false, error: 'Failed to export products' });
  }
});

// ─── Enhanced Seller Tools ───────────────────────────────────────
// GET /api/admin/sellers/:id/kyc — Seller KYC documents
app.get('/api/admin/sellers/:id/kyc', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('seller_kyc').where('sellerId', '==', req.params.id).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: docs });
  } catch (error) {
    logger.error('Error fetching KYC:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/sellers/:id/kyc/verify — Verify KYC document
app.post('/api/admin/sellers/:id/kyc/verify', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { docId, status, notes } = req.body || {};
    if (!docId) return res.status(400).json({ success: false, error: 'docId required' });
    const updates = { status: status || 'verified', reviewedBy: req.user?.email || 'admin', reviewedAt: new Date().toISOString() };
    if (notes) updates.notes = notes;
    await db.collection('seller_kyc').doc(docId).update(updates);
    logAudit('kyc_verified', 'KYC ' + docId + ' for seller ' + req.params.id + ' set to ' + (status || 'verified'), req);
    res.json({ success: true, message: 'KYC document ' + (status || 'verified') });
  } catch (error) {
    logger.error('Error verifying KYC:', error);
    res.status(500).json({ success: false, error: 'Failed to verify KYC' });
  }
});

// GET /api/admin/commission/rules — Commission rules
app.get('/api/admin/commission/rules', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('commission_rules').get();
    const rules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Error fetching commission rules:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/commission/rules — Create commission rule
app.post('/api/admin/commission/rules', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, category, rate, type = 'percentage', minAmount, maxAmount } = req.body || {};
    if (!name || rate === undefined) return res.status(400).json({ success: false, error: 'Name and rate required' });
    const rule = { name, category: category || 'all', rate: parseFloat(rate), type, minAmount: minAmount ? parseFloat(minAmount) : 0, maxAmount: maxAmount ? parseFloat(maxAmount) : 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('commission_rules').add(rule);
    res.json({ success: true, data: { id: ref.id, ...rule }, message: 'Commission rule created' });
  } catch (error) {
    logger.error('Error creating commission rule:', error);
    res.status(500).json({ success: false, error: 'Failed to create commission rule' });
  }
});

// PUT /api/admin/commission/rules/:id — Update commission rule
app.put('/api/admin/commission/rules/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, category, rate, type, minAmount, maxAmount, isActive } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (rate !== undefined) updates.rate = parseFloat(rate);
    if (type !== undefined) updates.type = type;
    if (minAmount !== undefined) updates.minAmount = parseFloat(minAmount);
    if (maxAmount !== undefined) updates.maxAmount = parseFloat(maxAmount);
    if (isActive !== undefined) updates.isActive = isActive;
    await db.collection('commission_rules').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Commission rule updated' });
  } catch (error) {
    logger.error('Error updating commission rule:', error);
    res.status(500).json({ success: false, error: 'Failed to update commission rule' });
  }
});

// DELETE /api/admin/commission/rules/:id
app.delete('/api/admin/commission/rules/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('commission_rules').doc(req.params.id).delete();
    res.json({ success: true, message: 'Commission rule deleted' });
  } catch (error) {
    logger.error('Error deleting commission rule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete commission rule' });
  }
});

// GET /api/admin/payouts — Payout schedule/history
app.get('/api/admin/payouts', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { status, limit = 100, page = 1 } = req.query;
    let q = db.collection('payouts');
    if (status && status !== 'all') q = q.where('status', '==', status);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;
    const snap = await q.orderBy('createdAt', 'desc').offset(offset).limit(limitNum).get();
    const payouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Get total stats
    const totalSnap = await db.collection('payouts').get();
    const totalPending = totalSnap.docs.filter(d => d.data().status === 'pending').reduce((s, d) => s + (d.data().amount || 0), 0);
    const totalPaid = totalSnap.docs.filter(d => d.data().status === 'paid').reduce((s, d) => s + (d.data().amount || 0), 0);
    res.json({ success: true, data: payouts, totalPending, totalPaid, count: payouts.length, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching payouts:', error);
    res.json({ success: true, data: [], totalPending: 0, totalPaid: 0, count: 0 });
  }
});

// POST /api/admin/payouts — Create payout
app.post('/api/admin/payouts', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { sellerId, amount, notes } = req.body || {};
    if (!sellerId || !amount) return res.status(400).json({ success: false, error: 'sellerId and amount required' });
    const payout = { sellerId, amount: parseFloat(amount), notes: notes || '', status: 'pending', createdBy: req.user?.email || 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('payouts').add(payout);
    logAudit('payout_created', 'Payout ' + ref.id + ' for seller ' + sellerId + ' amount TSh ' + amount, req);
    res.json({ success: true, data: { id: ref.id, ...payout }, message: 'Payout created' });
  } catch (error) {
    logger.error('Error creating payout:', error);
    res.status(500).json({ success: false, error: 'Failed to create payout' });
  }
});

// PUT /api/admin/payouts/:id — Update payout status (mark as paid)
app.put('/api/admin/payouts/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { status, transactionRef } = req.body || {};
    const updates = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (transactionRef) updates.transactionRef = transactionRef;
    if (status === 'paid') { updates.paidAt = new Date().toISOString(); updates.paidBy = req.user?.email || 'admin'; }
    await db.collection('payouts').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Payout updated to ' + status });
  } catch (error) {
    logger.error('Error updating payout:', error);
    res.status(500).json({ success: false, error: 'Failed to update payout' });
  }
});

// GET /api/admin/sellers/:id/analytics — Seller analytics dashboard
app.get('/api/admin/sellers/:id/analytics', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { id } = req.params;
    const [ordersSnap, productsSnap] = await Promise.all([
      db.collection('orders').where('merchantId', '==', id).get(),
      db.collection('products').where('merchantId', '==', id).get()
    ]);
    const orders = ordersSnap.docs.map(d => d.data());
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const totalProducts = productsSnap.size;
    res.json({
      success: true,
      data: { totalRevenue, totalOrders, avgOrderValue, pendingOrders, deliveredOrders, cancelledOrders, totalProducts }
    });
  } catch (error) {
    logger.error('Error fetching seller analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/sellers/analytics — All sellers aggregated analytics
app.get('/api/admin/sellers/analytics', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const [sellersSnap, ordersSnap] = await Promise.all([
      db.collection('sellers').get(),
      db.collection('orders').get()
    ]);
    const totalSellers = sellersSnap.size;
    const pendingVerification = sellersSnap.docs.filter(d => d.data().verificationStatus === 'pending').length;
    const orders = ordersSnap.docs.map(d => d.data());
    const totalSellerRevenue = orders.reduce((s, o) => s + ((o.merchantShare || o.totalAmount || 0)), 0);
    const totalCommission = orders.reduce((s, o) => s + ((o.commission || 0)), 0);
    const activeSellers = new Set(orders.map(o => o.merchantId).filter(Boolean)).size;
    res.json({
      success: true,
      data: { totalSellers, pendingVerification, activeSellers, totalSellerRevenue, totalCommission }
    });
  } catch (error) {
    logger.error('Error fetching seller analytics:', error);
    res.json({ success: true, data: { totalSellers: 0, pendingVerification: 0, activeSellers: 0, totalSellerRevenue: 0, totalCommission: 0 } });
  }
});

// ─── Analytics & Reports ─────────────────────────────────────────
// GET /api/admin/analytics/revenue — Revenue report
app.get('/api/admin/analytics/revenue', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const snap = await db.collection('orders').get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;
    const filtered = orders.filter(o => o.createdAt && new Date(o.createdAt) >= start && new Date(o.createdAt) <= end);
    const totalRevenue = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalCommission = filtered.reduce((s, o) => s + (o.commission || 0), 0);
    const totalOrders = filtered.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    // Group by day
    const dailyMap = {};
    filtered.forEach(o => {
      const day = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : 'unknown';
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0, commission: 0 };
      dailyMap[day].revenue += o.totalAmount || 0;
      dailyMap[day].orders += 1;
      dailyMap[day].commission += o.commission || 0;
    });
    const daily = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
    res.json({
      success: true,
      data: { totalRevenue, totalCommission, totalOrders, avgOrderValue, daily, period, startDate: start.toISOString(), endDate: end.toISOString() }
    });
  } catch (error) {
    logger.error('Error fetching revenue report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue report' });
  }
});

// GET /api/admin/analytics/export — Export analytics to CSV
app.get('/api/admin/analytics/export', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { reportType = 'revenue', startDate, endDate } = req.query;
    const snap = await db.collection('orders').get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    const filtered = orders.filter(o => o.createdAt && new Date(o.createdAt) >= start && new Date(o.createdAt) <= end);
    let csv = '';
    if (reportType === 'revenue') {
      const headers = ['Date', 'Order ID', 'Customer', 'Total', 'Commission', 'Status', 'Items'];
      const rows = filtered.map(o => [o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '', o.id || '', o.customerName || o.customerEmail || '', o.totalAmount || 0, o.commission || 0, o.status || '', Array.isArray(o.items) ? o.items.length : 0]);
      csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
    } else {
      csv = 'Report type not supported\n';
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-' + reportType + '-' + new Date().toISOString().slice(0, 10) + '.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to export analytics' });
  }
});

// GET /api/admin/analytics/top-sellers — Top sellers by revenue
app.get('/api/admin/analytics/top-sellers', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { limit = 10 } = req.query;
    const snap = await db.collection('orders').get();
    const orders = snap.docs.map(d => d.data());
    const sellerMap = {};
    for (const o of orders) {
      const mid = o.merchantId;
      if (!mid) continue;
      if (!sellerMap[mid]) sellerMap[mid] = { revenue: 0, orders: 0, name: o.merchantName || mid };
      sellerMap[mid].revenue += o.totalAmount || 0;
      sellerMap[mid].orders += 1;
    }
    const topSellers = Object.entries(sellerMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, parseInt(limit) || 10);
    res.json({ success: true, data: topSellers });
  } catch (error) {
    logger.error('Error fetching top sellers:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/analytics/report/schedule — Schedule recurring report
app.post('/api/admin/analytics/report/schedule', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { name, reportType, frequency, emails, format } = req.body || {};
    if (!name || !reportType || !frequency) return res.status(400).json({ success: false, error: 'name, reportType, frequency required' });
    const schedule = { name, reportType, frequency, emails: emails || [], format: format || 'csv', isActive: true, createdBy: req.user?.email || 'admin', createdAt: new Date().toISOString() };
    const ref = await db.collection('report_schedules').add(schedule);
    res.json({ success: true, data: { id: ref.id, ...schedule }, message: 'Report schedule created' });
  } catch (error) {
    logger.error('Error creating report schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to create schedule' });
  }
});

// ─── Enhanced Support Tickets ────────────────────────────────────
// GET /api/admin/tickets/sla — SLA metrics
app.get('/api/admin/tickets/sla', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('support_tickets').get();
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const now = Date.now();
    // Tickets breaching 24h SLA
    const breached = tickets.filter(t => (t.status === 'open' || t.status === 'in_progress') && t.createdAt && (now - new Date(t.createdAt).getTime()) > 24 * 60 * 60 * 1000).length;
    const avgResolutionTime = tickets.filter(t => t.resolvedAt).reduce((s, t) => s + (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()), 0) / (resolved || 1);
    const avgHours = Math.round(avgResolutionTime / (1000 * 60 * 60));
    res.json({ success: true, data: { total, open, inProgress, resolved, breached, avgResolutionHours: avgHours } });
  } catch (error) {
    logger.error('Error fetching SLA:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SLA data' });
  }
});

// POST /api/admin/tickets/:id/assign — Assign ticket to admin
app.post('/api/admin/tickets/:id/assign', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { assignedTo } = req.body || {};
    if (!assignedTo) return res.status(400).json({ success: false, error: 'assignedTo required' });
    await db.collection('support_tickets').doc(req.params.id).update({ assignedTo, status: 'in_progress', updatedAt: new Date().toISOString() });
    logAudit('ticket_assigned', 'Ticket ' + req.params.id + ' assigned to ' + assignedTo, req);
    res.json({ success: true, message: 'Ticket assigned to ' + assignedTo });
  } catch (error) {
    logger.error('Error assigning ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to assign ticket' });
  }
});

// GET /api/admin/tickets/canned-responses — Canned responses
app.get('/api/admin/tickets/canned-responses', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const snap = await db.collection('canned_responses').get();
    const responses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: responses });
  } catch (error) {
    logger.error('Error fetching canned responses:', error);
    res.json({ success: true, data: [] });
  }
});

// POST /api/admin/tickets/canned-responses — Create canned response
app.post('/api/admin/tickets/canned-responses', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { title, body, category } = req.body || {};
    if (!title || !body) return res.status(400).json({ success: false, error: 'Title and body required' });
    const response = { title, body, category: category || 'general', createdBy: req.user?.email || 'admin', createdAt: new Date().toISOString() };
    const ref = await db.collection('canned_responses').add(response);
    res.json({ success: true, data: { id: ref.id, ...response }, message: 'Canned response created' });
  } catch (error) {
    logger.error('Error creating canned response:', error);
    res.status(500).json({ success: false, error: 'Failed to create canned response' });
  }
});

// DELETE /api/admin/tickets/canned-responses/:id
app.delete('/api/admin/tickets/canned-responses/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    await db.collection('canned_responses').doc(req.params.id).delete();
    res.json({ success: true, message: 'Canned response deleted' });
  } catch (error) {
    logger.error('Error deleting canned response:', error);
    res.status(500).json({ success: false, error: 'Failed to delete canned response' });
  }
});

// POST /api/admin/tickets/:id/internal-note — Add internal note to ticket
app.post('/api/admin/tickets/:id/internal-note', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { note } = req.body || {};
    if (!note) return res.status(400).json({ success: false, error: 'Note required' });
    const doc = await db.collection('support_tickets').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const existing = doc.data().internalNotes || [];
    existing.push({ note, addedBy: req.user?.email || 'admin', timestamp: new Date().toISOString() });
    await db.collection('support_tickets').doc(req.params.id).update({ internalNotes: existing, updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Internal note added' });
  } catch (error) {
    logger.error('Error adding internal note:', error);
    res.status(500).json({ success: false, error: 'Failed to add internal note' });
  }
});

// POST /api/admin/tickets/:id/respond — Respond to ticket with canned or custom response
app.post('/api/admin/tickets/:id/respond', verifyToken, requireRole('admin'), async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { response, cannedId } = req.body || {};
    if (!response && !cannedId) return res.status(400).json({ success: false, error: 'Response or cannedId required' });
    let body = response || '';
    if (cannedId) {
      const cannedDoc = await db.collection('canned_responses').doc(cannedId).get();
      if (cannedDoc.exists) body = cannedDoc.data().body || body;
    }
    const doc = await db.collection('support_tickets').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const existingResponses = doc.data().responses || [];
    existingResponses.push({ body, respondedBy: req.user?.email || 'admin', timestamp: new Date().toISOString() });
    await db.collection('support_tickets').doc(req.params.id).update({
      responses: existingResponses, status: 'in_progress',
      lastResponseAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Response added' });
  } catch (error) {
    logger.error('Error responding to ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to ticket' });
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
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handling middleware.
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// WebSocket connection handler
async function handleWebSocketConnection(ws, req) {
  try {
    // Extract token from query string (?token=), Sec-WebSocket-Protocol header, or Authorization header
    let token = '';
    const url = new URL(req.url, 'http://localhost');
    token = url.searchParams.get('token') || '';
    if (!token) {
      const protocols = req.headers['sec-websocket-protocol'] || '';
      if (protocols) {
        token = protocols.split(',').map(p => p.trim()).find(p => p.startsWith('token.')) || '';
        token = token.replace('token.', '');
      }
    }
    if (!token) {
      const authHeader = req.headers['authorization'] || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length).trim();
      }
    }
    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const user = await verifyFirebaseIdToken(token);

    if (!['admin', 'driver', 'merchant'].includes(user.role)) {
      ws.close(1008, 'Forbidden');
      return;
    }

    ws.user = user;
  } catch (error) {
    logger.error('WebSocket auth failed: ' + error.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }));
    }
    ws.close(1008, 'Unauthorized');
    return;
  }

  logger.info('Client connected via WebSocket (role: ' + (ws.user ? ws.user.role : 'unknown') + ')');
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

      if (data.type === 'subscribe_orders') {
        ws.orderSubscription = data.filters || {};
        logger.info('Client subscribed to order updates');
      }

      if (data.type === 'update_order_status') {
        if (!ws.user || ws.user.role !== 'admin') {
          ws.send(JSON.stringify({ type: 'error', error: 'Only admins can update order status' }));
          return;
        }
        broadcastToFleet({
          type: 'order_status_changed',
          data: { orderId: data.orderId, status: data.status, timestamp: new Date().toISOString() }
        });
      }
    } catch (error) {
      logger.error('WebSocket message error: ' + error.message);
    }
  });

  ws.on('close', () => {
    logger.info('Fleet manager disconnected');
  });
}

// Broadcast order status changes to all connected clients
function broadcastOrderStatus(orderId, status, details) {
  broadcastToFleet({
    type: 'order_status_changed',
    data: { orderId, status, timestamp: new Date().toISOString(), ...details }
  });
}

function startRealtimeServer() {
  server = http.createServer(app);
  wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', handleWebSocketConnection);
  startFirestoreListeners();

  // Seed audit entries on startup
  var startupReq = { user: { email: 'system@smartsoko.com', uid: 'system' }, ip: '127.0.0.1' };
  logAudit('server_start', 'Server started — environment: ' + NODE_ENV + ', node: ' + process.version, startupReq);
  logAudit('system_info', 'Firebase: ' + (db ? 'connected' : 'disconnected/supabase-only'), startupReq);

server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on port ${PORT}`);
    logger.info(`\n╔════════════════════════════════════════════════════════╗
║         SmartSoko - Production Server Ready            ║
╠═════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(37)} ║
║  Port: ${PORT.toString().padEnd(46)} ║
╠═════════════════════════════════════════════════════════╣
║  URLs:                                                 ║
║  - Login:     http://localhost:${PORT}/login             ║
║  - Home:      http://localhost:${PORT}/home             ║
║  - Customer: http://localhost:${PORT}/customer           ║
║  - Merchant: http://localhost:${PORT}/merchant           ║
║  - Driver:   http://localhost:${PORT}/driver             ║
║  - Admin:    http://localhost:${PORT}/admin              ║
║  - Fleet:    http://localhost:${PORT}/fleet-manager.html ║
╠═════════════════════════════════════════════════════════╣
║  API Endpoints:                                        ║
║  - Health:   http://localhost:${PORT}/health             ║
║  - Config:   http://localhost:${PORT}/api/config         ║
║  - Riders:   http://localhost:${PORT}/api/riders         ║
║  - WebSocket: ws://localhost:${PORT}/ws                  ║
╚═════════════════════════════════════════════════════════╝\n`);
  logger.info('✓ WebSocket server active - Real-time rider tracking enabled\n');
});
server.on('error', (err) => logger.error('Server listen error:', err));
  return server;
}

if (require.main === module) {
  startRealtimeServer();
}

module.exports.startRealtimeServer = startRealtimeServer;
