/**
 * Rate Limiting & API Caching Middleware
 * Tiered rate limiters and in-memory cache for GET endpoints.
 */

const rateLimit = require('express-rate-limit');

// ─── Tiered Rate Limiters ────────────────────────────────────────────
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
// Client telemetry/logging (fire-and-forget from browser - high tolerance, still bounded)
const clientLogLimiter = createLimiter(60 * 1000, 120, 'Too many log submissions.');

/**
 * Mount the tiered rate limiters on an Express app.
 * @param {import('express').Express} app
 */
function mountRateLimiters(app) {
  app.use('/api/v1/auth/', authLimiter);
  app.use('/api/v1/', apiLimiter);
  app.use('/health', publicLimiter);
  app.use('/api/health', publicLimiter);
  app.use('/api/status', publicLimiter);
  app.use('/api/config', publicLimiter);
}

// ─── In-memory API Cache ─────────────────────────────────────────────
const apiCache = new Map();
const CACHE_TTL = 60 * 1000;

// Periodic cache cleanup every 5 minutes
setInterval(function() {
  var now = Date.now();
  for (var [key, entry] of apiCache) {
    if ((now - entry.timestamp) > CACHE_TTL * 2) apiCache.delete(key);
  }
}, 300000).unref();

/**
 * Invalidate cache entries matching a glob-like pattern.
 * @param {string} pattern
 */
function invalidateCache(pattern) {
  var escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  var regex = new RegExp('^' + escaped + '$');
  for (var [key] of apiCache) {
    if (regex.test(key)) apiCache.delete(key);
  }
}

/**
 * Express middleware: in-memory cache for GET endpoints.
 * @param {number} [duration] - Cache TTL in ms (defaults to CACHE_TTL)
 */
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

/**
 * Set Cache-Control header on GET responses for browser caching.
 * @param {number} maxAgeSeconds
 * @param {number} [staleWhileRevalidate]
 */
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

module.exports = {
  authLimiter,
  apiLimiter,
  publicLimiter,
  clientLogLimiter,
  mountRateLimiters,
  invalidateCache,
  cacheApiResponse,
  setAPICacheControl,
};
