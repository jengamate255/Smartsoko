require('dotenv').config({ path: __dirname + '/.env' });
console.log('1. dotenv loaded');

const { logger } = require('./server/src/config/logger');
console.log('2. logger loaded');

const admin = require('firebase-admin');
console.log('3. firebase-admin loaded');

const { createDualDb } = require('./lib/server-db');
console.log('4. server-db loaded');

console.log('5. Creating db...');
const db = createDualDb(null);
console.log('6. db created');

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
console.log('7. express and middleware loaded');

const app = express();
console.log('8. express app created');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
console.log('9. PORT and NODE_ENV set:', PORT, NODE_ENV);

// Make db / config / admin available to route modules
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
    set: (collection, id, data) => proxy.collection(collection).doc(id).set(data, { merge: true }),
    delete: (collection, id) => proxy.collection(collection).doc(id).delete(),
    getAll: async (collection) => {
      const snap = await proxy.collection(collection).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  };
}

app.set('db', makeRouteDb(db));
app.set('config', { deliveryFee: 2000, taxRate: 0.18, currency: 'TZS' });
app.set('admin', admin);
console.log('10. app.set done');

app.set('trust proxy', 1);
console.log('11. trust proxy set');

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 
           `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});
console.log('12. Request ID middleware added');

// API versioning
const API_VERSION = 'v1';
const apiRouter = express.Router();
app.use(`/api/${API_VERSION}`, apiRouter);
console.log('13. API versioning added');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
console.log('14. helmet added');

app.use(compression());
console.log('15. compression added');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('16. body parsers added');

// Load rate limiter
const { mountRateLimiters } = require('./server/src/middleware/rate-limiter');
console.log('17. rate-limiter loaded');

// Load features router
const featuresRouter = require('./server/src/routes/features');
console.log('18. features router loaded');

app.use(mountRateLimiters);
console.log('19. mountRateLimiters added');

app.use(featuresRouter);
console.log('20. featuresRouter added');

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));
console.log('21. static files added');

// AI Product Agent routes
const aiProductAgentRoutes = require('./server/src/routes/ai/product-agent');
app.use('/ai', aiProductAgentRoutes);
console.log('22. ai/product-agent added');

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: NODE_ENV,
    firebase: db ? 'connected' : 'supabase-only'
  });
});
console.log('23. health endpoint added');

// Extensionless HTML routes
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
console.log('24. HTML routes added');

// API config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    firebase: !!db,
    mapbox: !!process.env.MAPBOX_TOKEN,
    pesapal: !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
    sentry: !!process.env.SENTRY_DSN
  });
});
console.log('25. api/config added');

const server = require('http').createServer(app);
console.log('26. HTTP server created');

server.listen(PORT, '0.0.0.0', () => {
  console.log('27. Server listening on port', PORT);
});
console.log('28. listen() called');