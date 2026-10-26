/**
 * Production Server for SmartSoko
 * Optimized for production with compression, security headers, and error handling
 */

require('dotenv').config({ path: __dirname + '/../.env' });

// Sentry MUST be initialized before express (and any HTTP framework) is
// required, otherwise instrumentation is skipped with the warning
// "express is not instrumented".
const Sentry = require('@sentry/node');
const SKIP_SENTRY = process.env.SKIP_SENTRY === 'true';

if (!SKIP_SENTRY) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
            Sentry.nodeContextIntegration(),
            Sentry.localVariablesIntegration(),
            Sentry.linkedErrorsIntegration(),
        ],
        beforeSend(event) {
            // Report events in all environments; add filtering here if needed
            return event;
        },
    });
    console.log('Sentry initialized');
} else {
    console.log('SKIP_SENTRY enabled - Sentry disabled');
}

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
// ─── Extracted modules ───────────────────────────────────────────────
const { logger, logBuffer, auditBuffer, logAudit } = require('./src/config/logger');
const {
    mountRateLimiters,
    invalidateCache,
    cacheApiResponse,
    setAPICacheControl,
    clientLogLimiter,
} = require('./src/middleware/rate-limiter');
const featuresRouter = require('./src/routes/features');

// Firebase Admin SDK for real data
const admin = require('firebase-admin');
const { createDualDb } = require('../lib/server-db');

// Logger, audit buffer, and logAudit imported from server/src/config/logger.js above

// Keep the server alive when background services (Firestore, Supabase, payment webhooks)
// fail asynchronously - log instead of crashing the process.
process.on('unhandledRejection', reason => {
    logger.error('Unhandled promise rejection (recovered):', {
        error: reason && reason.stack ? reason.stack : String(reason),
    });
});
// CRASH-HANDLER SAFETY: when the server runs detached/hidden, the parent
// console pipe can die. Winston's Console transport then throws EPIPE on
// every write — including from INSIDE this handler — which re-triggers
// uncaughtException in an infinite loop (~5MB/s of log spam; see
// logs/error4598-4602.log written in 11 seconds on 2026-08-13). Two guards:
//   1. EPIPE never goes through the console transport (file-only logging).
//   2. Identical consecutive exceptions are rate-limited (max 1/sec).
let __lastCrashKey = '';
let __lastCrashTs = 0;
process.on('uncaughtException', err => {
    const isEpipe = err && (err.code === 'EPIPE' || /EPIPE/.test(err.message || ''));
    const key = ((err && (err.code || err.message)) || String(err)).slice(0, 200);
    const now = Date.now();
    if (key === __lastCrashKey && now - __lastCrashTs < 1000) return; // loop guard
    __lastCrashKey = key;
    __lastCrashTs = now;
    if (isEpipe) {
        // File-only logging: the console transport is what threw. Winston's
        // file transports are still safe (append-only streams). Note: File
        // transport's `filename` is the basename; the full path is
        // dirname/filename.
        try {
            const line = `[${new Date().toISOString()}] ERROR: Uncaught exception (recovered, EPIPE): ${key}\n`;
            const fs = require('fs');
            const path = require('path');
            for (const t of logger.transports) {
                if (t.name !== 'file' || !t.filename) continue;
                const full = t.dirname ? path.join(t.dirname, t.filename) : t.filename;
                fs.appendFileSync(full, line);
            }
        } catch (_) {
            /* even file logging is broken — drop silently */
        }
        return;
    }
    logger.error('Uncaught exception (recovered):', {
        error: err && err.stack ? err.stack : String(err),
    });
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
            const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
            if (!fs.existsSync(serviceAccountPath)) {
                throw new Error('Firebase service account is not configured');
            }
            serviceAccount = require(serviceAccountPath);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
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
app.set('skipFirebase', SKIP_FIREBASE);
app.set('admin', admin);

// Trust proxy for accurate client IP behind reverse proxy
app.set('trust proxy', 1);

// Request ID middleware for distributed tracing
app.use((req, res, next) => {
    req.id =
        req.headers['x-request-id'] ||
        req.headers['x-correlation-id'] ||
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
        if (
            req.headers['x-forwarded-proto'] !== 'https' &&
            req.headers['x-forwarded-ssl'] !== 'on'
        ) {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// The customer frontend is served by Firebase Hosting on these origins.
app.use(
    require('cors')({
        origin: [
            'https://smartsoko.tz',
            'https://www.smartsoko.tz',
            'https://fooddelievry-dce15.web.app',
            'https://fooddelievry-dce15.firebaseapp.com',
        ],
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Idempotency-Key',
            'X-Idempotency-Key',
            'X-Request-ID',
            'X-Language',
        ],
    })
);

// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com',
                    'https://cdnjs.cloudflare.com',
                    'https://api.mapbox.com',
                    'https://unpkg.com',
                ],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    'https://www.gstatic.com',
                    'https://www.google.com',
                    'https://apis.google.com',
                    'https://cdn.jsdelivr.net',
                    'https://api.mapbox.com',
                    'https://cdn.tailwindcss.com',
                    'https://www.googletagmanager.com',
                    'https://unpkg.com',
                ],
                scriptSrcAttr: ["'unsafe-inline'"],
                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com',
                    'https://cdnjs.cloudflare.com',
                    'https://api.mapbox.com',
                ],
                imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://*.mapbox.com'],
                connectSrc: [
                    "'self'",
                    'https://*.firebaseio.com',
                    'https://*.googleapis.com',
                    'https://www.gstatic.com',
                    'https://fonts.gstatic.com',
                    'https://api.mapbox.com',
                    'https://events.mapbox.com',
                    'https://nominatim.openstreetmap.org',
                    'https://cdn.jsdelivr.net',
                    'https://www.google-analytics.com',
                    'https://www.google.com',
                    'https://region1.google-analytics.com',
                    'https://pay.pesapal.com',
                    'https://vonkqyiczeqhuqhahsxm.supabase.co',
                    'wss://vonkqyiczeqhuqhahsxm.supabase.co',
                    'https://tiles.stadiamaps.com',
                    'https://*.stadiamaps.com',
                    'https://unpkg.com',
                ],
                workerSrc: ["'self'", 'blob:'],
                childSrc: [
                    "'self'",
                    'blob:',
                    'https://fooddelievry-dce15.firebaseapp.com',
                    'https://pay.pesapal.com',
                ],
                frameSrc: [
                    "'self'",
                    'https://fooddelievry-dce15.firebaseapp.com',
                    'https://*.firebaseapp.com',
                    'https://pay.pesapal.com',
                    'https://cybqa.pesapal.com',
                ],
                upgradeInsecureRequests: null,
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        crossOriginEmbedderPolicy: false,
    })
);

