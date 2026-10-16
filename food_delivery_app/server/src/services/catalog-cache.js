const caches = new WeakMap();
const responses = new WeakMap();
const zlib = require('zlib');
const crypto = require('crypto');
const TTL = 60 * 1000;
async function catalogRows(db, collection) {
  let cache = caches.get(db);
  if (!cache) caches.set(db, cache = new Map());
  const prior = cache.get(collection);
  if (prior?.value && prior.expires > Date.now()) return prior.value;
  if (prior?.pending) return prior.pending;
  const entry = { value: prior?.value, expires: prior?.expires || 0 };
  entry.pending = Promise.resolve().then(() => db.getAll(collection)).then(rows => {
    entry.value = rows || []; entry.expires = Date.now() + TTL; return entry.value;
  }).finally(() => { entry.pending = null; });
  cache.set(collection, entry);
  return entry.pending;
}
function invalidateCatalog(db, collection) { caches.get(db)?.delete(collection); responses.delete(db); }
// Public catalogue responses are identical between callers. Serialize and gzip
// once per representation instead of queuing zlib work for every cache hit.
function sendCatalog(req, res, db, data) {
  let cache = responses.get(db);
  if (!cache) responses.set(db, cache = new Map());
  const native = req.query.per_page != null || /okhttp/i.test(req.headers['user-agent'] || '');
  const key = req.originalUrl + (native ? ':native' : ':web');
  let entry = cache.get(key);
  if (!entry || entry.expires < Date.now()) {
    const json = Buffer.from(JSON.stringify(data));
    entry = { json, gzip: zlib.gzipSync(json, { level: 1 }), etag: 'W/"' + crypto.createHash('sha256').update(json).digest('hex') + '"', expires: Date.now() + TTL };
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, entry);
  }
  res.vary('Accept-Encoding'); res.vary('User-Agent');
  res.type('application/json'); res.setHeader('ETag', entry.etag);
  if (req.acceptsEncodings('gzip')) { res.setHeader('Content-Encoding', 'gzip'); return res.send(entry.gzip); }
  return res.send(entry.json);
}
module.exports = { catalogRows, invalidateCatalog, sendCatalog };
