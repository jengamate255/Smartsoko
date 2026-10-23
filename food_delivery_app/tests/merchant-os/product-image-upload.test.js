/**
 * Product image upload endpoint — POST /api/merchant/products/images
 *
 * The products API refuses inline base64 (merchant.js isInlineImage, 8 KB cap),
 * so the browser needs a place to hand the file over and get a URL back.
 * The storage client is injected at mount time so no test touches Supabase.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import http from 'node:http';

let express, mountMerchantOs;
const servers = new Set();
beforeAll(async () => {
  express = (await import('express')).default;
  ({ mountMerchantOs } = await import('../../server/src/routes/merchant.js'));
}, 30000);
afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
  servers.clear();
});

function stubVerifyToken(req, res, next) {
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'no token' });
  }
  const parts = hdr.slice(7).split(':');
  req.user = {
    uid: parts[1],
    role: parts[3] || 'customer',
    sellerId: parts[5] === 'none' ? undefined : parts[5],
    email: parts[1] + '@test.tz',
  };
  next();
}

function memoryDb(seed = {}) {
  const store = JSON.parse(JSON.stringify(seed));
  return {
    async getAll(col) { return store[col] || []; },
    async get(col, id) { return (store[col] || []).find((d) => d.id === id) || null; },
    async add(col, data) {
      const id = col.slice(0, 2) + '-' + Math.random().toString(36).slice(2, 8);
      (store[col] = store[col] || []).push({ id, ...data });
      return { id };
    },
    async update(col, id, patch) {
      const doc = (store[col] || []).find((d) => d.id === id);
      if (doc) Object.assign(doc, patch);
      return doc;
    },
    async where(col, f, op, v) { return (store[col] || []).filter((d) => d[f] === v); },
  };
}

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function fakeStore() {
  const calls = [];
  return {
    calls,
    async upload({ merchantId, buffer, mimeType }) {
      calls.push({ merchantId, bytes: buffer.length, mimeType });
      return { url: `https://storage.test/v1/object/public/product-images/products/${merchantId}/${Date.now()}.png` };
    },
  };
}

async function makeApp({ imageStore, seed = {} }) {
  const app = express();
  app.use(express.json());
  app.set('db', memoryDb(seed));
  mountMerchantOs(app, { authMiddleware: stubVerifyToken, imageStore });
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  return app;
}

function auth(uid, role, seller) {
  return { Authorization: `Bearer uid:${uid}:role:${role}:seller:${seller}` };
}

function buildServer(app) {
  const server = http.createServer(app);
  servers.add(server);
  return server;
}

function req(server, method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const start = () => {
      const payload = body ? JSON.stringify(body) : null;
      const r = http.request(
        {
          host: '127.0.0.1',
          port: server.address().port,
          method, path,
          headers: {
            ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
            ...headers,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            let parsed = null;
            try { parsed = JSON.parse(raw); } catch (_) {}
            resolve({ status: res.statusCode, body: parsed || {} });
          });
        }
      );
      r.on('error', reject);
      if (payload) r.write(payload);
      r.end();
    };
    if (server.listening) start();
    else server.listen(0, '127.0.0.1', start);
  });
}

function close(server) { if (server.listening) server.close(); }

describe('POST /api/merchant/products/images', () => {
  it('stores the decoded bytes and returns a public URL', async () => {
    const store = fakeStore();
    const server = buildServer(await makeApp({ imageStore: store }));
    const res = await req(server, 'POST', '/api/merchant/products/images', auth('uA', 'merchant', 'S-A'), { image: PNG_1PX });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^https:\/\/storage\.test\/.*product-images\/products\/S-A\//);
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].mimeType).toBe('image/png');
    expect(store.calls[0].merchantId).toBe('S-A');
    // The base64 above decodes to a 70-byte PNG.
    expect(store.calls[0].bytes).toBe(70);
    close(server);
  });

  it('refuses anything that is not a jpeg/png/webp data URL', async () => {
    const store = fakeStore();
    const server = buildServer(await makeApp({ imageStore: store }));
    const a = auth('uA', 'merchant', 'S-A');

    for (const image of ['', 'not-an-image', 'https://cdn.test/a.jpg', 'data:image/gif;base64,R0lGODdh', 'data:text/plain;base64,AAA=']) {
      const res = await req(server, 'POST', '/api/merchant/products/images', a, { image });
      expect(res.status, image).toBe(400);
    }
    expect(store.calls).toHaveLength(0);
    close(server);
  });

  it('refuses a data URL whose payload is empty', async () => {
    const store = fakeStore();
    const server = buildServer(await makeApp({ imageStore: store }));
    const res = await req(server, 'POST', '/api/merchant/products/images', auth('uA', 'merchant', 'S-A'), { image: 'data:image/jpeg;base64,' });
    expect(res.status).toBe(400);
    expect(store.calls).toHaveLength(0);
    close(server);
  });

  it('requires the products.write capability', async () => {
    const store = fakeStore();
    const server = buildServer(await makeApp({ imageStore: store }));
    const res = await req(server, 'POST', '/api/merchant/products/images', auth('staff', 'sales', 'S-A'), { image: PNG_1PX });
    expect(res.status).toBe(403);
    expect(store.calls).toHaveLength(0);
    close(server);
  });

  it('401s without a token', async () => {
    const store = fakeStore();
    const server = buildServer(await makeApp({ imageStore: store }));
    const res = await req(server, 'POST', '/api/merchant/products/images', {}, { image: PNG_1PX });
    expect(res.status).toBe(401);
    close(server);
  });

  it('reports a storage failure as a 502 instead of a fake success', async () => {
    const server = buildServer(await makeApp({
      imageStore: { async upload() { throw new Error('bucket unavailable'); } },
    }));
    const res = await req(server, 'POST', '/api/merchant/products/images', auth('uA', 'merchant', 'S-A'), { image: PNG_1PX });
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    close(server);
  });
});