// Permissions Policy
app.use((req, res, next) => {
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(self), payment=(self "https://pay.pesapal.com"), usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
    );
    next();
});

// Compression middleware — gzip (existing) + brotli
app.use(
    compression({
        level: 1,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        },
    })
);

// Brotli middleware for static text assets (skips API routes — use gzip there)
app.use(function (req, res, next) {
    if (req.path.indexOf('/api/') === 0 || req.path.indexOf('/health') === 0) return next();
    var accept = req.headers['accept-encoding'] || '';
    if (accept.indexOf('br') < 0 || req.headers['x-no-compression']) return next();
    var _write = res.write.bind(res),
        _end = res.end.bind(res);
    var chunks = [],
        size = 0;
    res.write = function (chunk) {
        if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            size += chunks[chunks.length - 1].length;
        }
        return true;
    };
    res.end = function (chunk, encoding, cb) {
        if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            size += chunks[chunks.length - 1].length;
        }
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
        }
        var raw =
            size > 0
                ? Buffer.concat(chunks, size)
                : chunk
                  ? Buffer.isBuffer(chunk)
                      ? chunk
                      : Buffer.from(chunk)
                  : Buffer.alloc(0);
        if (raw.length < 1024) {
            _end(raw, encoding, cb);
            return;
        }
        var ct = res.getHeader('content-type') || '';
        if (ct.indexOf('image/') >= 0 || ct.indexOf('video/') >= 0) {
            _end(raw, encoding, cb);
            return;
        }
        zlib.brotliCompress(
            raw,
            {
                params: {
                    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
                    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
                },
            },
            function (err, compressed) {
                if (err || compressed.length >= raw.length) {
                    _end(raw, encoding, cb);
                    return;
                }
                res.removeHeader('Content-Length');
                res.setHeader('Content-Encoding', 'br');
                _end(compressed, encoding, cb);
            }
        );
    };
    next();
});

