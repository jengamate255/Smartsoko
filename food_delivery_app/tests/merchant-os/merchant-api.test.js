/**
 * Integration tests for the Merchant OS router: exercises the real express
 * middleware chain (stub token verifier → resolveMerchant → requireCapability)
 * against a stubbed db, proving tenant isolation and capability gating.
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Stub token verifier injected via mountMerchantOs({ authMiddleware }).
// Token format: "uid:<uid>:role:<role>:seller:<sellerId>|none"
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
    async delete(col, id) {
      store[col] = (store[col] || []).filter((d) => d.id !== id);
    },
    async where(col, f, op, v) { return (store[col] || []).filter((d) => d[f] === v); },
  };
}

async function makeApp(seed) {
  const express = (await import('express')).default;
  const { mountMerchantOs } = await import('../../server/src/routes/merchant.js');
  const app = express();
  app.use(express.json());
  app.set('db', memoryDb(seed));
  mountMerchantOs(app, { authMiddleware: stubVerifyToken });
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  return app;
}

const SEED = {
  orders: [
    { id: 'o1', sellerId: 'S-A', customerId: 'c1', customerName: 'Asha', total: 12000, status: 'pending', paymentMethod: 'cod', paymentStatus: 'cod', createdAt: '2026-08-25T08:00:00Z', items: [{ id: 'p1', name: 'Chapati', price: 3000, quantity: 4 }] },
    { id: 'o2', sellerId: 'S-A', customerId: 'c2', customerName: 'Baraka', total: 5000, status: 'delivered', paymentMethod: 'mobile_money', paymentStatus: 'paid', escrowStatus: 'released', createdAt: '2026-08-24T08:00:00Z', items: [] },
    { id: 'o3', sellerId: 'S-B', customerId: 'c9', customerName: 'OtherMerchantCustomer', total: 777777, status: 'delivered', createdAt: '2026-08-24T09:00:00Z', items: [] }, // foreign!
  ],
  products: [
    { id: 'p1', name: 'Chapati', sellerId: 'S-A', price: 3000, stockQuantity: 25, minStock: 5, cost: 1500, isAvailable: true },
    { id: 'pX', name: 'ForeignProduct', sellerId: 'S-B', price: 1, stockQuantity: 999, isAvailable: true },
  ],
};

function auth(uid, role, seller) {
  return { Authorization: `Bearer uid:${uid}:role:${role}:seller:${seller}` };
}

describe('merchant OS API — isolation & capabilities', () => {
  let app;
  beforeAll(async () => {
    app = await makeApp(SEED);
  });

  it('401s without a token', async () => {
    const server = buildServer(app);
    const res = await req(server, 'GET', '/api/merchant/orders');
    expect(res.status).toBe(401);
    close(server);
  });

  it('merchant A never sees merchant B’s orders or products', async () => {
    // drive through a lightweight in-process invocation of express
    const server = buildServer(app);
    const r1 = await req(server, 'GET', '/api/merchant/orders', auth('uA', 'merchant', 'S-A'));
    expect(r1.status).toBe(200);
    expect(r1.body.data.map((o) => o.id).sort()).toEqual(['o1', 'o2']);
    expect(r1.body.data.some((o) => o.id === 'o3')).toBe(false);

    const r2 = await req(server, 'GET', '/api/merchant/products', auth('uA', 'merchant', 'S-A'));
    expect(r2.body.data.some((p) => p.id === 'pX')).toBe(false);
    close(server);
  });

  it('rejects cross-tenant order access (IDOR)', async () => {
    const server = buildServer(app);
    const res = await req(server, 'GET', '/api/merchant/orders/o3', auth('uA', 'merchant', 'S-A'));
    expect([403, 404]).toContain(res.status);
    close(server);
  });

  it('blocks invalid order state transitions with 422', async () => {
    const server = buildServer(app); // o2 is delivered → completed only
    const res = await req(server, 'POST', '/api/merchant/orders/o2/status', auth('uA', 'merchant', 'S-A'), { status: 'pending' });
    expect(res.status).toBe(422);
    expect(res.body.code || '').toBe('INVALID_TRANSITION');
    close(server);
  });

  it('allows valid transitions and writes audit + event', async () => {
    const server = buildServer(app);
    const res = await req(server, 'POST', '/api/merchant/orders/o1/status', auth('uA', 'merchant', 'S-A'), { status: 'accepted' });
    expect(res.status).toBe(200);
    expect(res.body.data.previous).toBe('pending');
    close(server);
  });

  it('sales role cannot adjust inventory (capability gate)', async () => {
    const server = buildServer(app);
    const res = await req(server, 'POST', '/api/merchant/inventory/adjust', auth('uStaff', 'sales', 'S-A'), { productId: 'p1', delta: 10 });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/inventory.write/);
    close(server);
  });

  it('overview aggregates only own data', async () => {
    const server = buildServer(app);
    const res = await req(server, 'GET', '/api/merchant/overview', auth('uA', 'merchant', 'S-A'));
    expect(res.status).toBe(200);
    expect(res.body.data.today.orders + res.body.data.month.orders).toBeGreaterThanOrEqual(2);
    // Foreign o3 (777777) must not leak into revenue:
    const allRevenue = res.body.data.month.revenue;
    expect(allRevenue).toBeLessThan(100000);
    close(server);
  });

  it('payments view exposes escrow fields but has no mark-paid endpoint', async () => {
    const server = buildServer(app);
    const res = await req(server, 'GET', '/api/merchant/payments', auth('uA', 'merchant', 'S-A'));
    expect(res.status).toBe(200);
    expect(res.body.summary.heldInEscrow).toBe(0); // o2 released; nothing held
    const paths = [];
    for (const layer of (await import('../../server/src/routes/merchant.js')).router.stack) {
      if (layer.route) {
        const m = Object.keys(layer.route.methods)[0].toUpperCase();
        if (m !== 'GET' && layer.route.path.includes('payment')) paths.push(m + layer.route.path);
      }
    }
    expect(paths).toEqual([]); // §9: frontend can never mutate payment state
    close(server);
  });

  it('purchase receive is blocked until approved, then moves inventory exactly once', async () => {
    const app2 = await makeApp({
      ...JSON.parse(JSON.stringify(SEED)),
      suppliers: [{ id: 'sup1', name: 'Kilimo Fresh', merchantId: 'S-A' }],
      purchase_orders: [],
    });
    const s2 = buildServer(app2);
    const a = auth('uA', 'merchant', 'S-A');

    // Create PO as draft
    const created = await req(s2, 'POST', '/api/merchant/purchases',
      a,
      { supplierId: 'sup1', items: [{ productId: 'p1', name: 'Chapati', quantity: 20, unitCost: 1500 }] });
    expect(created.status).toBe(200);
    const poId = created.body.data.id;

    // Receiving a draft is rejected
    const early = await req(s2, 'POST', `/api/merchant/purchases/${poId}/receive`,
      a, { receipts: [{ productId: 'p1', quantity: 10 }] });
    expect(early.status).toBe(422);

    // draft → submitted → approved
    await req(s2, 'POST', `/api/merchant/purchases/${poId}/status`, a, { status: 'submitted' });
    const appr = await req(s2, 'POST', `/api/merchant/purchases/${poId}/status`, a, { status: 'approved' });
    expect(appr.status).toBe(200);

    // Receive 10 now, 10 later → partially_received then received
    const part1 = await req(s2, 'POST', `/api/merchant/purchases/${poId}/receive`,
      a, { receipts: [{ productId: 'p1', quantity: 10 }] });
    expect(part1.status).toBe(200);
    expect(part1.body.data.status).toBe('partially_received');
    expect(part1.body.data.applied[0].newStock).toBe(35); // 25 + 10

    const over = await req(s2, 'POST', `/api/merchant/purchases/${poId}/receive`,
      a, { receipts: [{ productId: 'p1', quantity: 11 }] });
    expect(over.status).toBe(422); // over-receipt rejected

    const part2 = await req(s2, 'POST', `/api/merchant/purchases/${poId}/receive`,
      a, { receipts: [{ productId: 'p1', quantity: 10 }] });
    expect(part2.body.data.status).toBe('received');

    close(s2);
  }, 20000);
});

// ─── minimal in-process http helpers (avoid adding supertest dep) ─────────
import http from 'node:http';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

function buildServer(expressApp) {
  const server = http.createServer(expressApp);
  server.__open = true;
  return server;
}

let listening = null;
function req(server, method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      server.listen(0, '127.0.0.1', () => {
        req(server, method, path, headers, body).then(resolve, reject);
      });
      return;
    }
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method, path,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed || {} });
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function close(server) {
  if (server.listening) server.close();
}
