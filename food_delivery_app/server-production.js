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

// Sentry error tracking
const Sentry = require('@sentry/node');

// Initialize Winston logger FIRST
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

// Skip Sentry in development to avoid hanging on network issues
const SKIP_SENTRY = process.env.NODE_ENV !== 'production' || process.env.SKIP_SENTRY === 'true';

if (!SKIP_SENTRY) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    integrations: [
      Sentry.expressIntegration(),
      Sentry.nodeContextIntegration(),
      Sentry.localVariablesIntegration(),
      Sentry.linkedErrorsIntegration(),
    ],
    beforeSend(event, hint) {
      if (process.env.NODE_ENV !== 'production') return null;
      return event;
    }
  });
  logger.info('Sentry initialized');
} else {
  console.log('SKIP_SENTRY enabled - Sentry disabled');
}

// Firebase Admin SDK for real data
const admin = require('firebase-admin');
const { createDualDb } = require('./lib/server-db');

// ─── In-memory log ring buffer ───────────────────────────────────────
// ─── Audit log buffer ────────────────────────────────────────────────
const MAX_AUDIT_ENTRIES = 1000;
const auditBuffer = [];
function logAudit(action, details, req) {
  const entry = { timestamp: new Date().toISOString(), action: action, details: details || '', user: req && req.user ? (req.user.email || req.user.uid || 'unknown') : 'system', ip: req ? req.ip : '0.0.0.0', uid: req && req.user ? req.user.uid || null : null };
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_AUDIT_ENTRIES) auditBuffer.splice(0, auditBuffer.length - MAX_AUDIT_ENTRIES);
  logger.info('AUDIT: ' + action + (details ? ' — ' + details : ''), { user: entry.user, ip: entry.ip });
}

// Keep the server alive when background services (Firestore, Supabase, payment webhooks)
// fail asynchronously - log instead of crashing the process.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection (recovered):', { error: reason && reason.stack ? reason.stack : String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception (recovered):', { error: err && err.stack ? err.stack : String(err) });
});

// Initialize Firebase Admin with service account
let db;

// Skip Firebase in development mode to avoid hanging on network issues
const SKIP_FIREBASE = process.env.NODE_ENV !== 'production' || process.env.SKIP_FIREBASE === 'true';

