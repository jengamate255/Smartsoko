/**
 * SmartSoko - Refactored Production Server
 * Modular architecture with proper separation of concerns
 */

require('dotenv').config({ path: __dirname + '/../../.env' });

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const winston = require('winston');
const crypto = require('crypto');
const admin = require('firebase-admin');
const http = require('http');
const WebSocket = require('ws');
const { createDualDb } = require('./lib/server-db');
const config = require('./src/config');
const { registerRoutes } = require('./src/routes');
const { aiRoutes } = require('./src/ai/routes');
const { swaggerSetup } = require('./src/docs/swagger');
const { requestId, tracingLogger } = require('./src/middleware/tracing');
const { shutdownListeners, startOrdersListener, startRidersListener } = require('./src/utils/firestoreListeners');

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
  const entry = { timestamp: new Date().toISOString(), action, details: details || '', user: req && req.user ? (req.user.email || req.user.uid || 'unknown') : 'system', ip: req ? req.ip : '0.0.0.0', uid: req && req.user ? req.user.uid || null : null };
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_AUDIT_ENTRIES) auditBuffer.splice(0, auditBuffer.length - MAX_AUDIT_ENTRIES);
  logger.info('AUDIT: ' + action + (details ? ' — ' + details : ''), { user: entry.user, ip: entry.ip });
}

// Sentry error tracking
const Sentry = require('@sentry/node');
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
  console.log('Sentry initialized');
} else {
  console.log('SKIP_SENTRY enabled - Sentry disabled');
}

// Initialize Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    config.env === 'production'
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
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    }),
    new MemoryTransport()
  ]
});

// Initialize Firebase Admin
let db;

async function initializeFirebase() {
  const SKIP_FIREBASE = config.env !== 'production' || process.env.SKIP_FIREBASE === 'true';
  
  if (SKIP_FIREBASE) {
    logger.info('SKIP_FIREBASE enabled - Running in Supabase-only mode');
    db = createDualDb(null);
  } else {
    try {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
      } else {
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        if (!fs.existsSync(serviceAccountPath)) {
          throw new Error('Firebase service account is not configured');
        }
        serviceAccount = require(serviceAccountPath);
      }
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      db = createDualDb(admin.firestore());
      logger.info('Firebase Admin initialized - Using REAL data from Firestore');
    } catch (e) {
      logger.warn('Firebase Admin not initialized: ' + e.message);
      db = createDualDb(null);
      logger.info('Running in Supabase-only mode');
    }
  }
  return db;
}

// Create Express app
const app = express();
const PORT = config.port;
const NODE_ENV = config.env;

// Trust proxy for accurate client IP behind reverse proxy
app.set('trust proxy', 1);

// ─── Request ID & Tracing ───────────────────────────────────────────
app.use(requestId);
app.use(tracingLogger);

// API versioning
const API_VERSION = 'v1';
const apiRouter = express.Router();
app.use(`/api/${API_VERSION}`, apiRouter);

// SSL redirect in production
if (NODE_ENV === 'production' && config.security.forceHttps) {
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
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://www.gstatic.com", "https://fonts.gstatic.com", "https://api.mapbox.com", "https://events.mapbox.com", "https://nominatim.openstreetmap.org", "https://cdn.jsdelivr.net", "https://www.google-analytics.com", "https://www.google.com", "https://region1.google-analytics.com", "https://pay.pesapal.com", "https://vonkqyiczeqhuqhahsxm.supabase.co", "wss://vonkqyiczeqhuqhahsxm.supabase.co", "https://tiles.stadiamaps.com", "https://*.stadiamaps.com", "https://unpkg.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:", "https://fooddelievry-dce15.firebaseapp.com", "https://*.firebaseapp.com", "https://pay.pesapal.com"],
      frameSrc: ["'self'", "https://fooddelievry-dce15.firebaseapp.com", "https://*.firebaseapp.com", "https://pay.pesapal.com", "https://cybqa.pesapal.com"],
      upgradeInsecureRequests: null,
    },
  },
  hsts: {
    maxAge: config.security.hstsMaxAge,
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

// Compression middleware
app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Brotli middleware for static text assets
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

// Tiered rate limiting
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs, max, message,
  standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

const authLimiter = createLimiter(config.rateLimit.auth.windowMs, config.rateLimit.auth.max, 'Too many auth attempts, please try again later.');
const apiLimiter = createLimiter(config.rateLimit.api.windowMs, config.rateLimit.api.max, 'Too many requests, please try again later.');
const publicLimiter = createLimiter(config.rateLimit.public.windowMs, config.rateLimit.public.max, 'Too many requests.');

app.use('/api/v1/auth/', authLimiter);
app.use('/api/v1/', apiLimiter);
app.use('/health', publicLimiter);
app.use('/api/health', publicLimiter);
app.use('/api/status', publicLimiter);
app.use('/api/config', publicLimiter);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
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

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// Make db, config, admin available to routes
app.use((req, res, next) => {
  req.app.set('db', db);
  req.app.set('config', config);
  req.app.set('admin', admin);
  next();
});

// ─── Swagger Documentation ──────────────────────────────────────────
swaggerSetup(app);

// ─── Register Routes ────────────────────────────────────────────────
registerRoutes(app);
// AI Product Agent routes
app.use(`/api/${API_VERSION}/ai`, aiRoutes);

// ─── Shopify Features ───────────────────────────────────────────────
let shopifyFeaturesRouter;
try {
  const shopifyFeatures = require('../../api/shopify-features.js');
  shopifyFeatures.init(db, admin, require('./src/middleware').authMiddleware, require('./src/middleware').validateInput);
  shopifyFeaturesRouter = shopifyFeatures;
} catch (e) {
  logger.warn('Shopify features not available: ' + e.message);
  shopifyFeaturesRouter = (req, res) => res.status(501).json({ error: 'Shopify features not implemented' });
}
app.use('/api/shopify', shopifyFeaturesRouter);

// PesaPal Payment Integration
let pesapalModule;
try {
  pesapalModule = require('../server/src/routes/pesapal');
} catch (e) {
  pesapalModule = (req, res) => res.status(503).json({ success: false, error: 'PesaPal module not available' });
}
if (pesapalModule.init) pesapalModule.init(db, require('./src/middleware').authMiddleware);
app.use('/api/payments/pesapal', pesapalModule);

// Auth middleware
const authMiddleware = require('./src/middleware/auth');
const { verifyToken, requireRole, optionalAuth, validateInput, sanitizeInput } = authMiddleware;

// ─── SmartMove Ride-Hailing Module ─────────────────────────────────
let smartMoveRoutes;
try {
  smartMoveRoutes = require('../server/src/routes/smartmove');
} catch (e) {
  smartMoveRoutes = (req, res) => res.status(503).json({ success: false, error: 'SmartMove module not available' });
}
app.use('/api/smartmove', smartMoveRoutes);
app.use('/api/v1/smartmove', smartMoveRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.stack, url: req.url, method: req.method, ip: req.ip, requestId: req.id });
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
      requestId: req.id
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