// Rate limiting & caching — imported from server/src/middleware/rate-limiter.js
mountRateLimiters(app);

// Parse JSON bodies
// Capture the raw request body so webhook signature verification (HMAC over exact bytes)
// works — express.json() would otherwise leave req.rawBody undefined. See api/ntzs.js verifyWebhookSignature().
app.use(
    express.json({
        limit: '1mb',
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging via Winston
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const catalogRead =
            req.method === 'GET' &&
            /^\/api\/(?:v1\/)?(?:products|categories|sellers)(?:\/|\?|$)/.test(req.originalUrl);
        // Keep errors/slow reads visible without writing every cache hit to the
        // console, rotating file and memory transports under catalogue load.
        if (
            catalogRead &&
            res.statusCode < 400 &&
            duration < 1000 &&
            !logger.isLevelEnabled('debug')
        )
            return;
        logger.info(`${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    });
    next();
});

// Serve the SVG favicon for legacy /favicon.ico requests (browsers request
// this by default when a page has no icon link) — avoids 404 noise in logs.
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.svg'));
});

// Serve static files with caching
const servePublic = express.static(path.join(__dirname, '..', 'public'), {
    maxAge: NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true,
});
// API traffic must not queue a filesystem stat for a nonexistent public/api
// file before reaching its route (especially costly under Windows load).
app.use((req, res, next) =>
    req.path === '/health' || req.path === '/api' || req.path.startsWith('/api/')
        ? next()
        : servePublic(req, res, next)
);

// AI Product Agent routes
const aiProductAgentRoutes = require('./src/routes/ai/product-agent');
app.use('/ai', aiProductAgentRoutes);

// Health endpoint (no auth, high rate limit) - MUST come before extensionless HTML routes
const { healthRoutes } = require('./src/routes/health');
healthRoutes(app);

// Extensionless HTML routes (e.g. /login, /home, /merchant -> public/<name>.html).
// Must come before API routes so /api/* paths are never treated as pages.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PUBLIC_ROUTES = [
    'login',
    'home',
    'customer',
    'merchant',
    'driver',
    'admin',
    'admin-panel',
    'discovery',
    'profile',
    'cart',
    'saved-items',
    'orders',
    'customer-orders',
    'product',
    'restaurant',
    'chat',
    'track-order',
    'checkout',
    'wallet',
    'store',
    'signup',
    'main',
    'seller',
    'index',
    'onboarding',
    'check-user',
    'fleet-manager',
    'supabase',
    'seed-merchant',
    'smartsoko-home',
    'smartsoko-products',
    'smartsoko-vendor',
    'smartsoko-cart',
    'smartsoko-checkout',
    'referral',
    '404',
    'errors',
];
// Error monitoring dashboard data (reads smartsoko-mcp dist/errorScan.js)
const ERROR_SCAN_MODULE =
    process.env.SMARTSOKO_MCP_ERRORSCAN ||
    'E:\\Project\\notsmartsoko\\smartsoko-mcp\\dist\\errorScan.js';
app.get('/errors/data', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const mod = require(ERROR_SCAN_MODULE);
        if (!mod || typeof mod.getDashboardData !== 'function') {
            return res.status(500).json({
                error: `Dashboard module ${ERROR_SCAN_MODULE} has no getDashboardData export (rebuild smartsoko-mcp?).`,
            });
        }
        res.json(mod.getDashboardData());
    } catch (e) {
        res.status(500).json({
            error: `Dashboard data unavailable: ${e instanceof Error ? e.message : String(e)}`,
        });
    }
});
app.get('/', (req, res) => {
    const indexFile = path.join(PUBLIC_DIR, 'index.html');
    res.sendFile(fs.existsSync(indexFile) ? indexFile : path.join(PUBLIC_DIR, 'main.html'));
});
// Preserve old My Orders bookmarks without resurrecting the removed page.
app.get(['/customer', '/customer.html'], (req, res) => res.redirect('/customer-orders'));
app.get('/wishlist', (req, res) => res.redirect('/saved-items'));
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
        pricing: app.get('config'),
        firebase: !!db,
        mapbox: !!process.env.MAPBOX_TOKEN,
        pesapal: !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
        sentry: !!process.env.SENTRY_DSN,
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
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
        const routePath = path.join(__dirname, 'src', 'routes', name);
        return require(routePath);
    } catch (e) {
        return (req, res) => res.status(501).json({ error: name + ' route not implemented' });
    }
}

// Route modules export a function `xRoutes(app)` that registers routes on the
// passed app (see server/src/routes/index.js). Mount such a module correctly.
//
// These modules are required STATICALLY here (not via require(path.join(...)))
// because serverless bundlers (Vercel) only trace statically analyzable
// requires. Loading them dynamically ships the route files but not their
// transitive node_modules (e.g. `zod`), so the mount 503s in production.
const STATIC_ROUTE_MODULES = {
    orders: require('./src/routes/orders'),
    addresses: require('./src/routes/addresses'),
    cart: require('./src/routes/cart'),
    paymentMethods: require('./src/routes/paymentMethods'),
    products: require('./src/routes/products'),
    'smart-shopping': require('./src/routes/smart-shopping'),
};

function mountRouteModule(name) {
    let mod;
    try {
        mod = STATIC_ROUTE_MODULES[name] || require(path.join(__dirname, 'src', 'routes', name));
    } catch (error) {
        logger.error('Route ' + name + ' unavailable: ' + error.message);
        // Console mirrors the failure into Vercel runtime logs (winston writes to
        // files there), so future boot failures show up without redeploying.
        console.error('Route ' + name + ' unavailable: ' + error.message);
        app.use('/api/' + name, (req, res) =>
            res.status(503).json({ success: false, error: 'Service temporarily unavailable' })
        );
        return;
    }
    if (typeof mod === 'function') {
        mod(app);
        return;
    }
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
    const wrapped = {
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
        set: (collection, id, data) =>
            proxy.collection(collection).doc(id).set(data, { merge: true }),
        delete: (collection, id) => proxy.collection(collection).doc(id).delete(),
        getAll: async collection => {
            const snap = await proxy.collection(collection).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        },
    };
    const { invalidateCatalog } = require('./src/services/catalog-cache');
    if (typeof proxy.applyInventoryMovement === 'function') {
        wrapped.applyInventoryMovement = async entry => {
            const result = await proxy.applyInventoryMovement(entry);
            if (result) invalidateCatalog(wrapped, 'products');
            return result;
        };
    }
    for (const operation of ['add', 'update', 'set', 'delete']) {
        const write = wrapped[operation];
        wrapped[operation] = async (...args) => {
            const result = await write(...args);
            if (['products', 'sellers'].includes(args[0])) invalidateCatalog(wrapped, args[0]);
            if (args[0] === 'orders') invalidateCatalog(wrapped, 'products');
            return result;
        };
    }
    // Pass through dual-db diagnostic helpers (used by /api/health)
    if (typeof proxy._isFallbackActive === 'function') {
        wrapped._isFallbackActive = () => proxy._isFallbackActive();
    }
    if (typeof proxy._getFirestore === 'function') {
        wrapped._getFirestore = () => proxy._getFirestore();
    }
    return wrapped;
}

// Shop routes (module exports shopsRoutes(app) which registers /api/shops,
// /api/shops/:shopId and the /api/v1 aliases)
mountRouteModule('shops');

// Order routes (module exports orderRoutes(app) which registers /api/orders & /api/v1/orders)
mountRouteModule('orders');

// Addresses, cart, and saved payment-method prefs (customer native app)
mountRouteModule('addresses');
mountRouteModule('cart');
mountRouteModule('paymentMethods');

// Public catalogue: /api/products, /api/categories (web/config/api-config.js)
mountRouteModule('products');
mountRouteModule('smart-shopping');

// Rider routes (module exposes { driverRoutes, riderRoutes } — registers
// /api/driver/*, /api/sellers, and the /api/riders catalogue)
try {
    const driverMod = require('./src/routes/driver');
    driverMod.driverRoutes(app); // legacy /api/driver/* + /api/sellers
    app.use('/api/riders', driverMod.riderRoutes());
    app.use('/api/v1/riders', driverMod.riderRoutes());
    logger.info('Driver/seller legacy API mounted (/api/driver, /api/sellers, /api/riders)');
} catch (e) {
    logger.error('Driver routes failed to load: ' + e.message);
}

// Payment routes
const paymentRoutes = express.Router();
let pesapalRouter;
try {
    pesapalRouter = require('../api/pesapal');
} catch (e) {
    pesapalRouter = (req, res) => res.status(503).json({ error: 'payments route not implemented' });
}
paymentRoutes.use('/pesapal', pesapalRouter);

let ntzsRouter;
try {
    ntzsRouter = require('../api/ntzs');
} catch (e) {
    ntzsRouter = (req, res) => res.status(503).json({ error: 'ntzs route not implemented' });
}
paymentRoutes.use('/ntzs', ntzsRouter);

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
const authMiddleware = require('./src/middleware/auth');
const { verifyToken, requireRole, optionalAuth, validateInput, sanitizeInput } = authMiddleware;
if (typeof authMiddleware.setAdmin === 'function') authMiddleware.setAdmin(admin);

// ─── Mobile App API (native Android customer app: auth/login, refresh,
//     users/profile, products/featured, orders tracking/cancel) ────────────
// Must be mounted BEFORE web orders routes so mobile /api/orders takes precedence
try {
    const { mobileAppRoutes } = require('./src/routes/mobile-app');
    app.set('authMiddleware', authMiddleware);
    mobileAppRoutes(app);
    logger.info(
        'Mobile app API mounted (/api/auth/*, /api/users/profile, /api/products/featured, /api/orders/*)'
    );
} catch (e) {
    logger.error('Mobile app API failed to load: ' + e.message);
}

// ════════════════════════════════════════════════════════════════
// CUSTOM FEATURES - MOUNTED DIRECTLY ON APP
// ════════════════════════════════════════════════════════════════

// ─── Merchant OS API (Graph Engineering build, 2026-08) ────────────────
// Capability-gated, tenant-isolated merchant dashboard backend.
try {
    const { mountMerchantOs } = require('./src/routes/merchant');
    mountMerchantOs(app);
    logger.info('Merchant OS API mounted at /api/merchant');
} catch (e) {
    logger.error('Merchant OS API failed to load: ' + e.message);
}

// ─── SmartMove Ride-Hailing Module ─────────────────────────────────────
let smartMoveRoutes;
try {
    smartMoveRoutes = require('./src/routes/smartmove');
} catch (e) {
    smartMoveRoutes = (req, res) =>
        res.status(503).json({ success: false, error: 'SmartMove module not available' });
}
app.use('/api/smartmove', smartMoveRoutes);
app.use('/api/v1/smartmove', smartMoveRoutes);

// ─── Phone OTP authentication (login.html phone tab) ─────────────────────
try {
    const { otpRoutes } = require('./src/routes/otp');
    otpRoutes(app);
    logger.info('OTP auth routes mounted at /api/auth/otp/*');
} catch (e) {
    logger.error('OTP routes failed to load: ' + e.message);
}

// ─── Extended Admin API (commission, users/stats, sellers/analytics,
//     settings, RBAC, api-keys, webhooks, CMS, notifications, reviews…) ───
try {
    const { adminExtendedRoutes } = require('./src/routes/admin-extended');
    app.set('authMiddleware', authMiddleware);
    adminExtendedRoutes(app);
    logger.info('Extended admin API mounted (/api/admin/*)');
} catch (e) {
    logger.error('Extended admin API failed to load: ' + e.message);
}

// ─── Shopify-style Storefront Features ─────────────────────────────────
let shopifyFeaturesRouter;
try {
    const shopifyFeatures = require(path.join(__dirname, '..', 'api', 'shopify-features.js'));
    shopifyFeatures.init(db, admin, authMiddleware, validateInput);
    shopifyFeaturesRouter = shopifyFeatures;
} catch (e) {
    logger.warn('Shopify features not available: ' + e.message);
    shopifyFeaturesRouter = (req, res) =>
        res.status(501).json({ error: 'Shopify features not implemented' });
}
app.use('/api/shopify', shopifyFeaturesRouter);

// ═════════════════════════════════════════════════════════════════
// PESAPAL PAYMENT INTEGRATION
// ════════════════════════════════════════════════════════════════
let pesapalModule;
try {
    pesapalModule = require('../api/pesapal');
} catch (e) {
    pesapalModule = null;
}
if (pesapalModule && pesapalModule.init) pesapalModule.init(db, authMiddleware);
// Expose the pesapal module to other routes (mobile-app.js uses submitOrder
// for the native app's hosted-checkout flow, mirroring the web checkout).
app.set('pesapalModule', pesapalModule);

let ntzsModule;
try {
    ntzsModule = require('../api/ntzs');
} catch (e) {
    ntzsModule = null;
}
if (ntzsModule && ntzsModule.init) ntzsModule.init(db, authMiddleware);

// Feature routes (deals, gift-cards, subscriptions, referrals, reviews)
// Extracted to server/src/routes/features.js
app.set('logger', logger);
app.use('/api', featuresRouter);

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
                } catch (e) {
                    return 'error';
                }
            })(),
            // Supabase
            (async () => {
                try {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseUrl =
                        process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
                    const supabaseKey =
                        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
                    if (!supabaseKey) return 'unconfigured';
                    const testClient = createClient(supabaseUrl, supabaseKey, {
                        auth: { persistSession: false },
                    });
                    const { error } = await testClient
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .limit(1);
                    return error ? 'error' : 'connected';
                } catch (e) {
                    return 'unavailable';
                }
            })(),
            // PesaPal
            (async () => {
                try {
                    const https = require('https');
                    return await new Promise(function (resolve) {
                        var req = https.get(
                            'https://api.pesapal.com/',
                            { timeout: 4000 },
                            function (res) {
                                resolve(res.statusCode < 500 ? 'connected' : 'degraded');
                            }
                        );
                        req.on('error', function () {
                            resolve('disconnected');
                        });
                        req.on('timeout', function () {
                            req.destroy();
                            resolve('timeout');
                        });
                    });
                } catch (e) {
                    return 'disconnected';
                }
            })(),
            // Mapbox
            (async () => {
                try {
                    const https = require('https');
                    return await new Promise(function (resolve) {
                        var req = https.get(
                            'https://api.mapbox.com/',
                            { timeout: 4000 },
                            function (res) {
                                resolve(res.statusCode < 500 ? 'connected' : 'degraded');
                            }
                        );
                        req.on('error', function () {
                            resolve('disconnected');
                        });
                        req.on('timeout', function () {
                            req.destroy();
                            resolve('timeout');
                        });
                    });
                } catch (e) {
                    return 'disconnected';
                }
            })(),
        ]);

        const [firestore, supabase, pesapal, mapbox] = checks.map(c =>
            c.status === 'fulfilled' ? c.value : 'error'
        );

        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                services: {
                    firestore,
                    supabase,
                    pesapal,
                    mapbox,
                },
                overall: [firestore, supabase].every(s => s === 'connected')
                    ? 'healthy'
                    : 'degraded',
            },
        });
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Audit logs endpoint (admin only) — now actually gated (was anonymous)
app.get('/api/audit-logs', optionalAuth, adminGate, async (req, res) => {
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

// In-memory logs endpoint (admin only) — now actually gated (was anonymous)
app.get('/api/logs', optionalAuth, adminGate, (req, res) => {
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

// Admin gate: enforce verified admin role. SECURITY: this previously failed
// OPEN for anonymous requests ("demo mode") which exposed all /api/admin/*
// data (sellers, users, orders, audit logs) without any token. It now fails
// CLOSED; set ALLOW_ANON_ADMIN=true explicitly to restore the old demo
// behaviour in a trusted local environment.
function adminGate(req, res, next) {
    if (!req.user) {
        if (String(process.env.ALLOW_ANON_ADMIN) === 'true') return next();
        return res
            .status(401)
            .json({ error: 'Unauthorized', message: 'Admin authentication required' });
    }
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
            role: req.user.role || 'customer',
        },
    });
});

// Health probe used by the admin data service
app.get('/api/admin/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        db: !!db,
        fallback: !!(db && typeof db._isFallbackActive === 'function' && db._isFallbackActive()),
        time: new Date().toISOString(),
    });
});

async function listCollection(collection, sortField, sortDir) {
    if (!db) return [];
    const snap = await db.collection(collection).get();
    let rows = (snap.docs || []).map(d => ({
        id: d.id,
        ...(typeof d.data === 'function' ? d.data() : {}),
    }));
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
            listCollection('orders'),
            listCollection('users'),
            listCollection('sellers'),
            listCollection('drivers'),
        ]);
        const orderList = orders.status === 'fulfilled' ? orders.value : [];
        const revenue = orderList.reduce((sum, o) => sum + (o.total || 0), 0);
        const stats = {
            totalOrders: orderList.length,
            totalRevenue: revenue,
            totalUsers: users.status === 'fulfilled' ? users.value.length : 0,
            totalSellers: sellers.status === 'fulfilled' ? sellers.value.length : 0,
            totalDrivers: drivers.status === 'fulfilled' ? drivers.value.length : 0,
            pendingOrders: orderList.filter(o => (o.status || 'pending') === 'pending').length,
        };
        // Top-level keys serve admin.html; `data` envelope + *Today/activeUsers
        // aliases serve the native admin app's DashboardStats DTO.
        res.json({
            success: true,
            ...stats,
            data: {
                ...stats,
                ordersToday: stats.totalOrders,
                revenueToday: stats.totalRevenue,
                activeUsers: stats.totalUsers,
            },
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
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
        const status = (req.query.status || '').trim();
        const q = (req.query.q || '').trim();
        let orders = await listCollection('orders', 'createdAt', 'desc');
        // Normalize legacy map-shaped items ({name: qty}) to the array form
        // API consumers expect; one object-shaped row breaks strict list parsers.
        orders = orders.map(o => {
            if (o.items && !Array.isArray(o.items)) {
                o.items = Object.entries(o.items).map(([name, qty]) => ({
                    name,
                    quantity: typeof qty === 'number' ? qty : 1,
                }));
            }
            if (o.totalAmount == null && o.total != null) o.totalAmount = o.total;
            return o;
        });
        // Server-side filters (admin.html currently filters client-side; native/API consumers use these)
        if (status) {
            orders = orders.filter(o => (o.status || 'pending') === status);
        }
        if (q) {
            const needle = q.toLowerCase();
            orders = orders.filter(
                o =>
                    String(o.id || '')
                        .toLowerCase()
                        .includes(needle) ||
                    String(o.customerName || '')
                        .toLowerCase()
                        .includes(needle) ||
                    String(o.customerPhone || '').includes(q)
            );
        }
        const total = orders.length;
        const start = (page - 1) * limit;
        const paged = orders.slice(start, start + limit);
        // `orders`/`total` serve admin.html; `data`/`count` serve the native
        // admin app's ApiListResponse DTO.
        res.json({ success: true, orders: paged, total, page, limit, data: paged, count: paged.length });
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
            statusUpdatedBy: req.user ? req.user.email || req.user.uid : 'admin',
        });
        broadcastToAdmins({
            type: 'order_update',
            order: { id, status, updatedAt: new Date().toISOString() },
        });
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
        if (!sellerDoc.exists)
            return res.status(404).json({ success: false, error: 'Seller not found' });
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

// Users (admin.html expects { data } with a normalized `status` field:
// 'active' | 'suspended' | 'deleted' — derived from the suspended/deleted flags)
app.get('/api/admin/users', optionalAuth, adminGate, async (req, res) => {
    try {
        const data = await listCollection('users');
        const withStatus = data.map(u => ({
            ...u,
            status: u.deleted ? 'deleted' : u.suspended ? 'suspended' : u.status || 'active',
        }));
        res.json({ success: true, data: withStatus, total: withStatus.length });
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

// Client-side admin logging (fire-and-forget) — rate-limited to prevent log spam
app.post('/api/admin/log', clientLogLimiter, (req, res) => {
    try {
        const { level, area, msg } = req.body || {};
        if (level === 'error' || level === 'warn') {
            logger[level === 'error' ? 'error' : 'warn'](
                '[admin] ' + (area || '') + (msg ? ' — ' + msg : '')
            );
        }
    } catch (e) {
        /* logging must never break the page */
    }
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════

// Sentry error handler - must be after all routes
Sentry.setupExpressErrorHandler(app, {
    shouldHandleError(error) {
        return error.status >= 500 || error.status === 0;
    },
});

// Optional: Custom error handler for client-facing errors
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    });
    if (!res.headersSent) {
        res.status(err.status || 500).json({
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            requestId: req.headers['x-request-id'] || Date.now().toString(36),
        });
    }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

// Catch-all: any unmatched non-API GET renders the branded 404 page
app.use((req, res) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
        return res.status(404).send('Not found');
    }
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
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
    logAudit(
        'server_start',
        'Server started — environment: ' + NODE_ENV + ', node: ' + process.version,
        startupReq
    );
    logAudit(
        'system_info',
        'Firebase: ' + (db ? 'connected' : 'disconnected/supabase-only'),
        startupReq
    );

    // Heartbeat interval to detect dead connections
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach(ws => {
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
        server.on('error', err => {
            if (err && err.code === 'EADDRINUSE') {
                logger.error(
                    `Port ${PORT} is already in use — another SmartSoko instance is running. ` +
                        `Find it with: netstat -ano | findstr :${PORT}  then stop that PID. Exiting.`
                );
                process.exit(1);
            }
            logger.error('Server listen error:', err);
        });
    } else {
        // In PM2 cluster mode, the server is already listening on the passed socket
        logger.info(`Worker ${process.env.NODE_APP_INSTANCE} ready (PM2 cluster mode)`);
        // Access the server's listening address
        server.on('listening', () => {
            const addr = server.address();
            if (addr && typeof addr === 'object') {
                logger.info(
                    `Worker ${process.env.NODE_APP_INSTANCE} connected to shared socket on ${addr.port}`
                );
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
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async message => {
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
                        isOnline: true,
                    });
                    // Broadcast to relevant clients
                    broadcastToAdmins({
                        type: 'rider_location',
                        riderId: ws.userId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                    });
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
                await db.update('riders', ws.userId, {
                    isOnline: false,
                    lastSeen: new Date().toISOString(),
                });
            } catch (e) {}
        }
        logger.info('WebSocket disconnected: ' + (ws.userId || clientIp));
    });

    ws.on('error', error => {
        logger.error('WebSocket error:', error);
    });
}

function broadcastToAdmins(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.isAdmin) {
            client.send(data);
        }
    });
}

// Firestore real-time listeners.
// In Supabase-only mode (SKIP_FIREBASE) the db proxy still exists but its
// Firestore half is dead — skip entirely instead of retry-looping every minute.
function startFirestoreListeners() {
    if (SKIP_FIREBASE || !db) {
        logger.info('Firestore listeners skipped — running in Supabase-only mode');
        return;
    }
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
                    snapshot => {
                        retryDelay = 5000; // healthy — reset backoff
                        snapshot.docChanges().forEach(change => {
                            const doc = { id: change.doc.id, ...change.doc.data() };
                            if (name === 'orders') {
                                if (change.type === 'added')
                                    broadcastToAdmins({ type: 'new_order', order: doc });
                                else if (change.type === 'modified')
                                    broadcastToAdmins({ type: 'order_update', order: doc });
                            } else if (change.type === 'modified') {
                                broadcastToAdmins({ type: 'rider_update', rider: doc });
                            }
                        });
                    },
                    error => {
                        const now = Date.now();
                        if (now - lastErrorLogged > 60000) {
                            lastErrorLogged = now;
                            logger.error(
                                name + ' listener error (resubscribing):',
                                error && error.message ? error.message : error
                            );
                        } else {
                            logger.warn(
                                name + ' listener retry:',
                                error && error.message ? error.message : error
                            );
                        }
                        if (unsub) {
                            try {
                                unsub();
                            } catch (e) {}
                        }
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

    subscribeWithRetry('orders', (onData, onError) =>
        db.collection('orders').onSnapshot(onData, onError)
    );
    subscribeWithRetry('riders', (onData, onError) =>
        db.collection('riders').onSnapshot(onData, onError)
    );
}

// ════════════════════════════════════════════════════════════════
// STARTUP
// ════════════════════════════════════════════════════════════════

if (require.main === module) {
    require('./src/services/report-delivery').createReportDelivery({ logger }).start();
    startRealtimeServer();
}

module.exports.startRealtimeServer = startRealtimeServer;
module.exports.app = app;
module.exports.getDb = () => db;