if (SKIP_FIREBASE) {
  logger.info('SKIP_FIREBASE enabled - Running in Supabase-only mode');
  db = createDualDb(null);
} else {
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
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Make db / config / admin available to route modules (they call req.app.get('db'))
app.set('db', makeRouteDb(db));
app.set('config', { deliveryFee: 2000, taxRate: 0.18, currency: 'TZS' });
app.set('admin', admin);

// Trust proxy for accurate client IP behind reverse proxy
app.set('trust proxy', 1);

// Request ID middleware for distributed tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 
           `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// API versioning - prefix all API routes with /api/v1
const API_VERSION = 'v1';
const apiRouter = express.Router();
app.use(`/api/${API_VERSION}`, apiRouter);

// Override app.get/post/etc to use versioned router for new routes
// Legacy routes without version still work via direct app.use below

// SSL redirect in production (behind reverse proxy)
if (NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.headers['x-forwarded-ssl'] !== 'on') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

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

// Permissions Policy
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=(self "https://pay.pesapal.com"), usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
  );
  next();
});

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

// Tiered rate limiting - use library's default keyGenerator (handles IPv6 correctly)
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs, max, message,
  standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Strict: Auth endpoints (5 req/min per IP)
const authLimiter = createLimiter(60 * 1000, 5, 'Too many auth attempts, please try again later.');
// Standard: General API (200 req/15min per IP)
const apiLimiter = createLimiter(15 * 60 * 1000, 200, 'Too many requests, please try again later.');
// Lenient: Read-only/public endpoints (1000 req/15min per IP)
const publicLimiter = createLimiter(15 * 60 * 1000, 1000, 'Too many requests.');

// Apply tiered limiters
app.use('/api/v1/auth/', authLimiter);
app.use('/api/v1/', apiLimiter);
// Health/check endpoints - no strict limit
app.use('/health', publicLimiter);
app.use('/api/health', publicLimiter);
app.use('/api/status', publicLimiter);
app.use('/api/config', publicLimiter);

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
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// Health endpoint (no auth, high rate limit) - MUST come before extensionless HTML routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: NODE_ENV,
    firebase: db ? 'connected' : 'supabase-only'
  });
});

// Extensionless HTML routes (e.g. /login, /home, /merchant -> public/<name>.html).
// Must come before API routes so /api/* paths are never treated as pages.
const PUBLIC_DIR = path.join(__dirname, 'public');
const PUBLIC_ROUTES = ['login', 'home', 'customer', 'merchant', 'driver', 'admin', 'admin-panel',
  'discovery', 'profile', 'cart', 'orders', 'product', 'restaurant', 'chat', 'track-order',
  'checkout', 'wallet', 'store', 'signup', 'main', 'seller', 'index', 'onboarding',
  'check-user', 'fleet-manager', 'supabase', 'seed-merchant', 'smartsoko-home',
  'smartsoko-products', 'smartsoko-vendor', 'smartsoko-cart', 'smartsoko-checkout', 'referral', '404'];
app.get('/', (req, res) => {
  const indexFile = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(fs.existsSync(indexFile) ? indexFile : path.join(PUBLIC_DIR, 'main.html'));
});
// Legacy /dashboard shortcut (previously mapped to merchant.html by public/server.js)
app.get('/dashboard', (req, res) => res.redirect('/merchant'));
for (const route of PUBLIC_ROUTES) {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(PUBLIC_DIR, `${route}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });
}

// API config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    firebase: !!db,
    mapbox: !!process.env.MAPBOX_TOKEN,
    pesapal: !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
    sentry: !!process.env.SENTRY_DSN
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// ════════════════════════════════════════════════════════════════
// ROUTE MODULES
// ════════════════════════════════════════════════════════════════

// Auth routes (defined inline below)
app.use('/api/v1/auth', (req, res, next) => next());

// Helper to safely load optional route modules
function loadRoute(name) {
  try {
    const routePath = path.join(__dirname, 'server', 'src', 'routes', name);
    return require(routePath);
  } catch (e) {
    return (req, res) => res.status(501).json({ error: name + ' route not implemented' });
  }
}

// Route modules export a function `xRoutes(app)` that registers routes on the
// passed app (see server/src/routes/index.js). Mount such a module correctly.
function mountRouteModule(name) {
  const mod = loadRoute(name);
  if (typeof mod === 'function') { mod(app); return; }
  if (mod && typeof mod === 'object') {
    const keys = Object.keys(mod).filter(k => typeof mod[k] === 'function');
    const named = keys.find(k => k.toLowerCase().includes(name.toLowerCase())) || keys[0];
    if (named) mod[named](app);
  }
}