// ─── Extensionless HTML Routes ──────────────────────────────────────
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

for (const route of PUBLIC_ROUTES) {
  app.get(`/${route}`, (req, res) => {
    const filePath = path.join(PUBLIC_DIR, `${route}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });
}

// ─── WebSocket & Real-time Server ──────────────────────────────────
let server, wss;

function startRealtimeServer() {
  server = http.createServer(app);
  wss = new WebSocket.Server({ server, path: config.websocket.path });
  wss.on('connection', handleWebSocketConnection);
  startFirestoreListeners();

  // Seed audit entries on startup
  var startupReq = { user: { email: 'system@smartsoko.com', uid: 'system' }, ip: '127.0.0.1' };
  logAudit('server_start', 'Server started — environment: ' + NODE_ENV + ', node: ' + process.version, startupReq);
  logAudit('system_info', 'Firebase: ' + (db ? 'connected' : 'disconnected/supabase-only'), startupReq);

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.websocket.heartbeatInterval);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // PM2 cluster mode
  const isPm2Cluster = process.env.NODE_APP_INSTANCE !== undefined;
  
  if (!isPm2Cluster) {
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`\n╔════════════════════════════════════════════════════════╗
║         SmartSoko - Production Server Ready            ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(37)} ║
║  Port: ${PORT.toString().padEnd(46)} ║
╠════════════════════════════════════════════════════════════╣
║  URLs:                                                 ║
║  - Login:     http://localhost:${PORT}/login             ║
║  - Home:      http://localhost:${PORT}/home             ║
║  - Customer: http://localhost:${PORT}/customer           ║
║  - Merchant: http://localhost:${PORT}/merchant           ║
║  - Driver:   http://localhost:${PORT}/driver             ║
║  - Admin:    http://localhost:${PORT}/admin              ║
║  - Fleet:    http://localhost:${PORT}/fleet-manager.html ║
╠════════════════════════════════════════════════════════════╣
║  API Endpoints:                                        ║
║  - Health:   http://localhost:${PORT}/health             ║
║  - Config:   http://localhost:${PORT}/api/config         ║
║  - Riders:   http://localhost:${PORT}/api/riders         ║
║  - WebSocket: ws://localhost:${PORT}/ws                  ║
║  - Swagger:  http://localhost:${PORT}/api-docs           ║
╚════════════════════════════════════════════════════════════╝\n`);
      logger.info('✓ WebSocket server active - Real-time rider tracking enabled\n');
    });
    server.on('error', (err) => logger.error('Server listen error:', err));
  } else {
    logger.info(`Worker ${process.env.NODE_APP_INSTANCE} ready (PM2 cluster mode)`);
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
        if (db && data.latitude && data.longitude) {
          await db.update('riders', ws.userId, {
            location: new admin.firestore.GeoPoint(data.latitude, data.longitude),
            lastLocationUpdate: new Date().toISOString(),
            isOnline: true
          });
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
  
  startOrdersListener(db, broadcastToAdmins);
  startRidersListener(db, broadcastToAdmins);
}

// ─── Graceful Shutdown ────────────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  
  if (wss) {
    wss.clients.forEach(ws => ws.close());
    logger.info('WebSocket connections closed');
  }
  
  await shutdownListeners();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Unhandled Error Handlers ──────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection (recovered):', { error: reason && reason.stack ? reason.stack : String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception (recovered):', { error: err && err.stack ? err.stack : String(err) });
});

// ─── Startup ───────────────────────────────────────────────────────
async function main() {
  await initializeFirebase();
  startRealtimeServer();
}

if (require.main === module) {
  main().catch(err => {
    logger.error('Startup failed:', err);
    process.exit(1);
  });
}

module.exports = { app, startRealtimeServer, getDb: () => db };