const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { sendError } = require('../utils/api-messages');

// Exclusive file creation serializes reservations across Node workers on this
// host. Keep this server-only directory on persistent storage when restarting.
// Multiple hosts must share a lock-capable filesystem or use a database store.
class IdempotencyStore {
  constructor(directory = process.env.IDEMPOTENCY_DIR || path.resolve(__dirname, '../../../.runtime/idempotency')) {
    this.directory = directory;
    this.ttl = config.idempotency.ttl;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  file(key) { return path.join(this.directory, crypto.createHash('sha256').update(key).digest('hex') + '.json'); }
  read(key) {
    try { return JSON.parse(fs.readFileSync(this.file(key), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  claim(key, fingerprint) {
    // Do not remove an existing reservation: even an expired pending request
    // may have committed its order before its process died.
    const entry = { fingerprint, state: 'pending', expiresAt: Date.now() + this.ttl };
    let fd;
    try { fd = fs.openSync(this.file(key), 'wx', 0o600); }
    catch (e) { if (e.code === 'EEXIST') return { claimed: false, entry: this.read(key) }; throw e; }
    try { fs.writeFileSync(fd, JSON.stringify(entry)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    return { claimed: true, entry };
  }
  complete(key, entry, status, body) {
    const target = this.file(key);
    const temp = target + '.' + crypto.randomUUID() + '.tmp';
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify({ ...entry, state: 'complete', status, body })); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temp, target);
  }
  release(key) { try { fs.unlinkSync(this.file(key)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  async get(key) { const e = this.read(key); return e && e.state === 'complete' ? e.body : null; }
  async has(key) { return !!this.read(key); }
  close() {} // Persistence intentionally survives process shutdown.
}
let storeInstance;
function getStore() { return storeInstance || (storeInstance = new IdempotencyStore()); }
function generateKey(req) {
  const principal = req.user?.uid || req.ip || 'anonymous';
  const supplied = req.headers[config.idempotency.header.toLowerCase()];
  const body = crypto.createHash('sha256').update(JSON.stringify([req.body, req.idempotencyScope || null])).digest('hex');
  return JSON.stringify([principal, req.method, req.path.replace('/api/v1/', '/api/'), supplied || body]);
}
const idempotency = (options = {}) => (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  try {
    const supplied = req.headers[config.idempotency.header.toLowerCase()];
    if (supplied && (typeof supplied !== 'string' || supplied.length > 200)) return sendError(res, req, 400, 'IDEMPOTENCY_KEY_INVALID');
    const store = options.store || getStore();
    const key = generateKey(req);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([req.body, supplied ? null : (req.idempotencyScope || null)])).digest('hex');
    const { claimed, entry } = store.claim(key, fingerprint);
    if (!claimed) {
      if (!entry || entry.fingerprint !== fingerprint) return sendError(res, req, 409, 'IDEMPOTENCY_KEY_CONFLICT');
      if (entry.state === 'complete') {
        res.setHeader('Idempotency-Replayed', 'true');
        return res.status(entry.status).json(entry.body);
      }
      res.setHeader('Retry-After', '2');
      return sendError(res, req, 409, 'IDEMPOTENCY_IN_PROGRESS');
    }
    const originalJson = res.json.bind(res);
    res.json = body => {
      if (res.statusCode >= 200 && res.statusCode < 300) store.complete(key, entry, res.statusCode, body);
      // A 5xx/disconnect may follow a committed write. Retain its reservation
      // rather than letting a retry create a second order.
      else if (res.statusCode < 500 || req.idempotencySafeToRetry === true) store.release(key);
      return originalJson(body);
    };
    return next();
  } catch (error) {
    console.error('Idempotency storage error:', error.message);
    return sendError(res, req, 503, 'IDEMPOTENCY_UNAVAILABLE');
  }
};
module.exports = { idempotency, getStore, generateKey, IdempotencyStore };