// The route modules expect a flat db interface (db.add(collection, data),
// db.get(collection, id), db.where(collection, field, op, value), db.update,
// db.delete). Adapt the createDualDb proxy (which uses .collection(name).add())
// to that interface.
function makeRouteDb(proxy) {
  if (!proxy) return null;
  return {
    add: (collection, data) => proxy.collection(collection).add(data),
    get: async (collection, id) => {
      const snap = await proxy.collection(collection).doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },
    where: async (collection, field, op, value) => {
      const snap = await proxy.collection(collection).where(field, op, value).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    update: (collection, id, data) => proxy.collection(collection).doc(id).update(data),
    delete: (collection, id) => proxy.collection(collection).doc(id).delete(),
    getAll: async (collection) => {
      const snap = await proxy.collection(collection).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  };
}

// Shop routes
const shopRoutes = loadRoute('shops');
app.use('/api/shops', shopRoutes);
app.use('/api/v1/shops', shopRoutes);

// Order routes (module exports orderRoutes(app) which registers /api/orders & /api/v1/orders)
mountRouteModule('orders');

// Rider routes
const riderRoutes = loadRoute('driver');
app.use('/api/riders', riderRoutes);
app.use('/api/v1/riders', riderRoutes);

// Payment routes
const paymentRoutes = express.Router();
let pesapalRouter;
try {
  pesapalRouter = require('./api/pesapal');
} catch (e) {
  pesapalRouter = (req, res) => res.status(503).json({ error: 'payments route not implemented' });
}
paymentRoutes.use('/pesapal', pesapalRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Wallet routes
const walletRoutes = loadRoute('wallet');
app.use('/api/wallet', walletRoutes);
app.use('/api/v1/wallet', walletRoutes);

// Disbursement routes
const disbursementRoutes = loadRoute('disbursements');
app.use('/api/disbursements', disbursementRoutes);
app.use('/api/v1/disbursements', disbursementRoutes);

// Analytics routes
const analyticsRoutes = loadRoute('analytics');
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Webhook routes
const webhookRoutes = loadRoute('webhooks');
app.use('/api/webhooks', webhookRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Search routes
const searchRoutes = loadRoute('search');
app.use('/api/search', searchRoutes);
app.use('/api/v1/search', searchRoutes);

// Recommendation routes
const recommendationRoutes = loadRoute('recommendations');
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Notification routes
const notificationRoutes = loadRoute('notifications');
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Feedback routes
const feedbackRoutes = loadRoute('feedback');
app.use('/api/feedback', feedbackRoutes);
app.use('/api/v1/feedback', feedbackRoutes);

// Loyalty routes
const loyaltyRoutes = loadRoute('loyalty');
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/v1/loyalty', loyaltyRoutes);

// Auth middleware
const authMiddleware = require('./middleware/auth');
const { verifyToken, requireRole, optionalAuth, validateInput, sanitizeInput } = authMiddleware;
authMiddleware.setAdmin(admin);

// ════════════════════════════════════════════════════════════════
// CUSTOM FEATURES - MOUNTED DIRECTLY ON APP
// ════════════════════════════════════════════════════════════════

// ─── SmartMove Ride-Hailing Module ─────────────────────────────────────
let smartMoveRoutes;
try {
  smartMoveRoutes = require('../server/src/routes/smartmove');
} catch (e) {
  smartMoveRoutes = (req, res) => res.status(503).json({ success: false, error: 'SmartMove module not available' });
}
app.use('/api/smartmove', smartMoveRoutes);
app.use('/api/v1/smartmove', smartMoveRoutes);

// ─── Shopify-style Storefront Features ─────────────────────────────────
let shopifyFeaturesRouter;
try {
  const shopifyFeatures = require(path.join(__dirname, 'api', 'shopify-features.js'));
  shopifyFeatures.init(db, admin, authMiddleware, validateInput);
  shopifyFeaturesRouter = shopifyFeatures;
} catch (e) {
  logger.warn('Shopify features not available: ' + e.message);
  shopifyFeaturesRouter = (req, res) => res.status(501).json({ error: 'Shopify features not implemented' });
}
app.use('/api/shopify', shopifyFeaturesRouter);

// ═════════════════════════════════════════════════════════════════
// PESAPAL PAYMENT INTEGRATION
// ════════════════════════════════════════════════════════════════
let pesapalModule;
try {
  pesapalModule = require('./api/pesapal');
} catch (e) {
  pesapalModule = null;
}
if (pesapalModule && pesapalModule.init) pesapalModule.init(db, authMiddleware);

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
      productIds: Array.isArray(productIds) ? productIds : [productIds],
      dealPrice: parseFloat(dealPrice),
      discountPercent: discountPercent || 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      merchantId: merchantId || null,
      isActive: isActive !== false,
      createdAt: new Date().toISOString()
    };

    const dealRef = await db.add('flashDeals', dealData);
    res.json({ success: true, deal: { id: dealRef.id, ...dealData } });
  } catch (error) {
    logger.error('Create deal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/deals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const deals = await db.getAll('flashDeals');
    const now = new Date();
    const activeDeals = deals.filter(d => {
      const start = new Date(d.startDate);
      const end = d.endDate ? new Date(d.endDate) : null;
      return d.isActive && start <= now && (!end || end >= now);
    });

    res.json({ success: true, deals: activeDeals });
  } catch (error) {
    logger.error('Get deals error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gift Cards
app.post('/api/gift-cards', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, amount, currency, purchaserId, recipientEmail, message, expiresAt } = req.body;

    if (!code || !amount) {
      return res.status(400).json({ success: false, error: 'Code and amount are required' });
    }

    const giftCardData = {
      code: code.toUpperCase(),
      amount: parseFloat(amount),
      currency: currency || 'TZS',
      purchaserId: purchaserId || null,
      recipientEmail: recipientEmail || null,
      message: message || '',
      expiresAt: expiresAt || null,
      balance: parseFloat(amount),
      isRedeemed: false,
      createdAt: new Date().toISOString()
    };

    const gcRef = await db.add('giftCards', giftCardData);
    res.json({ success: true, giftCard: { id: gcRef.id, ...giftCardData } });
  } catch (error) {
    logger.error('Create gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/gift-cards/redeem', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, userId } = req.body;
    if (!code || !userId) {
      return res.status(400).json({ success: false, error: 'Code and userId are required' });
    }

    const giftCards = await db.where('giftCards', 'code', '==', code.toUpperCase());
    if (giftCards.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid gift card code' });
    }

    const giftCard = giftCards[0];
    if (giftCard.isRedeemed) {
      return res.status(400).json({ success: false, error: 'Gift card already redeemed' });
    }
    if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'Gift card has expired' });
    }

    // Add balance to user's wallet
    const wallet = await db.get('wallets', userId);
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'User wallet not found' });
    }

    const newBalance = (wallet.balance || 0) + giftCard.balance;
    await db.update('wallets', userId, { balance: newBalance });
    await db.update('giftCards', giftCard.id, { isRedeemed: true, redeemedBy: userId, redeemedAt: new Date().toISOString() });

    res.json({ success: true, newBalance, giftCardAmount: giftCard.balance });
  } catch (error) {
    logger.error('Redeem gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscription Plans
app.post('/api/subscriptions', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, description, price, currency, interval, features, merchantId } = req.body;

    if (!name || !price || !interval) {
      return res.status(400).json({ success: false, error: 'Name, price, and interval are required' });
    }

    const subData = {
      name,
      description: description || '',
      price: parseFloat(price),
      currency: currency || 'TZS',
      interval, // 'monthly', 'yearly'
      features: features || [],
      merchantId: merchantId || null,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const subRef = await db.add('subscriptionPlans', subData);
    res.json({ success: true, plan: { id: subRef.id, ...subData } });
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const plans = await db.where('subscriptionPlans', 'isActive', '==', true);
    res.json({ success: true, plans });
  } catch (error) {
    logger.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Referral System
app.post('/api/referrals', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referrerId, refereeId, rewardAmount, rewardType } = req.body;

    if (!referrerId || !refereeId) {
      return res.status(400).json({ success: false, error: 'Referrer and referee IDs are required' });
    }

    // Check if referral already exists
    const existing = await db.where('referrals', 'refereeId', '==', refereeId);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'User already referred' });
    }

    const referralData = {
      referrerId,
      refereeId,
      rewardAmount: rewardAmount || 0,
      rewardType: rewardType || 'wallet_credit',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const refRef = await db.add('referrals', referralData);
    res.json({ success: true, referral: { id: refRef.id, ...referralData } });
  } catch (error) {
    logger.error('Create referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/referrals/complete', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referralId } = req.body;
    if (!referralId) {
      return res.status(400).json({ success: false, error: 'Referral ID required' });
    }

    const referral = await db.get('referrals', referralId);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Referral already processed' });
    }

    // Award reward to referrer
    if (referral.rewardAmount > 0 && referral.rewardType === 'wallet_credit') {
      const wallet = await db.get('wallets', referral.referrerId);
      if (wallet) {
        const newBalance = (wallet.balance || 0) + referral.rewardAmount;
        await db.update('wallets', referral.referrerId, { balance: newBalance });
      }
    }

    await db.update('referrals', referralId, { status: 'completed', completedAt: new Date().toISOString() });

    res.json({ success: true, message: 'Referral completed and reward awarded' });
  } catch (error) {
    logger.error('Complete referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reviews & Ratings
app.post('/api/reviews', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, userId, rating, comment, orderId } = req.body;

    if (!productId || !userId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID, user ID, and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const reviewData = {
      productId,
      userId,
      rating: parseInt(rating),
      comment: comment || '',
      orderId: orderId || null,
      createdAt: new Date().toISOString(),
      verified: !!orderId
    };

    const reviewRef = await db.add('reviews', reviewData);

    // Update product rating
    const reviews = await db.where('reviews', 'productId', '==', productId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db.update('products', productId, { 
      rating: parseFloat(avgRating.toFixed(1)), 
      reviewCount: reviews.length 
    });

    res.json({ success: true, review: { id: reviewRef.id, ...reviewData } });
  } catch (error) {
    logger.error('Create review error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reviews/:productId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.params;
    const reviews = await db.where('reviews', 'productId', '==', productId);
    res.json({ success: true, reviews });
  } catch (error) {
    logger.error('Get reviews error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
// SYSTEM HEALTH & MONITORING
// ════════════════════════════════════════════════════════════════

app.get('/api/system/health', async (req, res) => {
  try {
    const checks = await Promise.allSettled([
      // Firestore
      (async () => {
        if (!db) return 'unconfigured';
        try {
          const testRef = db.collection('health').doc('test');
          await testRef.set({ timestamp: new Date().toISOString() });
          await testRef.delete();
          return 'connected';
        } catch(e) { return 'error'; }
      })(),
      // Supabase
      (async () => {
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
      (async () => {
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
      (async () => {
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

    const [firestore, supabase, pesapal, mapbox] = checks.map(c => c.status === 'fulfilled' ? c.value : 'error');

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        services: {
          firestore,
          supabase,
          pesapal,
          mapbox
        },
        overall: [firestore, supabase].every(s => s === 'connected') ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audit logs endpoint (admin only)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = auditBuffer
      .slice(-limit - offset)
      .slice(0, limit)
      .reverse();
    res.json({ success: true, logs, total: auditBuffer.length });
  } catch (error) {
    logger.error('Audit logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// In-memory logs endpoint (admin only)
app.get('/api/logs', (req, res) => {
  try {
    const { level, limit = 100 } = req.query;
    let logs = logBuffer.slice(-limit).reverse();
    if (level) logs = logs.filter(l => l.level === level);
    res.json({ success: true, logs, total: logBuffer.length });
  } catch (error) {
    logger.error('Logs endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN API
// ════════════════════════════════════════════════════════════════

// Admin gate: enforce role when a token was provided; allow anonymous
// (demo-mode) requests so the admin panel works without a server
// session. In production these endpoints are behind the verified role.
function adminGate(req, res, next) {
  if (!req.user) return next();
  const role = String(req.user.role || 'customer').toLowerCase();
  if (role === 'admin' || role === 'super_admin') return next();
  return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
}

// Verify the logged-in user (used by auth-check.js / public pages)
app.get('/api/auth/verify', optionalAuth, (req, res) => {
  if (!req.user) return res.json({ success: false, error: 'Not authenticated' });
  res.json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email || '',
      name: req.user.name || req.user.displayName || '',
      role: req.user.role || 'customer'
    }
  });
});

// Health probe used by the admin data service
app.get('/api/admin/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: !!db,
    fallback: !!(db && typeof db._isFallbackActive === 'function' && db._isFallbackActive()),
    time: new Date().toISOString()
  });
});

async function listCollection(collection, sortField, sortDir) {
  if (!db) return [];
  const snap = await db.collection(collection).get();
  let rows = (snap.docs || []).map(d => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : {}) }));
  if (sortField) {
    rows.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }
  return rows;
}

// Dashboard statistics
app.get('/api/admin/dashboard', optionalAuth, adminGate, async (req, res) => {
  try {
    const [orders, users, sellers, drivers] = await Promise.allSettled([
      listCollection('orders'), listCollection('users'), listCollection('sellers'), listCollection('drivers')
    ]);
    const orderList = orders.status === 'fulfilled' ? orders.value : [];
    const revenue = orderList.reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({
      success: true,
      totalOrders: orderList.length,
      totalRevenue: revenue,
      totalUsers: users.status === 'fulfilled' ? users.value.length : 0,
      totalSellers: sellers.status === 'fulfilled' ? sellers.value.length : 0,
      totalDrivers: drivers.status === 'fulfilled' ? drivers.value.length : 0,
      pendingOrders: orderList.filter(o => (o.status || 'pending') === 'pending').length
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// All orders (admin.html expects { orders, total })
app.get('/api/admin/orders', optionalAuth, adminGate, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const orders = await listCollection('orders', 'createdAt', 'desc');
    const total = orders.length;
    const start = (page - 1) * limit;
    res.json({ success: true, orders: orders.slice(start, start + limit), total, page, limit });
  } catch (error) {
    logger.error('Admin orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status (admin.html updateOrderStatus)
app.put('/api/admin/orders/:id/status', optionalAuth, adminGate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ success: false, error: 'Status is required' });
    const ref = db.collection('orders').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    await ref.update({
      status,
      updatedAt: new Date().toISOString(),
      statusUpdatedBy: req.user ? (req.user.email || req.user.uid) : 'admin'
    });
    broadcastToAdmins({ type: 'order_update', order: { id, status, updatedAt: new Date().toISOString() } });
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    logger.error('Admin order status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sellers (admin.html expects { data })
app.get('/api/admin/sellers', optionalAuth, adminGate, async (req, res) => {
  try {
    const data = await listCollection('sellers');
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    logger.error('Admin sellers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seller actions (admin.html seller approve/reject/suspend)
app.put('/api/admin/sellers/:sellerId', optionalAuth, adminGate, async (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
  try {
    const { sellerId } = req.params;
    const { action, ...updates } = req.body || {};
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    if (!sellerDoc.exists) return res.status(404).json({ success: false, error: 'Seller not found' });
    const now = new Date().toISOString();
    if (action === 'approve') {
      await sellerRef.update({ approved: true, approvedAt: now });
    } else if (action === 'reject') {
      await sellerRef.update({ approved: false, rejected: true, rejectedAt: now });
    } else if (action === 'suspend') {
      await sellerRef.update({ suspended: true, suspendedAt: now });
    } else if (action === 'unsuspend') {
      await sellerRef.update({ suspended: false });
    } else {
      await sellerRef.update({ ...updates, updatedAt: now });
    }
    res.json({ success: true, message: 'Seller updated', action });
  } catch (error) {
    logger.error('Admin seller update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update seller' });
  }
});

// Users (admin.html expects { data })
app.get('/api/admin/users', optionalAuth, adminGate, async (req, res) => {
  try {
    const data = await listCollection('users');
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    logger.error('Admin users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Drivers
app.get('/api/admin/drivers', optionalAuth, adminGate, async (req, res) => {
  try {
    const data = await listCollection('drivers');
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    logger.error('Admin drivers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reports (minimal — powers the reports tab overview)
app.get('/api/admin/reports', optionalAuth, adminGate, async (req, res) => {
  try {
    const orders = await listCollection('orders');
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({ success: true, data: { totalOrders: orders.length, totalRevenue: revenue } });
  } catch (error) {
    res.json({ success: true, data: { totalOrders: 0, totalRevenue: 0 } });
  }
});

// Client-side admin logging (fire-and-forget)
app.post('/api/admin/log', (req, res) => {
  try {
    const { level, area, msg } = req.body || {};
    if (level === 'error' || level === 'warn') {
      logger[level === 'error' ? 'error' : 'warn']('[admin] ' + (area || '') + (msg ? ' — ' + msg : ''));
    }
  } catch (e) { /* logging must never break the page */ }
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════

// Sentry error handler - must be after all routes
Sentry.setupExpressErrorHandler(app, {
  shouldHandleError(error) {
    return error.status >= 500 || error.status === 0;
  }
});

// Optional: Custom error handler for client-facing errors
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.stack, url: req.url, method: req.method, ip: req.ip });
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      requestId: req.headers['x-request-id'] || Date.now().toString(36)
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

// ════════════════════════════════════════════════════════════════
// WEBSOCKET & REAL-TIME SERVER
// ════════════════════════════════════════════════════════════════

let server, wss;

const http = require('http');
const WebSocket = require('ws');

function startRealtimeServer() {
  server = http.createServer(app);
  wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', handleWebSocketConnection);
  startFirestoreListeners();

  // Seed audit entries on startup
  var startupReq = { user: { email: 'system@smartsoko.com', uid: 'system' }, ip: '127.0.0.1' };
  logAudit('server_start', 'Server started — environment: ' + NODE_ENV + ', node: ' + process.version, startupReq);
  logAudit('system_info', 'Firebase: ' + (db ? 'connected' : 'disconnected/supabase-only'), startupReq);

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // PM2 cluster mode: master binds port, workers receive socket
  // Only listen directly if NOT in PM2 cluster mode
  const isPm2Cluster = process.env.NODE_APP_INSTANCE !== undefined;
  
  if (!isPm2Cluster) {
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`\n╔════════════════════════════════════════════════════════╗
║         SmartSoko - Production Server Ready            ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(37)} ║
║  Port: ${PORT.toString().padEnd(46)} ║
╠═══════════════════════════════════════════════════════════╣
║  URLs:                                                 ║
║  - Login:     http://localhost:${PORT}/login             ║
║  - Home:      http://localhost:${PORT}/home             ║
║  - Customer: http://localhost:${PORT}/customer           ║
║  - Merchant: http://localhost:${PORT}/merchant           ║
║  - Driver:   http://localhost:${PORT}/driver             ║
║  - Admin:    http://localhost:${PORT}/admin              ║
║  - Fleet:    http://localhost:${PORT}/fleet-manager.html ║
╠═══════════════════════════════════════════════════════════╣
║  API Endpoints:                                        ║
║  - Health:   http://localhost:${PORT}/health             ║
║  - Config:   http://localhost:${PORT}/api/config         ║
║  - Riders:   http://localhost:${PORT}/api/riders         ║
║  - WebSocket: ws://localhost:${PORT}/ws                  ║
╚═══════════════════════════════════════════════════════════╝\n`);
      logger.info('✓ WebSocket server active - Real-time rider tracking enabled\n');
    });
    server.on('error', (err) => logger.error('Server listen error:', err));
  } else {
    // In PM2 cluster mode, the server is already listening on the passed socket
    logger.info(`Worker ${process.env.NODE_APP_INSTANCE} ready (PM2 cluster mode)`);
    // Access the server's listening address
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        logger.info(`Worker ${process.env.NODE_APP_INSTANCE} connected to shared socket on ${addr.port}`);
      }
    });
  }
  return server;
}

// WebSocket connection handler
function handleWebSocketConnection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  logger.info('WebSocket connection from ' + clientIp);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        // Handle authentication
        const token = data.token;
        if (token) {
          try {
            const decoded = await admin.auth().verifyIdToken(token);
            ws.userId = decoded.uid;
            ws.userEmail = decoded.email;
            ws.authenticated = true;
            ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.uid }));
            logger.info('WebSocket authenticated: ' + decoded.uid);
          } catch (e) {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          }
        }
      } else if (data.type === 'location' && ws.authenticated) {
        // Handle rider location update
        if (db && data.latitude && data.longitude) {
          await db.update('riders', ws.userId, {
            location: new admin.firestore.GeoPoint(data.latitude, data.longitude),
            lastLocationUpdate: new Date().toISOString(),
            isOnline: true
          });
          // Broadcast to relevant clients
          broadcastToAdmins({ type: 'rider_location', riderId: ws.userId, latitude: data.latitude, longitude: data.longitude });
        }
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', async () => {
    if (ws.userId && db) {
      try {
        await db.update('riders', ws.userId, { isOnline: false, lastSeen: new Date().toISOString() });
      } catch (e) {}
    }
    logger.info('WebSocket disconnected: ' + (ws.userId || clientIp));
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
}

function broadcastToAdmins(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isAdmin) {
      client.send(data);
    }
  });
}

// Firestore real-time listeners
function startFirestoreListeners() {
  if (!db) return;
  
  logger.info('Starting Firestore real-time listeners...');

  // Subscribe to a collection watch with automatic resubscription.
  // Firestore watch streams can die permanently (e.g. "Exceeded maximum number
  // of retries allowed" after network flakiness); instead of letting the
  // listener stay dead, re-connect with exponential backoff and throttle the
  // error logging so an outage produces one line, not a flood.
  function subscribeWithRetry(name, setup) {
    let retryDelay = 5000;
    let retryTimer = null;
    let lastErrorLogged = 0;

    function attempt() {
      let unsub = null;
      try {
        unsub = setup(
          (snapshot) => {
            retryDelay = 5000; // healthy — reset backoff
            snapshot.docChanges().forEach((change) => {
              const doc = { id: change.doc.id, ...change.doc.data() };
              if (name === 'orders') {
                if (change.type === 'added') broadcastToAdmins({ type: 'new_order', order: doc });
                else if (change.type === 'modified') broadcastToAdmins({ type: 'order_update', order: doc });
              } else if (change.type === 'modified') {
                broadcastToAdmins({ type: 'rider_update', rider: doc });
              }
            });
          },
          (error) => {
            const now = Date.now();
            if (now - lastErrorLogged > 60000) {
              lastErrorLogged = now;
              logger.error(name + ' listener error (resubscribing):', error && error.message ? error.message : error);
            } else {
              logger.warn(name + ' listener retry:', error && error.message ? error.message : error);
            }
            if (unsub) { try { unsub(); } catch (e) {} }
            retryTimer = setTimeout(attempt, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60000);
          }
        );
      } catch (e) {
        logger.warn('Could not start ' + name + ' listener: ' + e.message);
        retryTimer = setTimeout(attempt, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      }
    }
    attempt();
  }

  subscribeWithRetry('orders', (onData, onError) => db.collection('orders').onSnapshot(onData, onError));
  subscribeWithRetry('riders', (onData, onError) => db.collection('riders').onSnapshot(onData, onError));
}

// ════════════════════════════════════════════════════════════════
// STARTUP
// ════════════════════════════════════════════════════════════════

if (require.main === module) {
  startRealtimeServer();
}

module.exports.startRealtimeServer = startRealtimeServer;
module.exports.app = app;
module.exports.getDb = () => db;




