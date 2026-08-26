/**
 * Merchant OS API — /api/merchant/*
 *
 * Every route is tenant-isolated: req.merchantId is resolved server-side from
 * the verified token (never from the request). Capabilities gate each domain.
 * Domains: overview, orders, products, inventory, customers, payments,
 *          suppliers, purchases, expenses, staff, notifications, settings.
 */
'use strict';

const express = require('express');
const {
  requireCapability, resolveMerchant, hasCapability, effectiveCapabilities,
} = require('../middleware/capabilities');
const stateMachine = require('../services/order-state-machine');
const ledger = require('../services/inventory-ledger');
const analytics = require('../services/analytics-service');
const eventBus = require('../services/event-bus');
const { recordAudit } = require('../services/audit');

// Auth middleware is injected at mount time (mountMerchantOs) so tests can
// substitute a stub verifier without patching Firebase internals. Dispatched
// lazily per-request because route chains below are built at module load.
let authTokenMiddleware = (req, res, next) => {
  try {
    require('../middleware/auth').verifyToken(req, res, next);
  } catch (e) {
    next(e);
  }
};

const router = express.Router();

// ─── helpers ───────────────────────────────────────────────────────
function getDb(req) { return req.app.get('db'); }
function getAdmin(req) { return req.app.get('admin'); }

async function listAll(db, collection) {
  try { return (await db.getAll(collection)) || []; } catch (_) { return []; }
}

/** Middleware chain factory: auth → resolve merchant → capability. */
function guard(capability) {
  const cap = requireCapability(capability);
  const authGate = (req, res, next) => authTokenMiddleware(req, res, next);
  return [authGate, async (req, res, next) => {
    if (!req.merchantId) {
      req.merchantId = await resolveMerchant(getDb(req), getAdmin(req), req);
    }
    // Owning the store confers owner capabilities WITHIN this tenant.
    // Sellers whose docs are keyed by UUID (ownerId field) resolve as
    // 'customer' in the platform role lookup — upgrade them here so the
    // capability check sees the truth. Platform staff roles (sales,
    // inventory, accountant, delivery) already carry their own capability
    // sets and must NEVER be upgraded — owning lookup must not leak owner
    // powers onto staff accounts.
    const STAFF_ROLES = ['sales', 'inventory', 'accountant', 'delivery'];
    if (req.merchantId && !['merchant', 'admin', 'super_admin'].includes(req.user.role)
        && !STAFF_ROLES.includes(req.user.role)) {
      req.user.role = 'merchant';
    }
    next();
  }, cap];
}

function fail(res, status, error, code) {
  return res.status(status).json({ success: false, error, ...(code ? { code } : {}) });
}

function parseRange(query) {
  return {
    from: query.from || null,
    to: query.to || null,
  };
}

// ═══════════════════════════════ OVERVIEW ═══════════════════════════════

router.get('/overview', ...guard('reports.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const mid = req.merchantId;
    const [orders, products, expenses] = await Promise.all([
      listAll(db, 'orders'), listAll(db, 'products'), listAll(db, 'expenses'),
    ]);

    // Tenant filter server-side. Orders may carry sellerId or merchantId.
    const myOrders = orders.filter((o) => o.sellerId === mid || o.merchantId === mid);
    const myProducts = products.filter((p) => p.sellerId === mid || p.merchantId === mid);

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayRange = { from: startOfDay.toISOString() };

    const today = analytics.summarizeOrders(myOrders, todayRange);
    const month = analytics.summarizeOrders(myOrders, {
      from: new Date(Date.now() - 30 * 86400000).toISOString(),
    });

    const pendingOrders = myOrders.filter((o) =>
      ['pending', 'accepted', 'preparing'].includes(o.status || 'pending')).length;

    const lowStockProducts = myProducts.filter((p) => {
      const q = Number(p.stockQuantity); if (!Number.isFinite(q)) return false;
      return q <= Number(p.minStock ?? 5);
    });
    const outOfStock = myProducts.filter((p) => Number(p.stockQuantity) === 0);

    // Outstanding payments = non-cod orders not yet paid
    const outstandingPayments = myOrders.filter((o) =>
      o.paymentMethod !== 'cod' &&
      !['paid', 'completed', 'released'].includes(o.paymentStatus || '') &&
      !['cancelled', 'refunded'].includes(o.status || ''));

    const netToday = analytics.netProfit(today, expenses, todayRange);

    res.json({
      success: true,
      data: {
        today: { ...today, netProfit: netToday.netProfit },
        month,
        pendingOrders,
        lowStock: lowStockProducts.slice(0, 10).map((p) => ({
          id: p.id, name: p.name || p.title, stockQuantity: p.stockQuantity, minStock: p.minStock ?? 5,
        })),
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStock.length,
        customersMonth: month.customers,
        outstandingPayments: { count: outstandingPayments.length, total: Math.round(outstandingPayments.reduce((s, o) => s + (Number(o.total) || 0), 0)) },
        salesTrend: analytics.dailySeries(myOrders, 14),
        topProducts: analytics.topProducts(myOrders, 5),
        recentOrders: myOrders
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          .slice(0, 8)
          .map(({ id, customerName, total, status, createdAt }) => ({ id, customerName, total, status, createdAt })),
        alerts: buildAlerts(pendingOrders, lowStockProducts.length, outOfStock.length, outstandingPayments.length),
      },
    });
  } catch (e) { fail(res, 500, e.message); }
});

function buildAlerts(pending, low, out, outstanding) {
  const alerts = [];
  if (pending > 0) alerts.push({ type: 'orders', severity: pending > 5 ? 'high' : 'medium', message: `${pending} order(s) awaiting action` });
  if (out > 0) alerts.push({ type: 'stock', severity: 'high', message: `${out} product(s) out of stock` });
  else if (low > 0) alerts.push({ type: 'stock', severity: 'low', message: `${low} product(s) low on stock` });
  if (outstanding > 0) alerts.push({ type: 'payments', severity: 'medium', message: `${outstanding} payment(s) pending confirmation` });
  return alerts;
}

// ═══════════════════════════════ ORDERS ═══════════════════════════════

router.get('/orders', ...guard('orders.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const orders = await listAll(db, 'orders');
    const mine = orders.filter((o) => o.sellerId === req.merchantId || o.merchantId === req.merchantId);

    let out = mine;
    if (req.query.status && req.query.status !== 'all') {
      out = out.filter((o) => (o.status || 'pending') === req.query.status);
    }
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      out = out.filter((o) =>
        String(o.customerName || '').toLowerCase().includes(q) ||
        String(o.paymentRef || '').toLowerCase().includes(q) ||
        String(o.id || '').toLowerCase().includes(q));
    }
    out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    res.json({
      success: true,
      data: out.slice(0, limit),
      counts: stateMachine.ORDER_STATUSES.reduce((acc, s) => {
        acc[s] = mine.filter((o) => (o.status || 'pending') === s).length; return acc;
      }, {}),
      allowedTransitionsHint: Object.fromEntries(
        out.slice(0, limit).map((o) => [o.id, stateMachine.allowedNextStatuses(o.status || 'pending')])
      ),
    });
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/orders/:orderId', ...guard('orders.read'), async (req, res) => {
  try {
    const order = await getDb(req).get('orders', req.params.orderId);
    if (!order) return fail(res, 404, 'Order not found');
    if (order.sellerId !== req.merchantId && order.merchantId !== req.merchantId) {
      return fail(res, 403, 'Not your order'); // IDOR guard §27
    }
    res.json({ success: true, data: order, allowedNextStatuses: stateMachine.allowedNextStatuses(order.status || 'pending') });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/orders/:orderId/status', ...guard('orders.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const order = await db.get('orders', req.params.orderId);
    if (!order) return fail(res, 404, 'Order not found');
    if (order.sellerId !== req.merchantId && order.merchantId !== req.merchantId) {
      return fail(res, 403, 'Not your order');
    }

    const to = String(req.body && req.body.status || '');
    const from = order.status || 'pending';
    try { stateMachine.assertTransition(from, to); } catch (e) {
      return fail(res, 422, e.message, 'INVALID_TRANSITION');
    }

    const now = new Date().toISOString();
    await db.update('orders', req.params.orderId, {
      status: to, updatedAt: now, [`statusTimestamps.${to}`]: now,
      ...(to === 'cancelled' ? { cancelledBy: req.user.uid } : {}),
    });

    await recordAudit(db, {
      actorId: req.user.uid, actorEmail: req.user.email,
      action: 'order.status_changed', resourceType: 'order', resourceId: req.params.orderId,
      merchantId: req.merchantId, before: { status: from }, after: { status: to }, req,
    });
    eventBus.publish(eventBus.EVENTS.ORDER_STATUS_CHANGED, {
      merchantId: req.merchantId, data: { orderId: req.params.orderId, from, to },
    });
    if (to === 'cancelled') eventBus.publish(eventBus.EVENTS.ORDER_CANCELLED, {
      merchantId: req.merchantId, data: { orderId: req.params.orderId },
    });

    res.json({ success: true, data: { id: req.params.orderId, status: to, previous: from, allowedNextStatuses: stateMachine.allowedNextStatuses(to) } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ PRODUCTS ═══════════════════════════════

router.get('/products', ...guard('products.read'), async (req, res) => {
  try {
    const products = await listAll(getDb(req), 'products');
    let mine = products.filter((p) => p.sellerId === req.merchantId || p.merchantId === req.merchantId);

    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      mine = mine.filter((p) => String(p.name || p.title || '').toLowerCase().includes(q));
    }
    if (req.query.category) mine = mine.filter((p) => p.category === req.query.category);
    if (req.query.status === 'available') mine = mine.filter((p) => p.isAvailable !== false);
    if (req.query.status === 'hidden') mine = mine.filter((p) => p.isAvailable === false);

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    res.json({
      success: true,
      data: mine.slice(0, limit).map(normalizeProduct),
      total: mine.length,
      categories: [...new Set(mine.map((p) => p.category).filter(Boolean))].sort(),
    });
  } catch (e) { fail(res, 500, e.message); }
});

function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name || p.title || 'Unnamed',
    description: p.description || '',
    price: Number(p.price ?? p.salePrice ?? 0),
    cost: p.cost != null ? Number(p.cost) : null,
    sku: p.sku || '',
    barcode: p.barcode || '',
    category: p.category || 'other',
    image: p.image || p.imageUrl || '',
    stockQuantity: Number(p.stockQuantity ?? 0),
    minStock: p.minStock != null ? Number(p.minStock) : 5,
    isAvailable: p.isAvailable !== false,
    popular: Boolean(p.popular),
    createdAt: p.createdAt || null,
    sellerId: p.sellerId || p.merchantId || null,
  };
}

function validateProductInput(body) {
  const errors = [];
  const name = String(body.name || '').trim();
  if (!name) errors.push('name is required');
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) errors.push('price must be a non-negative number');
  if (body.cost != null && body.cost !== '' && !Number.isFinite(Number(body.cost))) errors.push('cost must be a number');
  return { errors, name, price, cost: body.cost === '' || body.cost == null ? null : Number(body.cost) };
}

router.post('/products', ...guard('products.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const { errors, name, price, cost } = validateProductInput(req.body || {});
    if (errors.length) return fail(res, 400, errors.join('; '));

    const doc = {
      name, price, cost,
      description: String(req.body.description || ''),
      category: String(req.body.category || 'other'),
      image: String(req.body.image || ''),
      sku: String(req.body.sku || ''),
      barcode: String(req.body.barcode || ''),
      sellerId: req.merchantId,
      merchantId: req.merchantId,
      isAvailable: req.body.isAvailable !== false,
      stockQuantity: Number(req.body.stockQuantity ?? 0),
      minStock: Number(req.body.minStock ?? 5),
      createdAt: new Date().toISOString(),
    };
    const ref = await db.add('products', doc);

    // Opening stock goes through the ledger for auditability
    if (doc.stockQuantity > 0) {
      await ledger.applyMovement(db, getAdmin(req), {
        merchantId: req.merchantId, productId: ref.id,
        delta: doc.stockQuantity, type: 'adjustment',
        reason: 'opening stock', actorId: req.user.uid,
      });
    }

    await recordAudit(db, {
      actorId: req.user.uid, actorEmail: req.user.email,
      action: 'product.created', resourceType: 'product', resourceId: ref.id,
      merchantId: req.merchantId, after: { name, price }, req,
    });
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/products/:productId', ...guard('products.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const existing = await db.get('products', req.params.productId);
    if (!existing) return fail(res, 404, 'Product not found');
    if (existing.sellerId !== req.merchantId && existing.merchantId !== req.merchantId) {
      return fail(res, 403, 'Not your product');
    }

    const patch = {};
    if (req.body.name != null) patch.name = String(req.body.name).trim();
    if (req.body.description != null) patch.description = String(req.body.description);
    if (req.body.category != null) patch.category = String(req.body.category);
    if (req.body.image != null) patch.image = String(req.body.image);
    if (req.body.sku != null) patch.sku = String(req.body.sku);
    if (req.body.barcode != null) patch.barcode = String(req.body.barcode);
    if (req.body.isAvailable != null) patch.isAvailable = Boolean(req.body.isAvailable);
    if (req.body.minStock != null) patch.minStock = Number(req.body.minStock);
    if (req.body.price != null) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) return fail(res, 400, 'price must be a non-negative number');
      patch.price = price;
    }
    if (req.body.cost != null) patch.cost = req.body.cost === '' ? null : Number(req.body.cost);

    await db.update('products', req.params.productId, { ...patch, updatedAt: new Date().toISOString() });

    await recordAudit(db, {
      actorId: req.user.uid, actorEmail: req.user.email,
      action: 'product.updated', resourceType: 'product', resourceId: req.params.productId,
      merchantId: req.merchantId,
      before: { price: existing.price, name: existing.name, isAvailable: existing.isAvailable },
      after: patch, req,
    });
    res.json({ success: true, data: { id: req.params.productId, ...patch } });
  } catch (e) { fail(res, 500, e.message); }
});

/** Archive instead of hard delete when the product has order history. */
router.delete('/products/:productId', ...guard('products.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const existing = await db.get('products', req.params.productId);
    if (!existing) return fail(res, 404, 'Product not found');
    if (existing.sellerId !== req.merchantId && existing.merchantId !== req.merchantId) {
      return fail(res, 403, 'Not your product');
    }

    const orders = await listAll(db, 'orders');
    const referenced = orders.some((o) =>
      (o.sellerId === req.merchantId || o.merchantId === req.merchantId) &&
      (o.items || []).some((it) => it.id === req.params.productId));

    if (referenced) {
      await db.update('products', req.params.productId, {
        archived: true, isAvailable: false, updatedAt: new Date().toISOString(),
      });
      await recordAudit(db, {
        actorId: req.user.uid, action: 'product.archived', resourceType: 'product',
        resourceId: req.params.productId, merchantId: req.merchantId, req,
      });
      return res.json({ success: true, data: { id: req.params.productId, archived: true } });
    }

    await db.delete('products', req.params.productId);
    await recordAudit(db, {
      actorId: req.user.uid, action: 'product.deleted', resourceType: 'product',
      resourceId: req.params.productId, merchantId: req.merchantId,
      before: { name: existing.name }, req,
    });
    res.json({ success: true, data: { id: req.params.productId, deleted: true } });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/products/bulk', ...guard('products.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const { ids, action, value } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return fail(res, 400, 'ids[] required');
    const results = [];
    for (const id of ids) {
      const p = await db.get('products', id);
      if (!p || (p.sellerId !== req.merchantId && p.merchantId !== req.merchantId)) {
        results.push({ id, ok: false }); continue;
      }
      if (action === 'setAvailability') {
        await db.update('products', id, { isAvailable: Boolean(value), updatedAt: new Date().toISOString() });
        results.push({ id, ok: true });
      } else if (action === 'archive') {
        await db.update('products', id, { archived: true, isAvailable: false, updatedAt: new Date().toISOString() });
        results.push({ id, ok: true });
      } else {
        return fail(res, 400, `Unknown bulk action: ${action}`);
      }
    }
    await recordAudit(db, {
      actorId: req.user.uid, action: `product.bulk_${action}`, resourceType: 'product',
      merchantId: req.merchantId, after: { ids, value }, req,
    });
    res.json({ success: true, data: results });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ INVENTORY ═══════════════════════════════

router.get('/inventory', ...guard('inventory.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const products = await listAll(db, 'products');
    const mine = products.filter((p) => p.sellerId === req.merchantId || p.merchantId === req.merchantId);

    const rows = mine.map((p) => ({
      id: p.id, name: p.name || p.title,
      stockQuantity: Number(p.stockQuantity ?? 0),
      minStock: p.minStock != null ? Number(p.minStock) : 5,
      cost: p.cost != null ? Number(p.cost) : null,
      value: (Number(p.stockQuantity ?? 0)) * (p.cost != null ? Number(p.cost) : 0),
      status: Number(p.stockQuantity) === 0 ? 'out' : (Number(p.stockQuantity) <= Number(p.minStock ?? 5) ? 'low' : 'ok'),
    }));

    res.json({
      success: true,
      data: rows,
      summary: {
        totalSkus: rows.length,
        lowStock: rows.filter((r) => r.status === 'low').length,
        outOfStock: rows.filter((r) => r.status === 'out').length,
        inventoryValue: Math.round(rows.reduce((s, r) => s + r.value, 0)),
      },
    });
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/inventory/movements', ...guard('inventory.read'), async (req, res) => {
  try {
    const moves = await listAll(getDb(req), 'inventory_movements');
    let mine = moves.filter((m) => m.merchantId === req.merchantId);
    if (req.query.productId) mine = mine.filter((m) => m.productId === req.query.productId);
    mine.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
    res.json({ success: true, data: mine.slice(0, parseInt(req.query.limit, 10) || 100) });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/inventory/adjust', ...guard('inventory.write'), async (req, res) => {
  try {
    const { productId, delta, type, reason } = req.body || {};
    const result = await ledger.applyMovement(getDb(req), getAdmin(req), {
      merchantId: req.merchantId, productId: String(productId || ''),
      delta: Number(delta), type: String(type || 'adjustment'),
      reason: reason ? String(reason) : undefined, actorId: req.user.uid,
    });
    await recordAudit(getDb(req), {
      actorId: req.user.uid, action: 'inventory.adjusted', resourceType: 'product',
      resourceId: productId, merchantId: req.merchantId,
      after: { delta, type, newStock: result.newStock }, req,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.code === 'INSUFFICIENT_STOCK') return fail(res, 422, e.message, e.code);
    fail(res, 500, e.message);
  }
});

// ═══════════════════════════════ CUSTOMERS (CRM) ═══════════════════════════════

/**
 * Segmentation lives here in the domain layer (§7), never in UI components:
 * vip ≥ 10 orders or spend ≥ 100k TZS · returning ≥2 · new <2 recent · inactive >60d.
 */
function segment(customer) {
  if (customer.ordersCount >= 10 || customer.totalSpent >= 100000) return 'vip';
  if (customer.ordersCount >= 2) return 'returning';
  const daysSince = (Date.now() - new Date(customer.lastOrderAt || 0).getTime()) / 86400000;
  if (daysSince > 60) return 'inactive';
  return 'new';
}

router.get('/customers', ...guard('customers.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const orders = await listAll(db, 'orders');
    const mine = orders.filter((o) => o.sellerId === req.merchantId || o.merchantId === req.merchantId);

    const byCustomer = new Map();
    for (const o of mine) {
      if (!o.customerId) continue;
      const prev = byCustomer.get(o.customerId) || {
        id: o.customerId, name: o.customerName || '', phone: o.customerPhone || o.contactPhone || '',
        ordersCount: 0, totalSpent: 0, lastOrderAt: null,
      };
      if (!['cancelled', 'refunded'].includes(o.status || '')) {
        prev.ordersCount++;
        prev.totalSpent += Number(o.total) || 0;
      }
      if (String(o.createdAt || '') > String(prev.lastOrderAt || '')) {
        prev.lastOrderAt = o.createdAt; prev.name = o.customerName || prev.name;
        prev.phone = o.customerPhone || o.contactPhone || prev.phone;
      }
      byCustomer.set(o.customerId, prev);
    }

    let customers = [...byCustomer.values()].map((c) => ({
      ...c, totalSpent: Math.round(c.totalSpent), segment: segment(c),
    }));

    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      customers = customers.filter((c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (req.query.segment) customers = customers.filter((c) => c.segment === req.query.segment);

    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    res.json({ success: true, data: customers.slice(0, parseInt(req.query.limit, 10) || 200) });
  } catch (e) { fail(res, 500, e.message); }
});

router.get('/customers/:customerId', ...guard('customers.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const orders = await listAll(db, 'orders');
    const mine = orders.filter((o) =>
      (o.sellerId === req.merchantId || o.merchantId === req.merchantId) &&
      o.customerId === req.params.customerId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (!mine.length) return fail(res, 404, 'Customer not found among your orders');

    const profile = {
      id: req.params.customerId,
      name: mine[0].customerName || '', phone: mine[0].customerPhone || mine[0].contactPhone || '',
      ordersCount: mine.filter((o) => !['cancelled', 'refunded'].includes(o.status || '')).length,
      totalSpent: Math.round(mine.filter((o) => !['cancelled', 'refunded'].includes(o.status || '')).reduce((s, o) => s + (Number(o.total) || 0), 0)),
      lastOrderAt: mine[0].createdAt,
      orders: mine.slice(0, 20).map(({ id, total, status, createdAt }) => ({ id, total, status, createdAt })),
    };
    profile.segment = segment(profile);
    res.json({ success: true, data: profile });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/customers/:customerId/notes', ...guard('customers.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const note = String((req.body || {}).note || '').slice(0, 2000);
    if (!note) return fail(res, 400, 'note required');
    const doc = {
      merchantId: req.merchantId, customerId: req.params.customerId,
      note, authorId: req.user.uid, ts: new Date().toISOString(),
    };
    const ref = await db.add('customer_notes', doc);
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ PAYMENTS (read-only view) ═══════════════════════════════
// Payment truth lives in PesaPal/nTZS backends and escrow tables. The dashboard
// NEVER marks payments paid — it displays trusted backend state only (§9/§10).

router.get('/payments', ...guard('payments.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const orders = await listAll(db, 'orders');
    const mine = orders.filter((o) => o.sellerId === req.merchantId || o.merchantId === req.merchantId);

    const rows = mine.map((o) => ({
      orderId: o.id,
      reference: o.paymentRef || null,
      method: o.paymentMethod || null,
      paymentStatus: o.paymentStatus || (o.paymentMethod === 'cod' ? 'cod' : 'unknown'),
      escrowStatus: o.escrowStatus || null,       // held | released | refunded (real backend field)
      escrowReleasedAt: o.escrowReleasedAt || null,
      total: Number(o.total) || 0,
      customerName: o.customerName || '',
      createdAt: o.createdAt,
    }));

    const summary = {
      received: rows.filter((r) => ['paid', 'received', 'completed'].includes(r.paymentStatus)).length,
      pending: rows.filter((r) => ['pending_confirmation', 'pending'].includes(r.paymentStatus)).length,
      heldInEscrow: rows.filter((r) => r.escrowStatus === 'held')
        .reduce((s, r) => s + r.total, 0),
      released: rows.filter((r) => r.escrow_status === 'released' || r.escrowStatus === 'released').length,
      refunded: rows.filter((r) => r.escrowStatus === 'refunded').length,
    };

    let out = rows;
    if (req.query.paymentStatus) out = out.filter((r) => r.paymentStatus === req.query.paymentStatus);
    if (req.query.escrowStatus) out = out.filter((r) => r.escrowStatus === req.query.escrowStatus);
    out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    res.json({ success: true, data: out.slice(0, parseInt(req.query.limit, 10) || 200), summary });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ SUPPLIERS ═══════════════════════════════

router.get('/suppliers', ...guard('suppliers.read'), async (req, res) => {
  try {
    const suppliers = await listAll(getDb(req), 'suppliers');
    const mine = suppliers.filter((s) => s.merchantId === req.merchantId);
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      mine = mine.filter((s) => String(s.name || '').toLowerCase().includes(q));
    }
    res.json({ success: true, data: mine });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/suppliers', ...guard('suppliers.write'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return fail(res, 400, 'name required');
    const doc = {
      merchantId: req.merchantId,
      name: String(b.name).trim(),
      phone: String(b.phone || ''), email: String(b.email || ''),
      contactPerson: String(b.contactPerson || ''), notes: String(b.notes || ''),
      outstandingBalance: Number(b.outstandingBalance ?? 0),
      createdAt: new Date().toISOString(),
    };
    const ref = await getDb(req).add('suppliers', doc);
    await recordAudit(getDb(req), {
      actorId: req.user.uid, action: 'supplier.created', resourceType: 'supplier',
      resourceId: ref.id, merchantId: req.merchantId, after: { name: doc.name }, req,
    });
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/suppliers/:supplierId', ...guard('suppliers.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const existing = await db.get('suppliers', req.params.supplierId);
    if (!existing || existing.merchantId !== req.merchantId) return fail(res, 404, 'Supplier not found');
    const patch = {};
    for (const k of ['name', 'phone', 'email', 'contactPerson', 'notes']) {
      if (req.body[k] != null) patch[k] = String(req.body[k]);
    }
    if (req.body.outstandingBalance != null) patch.outstandingBalance = Number(req.body.outstandingBalance);
    await db.update('suppliers', req.params.supplierId, { ...patch, updatedAt: new Date().toISOString() });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'supplier.updated', resourceType: 'supplier',
      resourceId: req.params.supplierId, merchantId: req.merchantId,
      before: { name: existing.name }, after: patch, req,
    });
    res.json({ success: true, data: { id: req.params.supplierId, ...patch } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ PURCHASE ORDERS ═══════════════════════════════
// draft → submitted → approved → partially_received/received → closed
// Inventory changes ONLY on receiveGoods (§12).

const PO_STATUSES = ['draft', 'submitted', 'approved', 'partially_received', 'received', 'closed'];
const PO_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['approved'],
  approved: ['partially_received', 'received'],
  partially_received: ['partially_received', 'received'],
  received: ['closed'],
  closed: [],
};

router.get('/purchases', ...guard('purchases.read'), async (req, res) => {
  try {
    const pos = await listAll(getDb(req), 'purchase_orders');
    const mine = pos.filter((p) => p.merchantId === req.merchantId);
    mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    res.json({ success: true, data: mine.slice(0, 200) });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/purchases', ...guard('purchases.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const b = req.body || {};
    if (!b.supplierId) return fail(res, 400, 'supplierId required');
    if (!Array.isArray(b.items) || !b.items.length) return fail(res, 400, 'items[] required');

    const supplier = await db.get('suppliers', b.supplierId);
    if (!supplier || supplier.merchantId !== req.merchantId) return fail(res, 400, 'Invalid supplier');

    const items = b.items.map((it) => ({
      productId: String(it.productId || ''),
      name: String(it.name || ''),
      quantityOrdered: Math.max(1, parseInt(it.quantity, 10) || 1),
      quantityReceived: 0,
      unitCost: Number(it.unitCost ?? 0),
    }));

    const doc = {
      merchantId: req.merchantId, supplierId: b.supplierId,
      supplierName: supplier.name, items,
      status: 'draft',
      totalCost: Math.round(items.reduce((s, it) => s + it.quantityOrdered * it.unitCost, 0)),
      notes: String(b.notes || ''),
      createdAt: new Date().toISOString(),
    };
    const ref = await db.add('purchase_orders', doc);
    await recordAudit(db, {
      actorId: req.user.uid, action: 'purchase.created', resourceType: 'purchase_order',
      resourceId: ref.id, merchantId: req.merchantId, after: { status: 'draft', total: doc.totalCost }, req,
    });
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/purchases/:poId/status', ...guard('purchases.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const po = await db.get('purchase_orders', req.params.poId);
    if (!po || po.merchantId !== req.merchantId) return fail(res, 404, 'Purchase order not found');
    const to = String((req.body || {}).status || '');
    if (!(PO_TRANSITIONS[po.status] || []).includes(to)) {
      return fail(res, 422, `Invalid purchase-order transition: ${po.status} → ${to}. Allowed: ${(PO_TRANSITIONS[po.status] || []).join(', ')}`, 'INVALID_TRANSITION');
    }
    if ((to === 'partially_received' || to === 'received')) {
      return fail(res, 422, 'Use POST /purchases/:id/receive to record received goods', 'USE_RECEIVE_ENDPOINT');
    }
    await db.update('purchase_orders', req.params.poId, { status: to, updatedAt: new Date().toISOString() });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'purchase.status_changed', resourceType: 'purchase_order',
      resourceId: req.params.poId, merchantId: req.merchantId,
      before: { status: po.status }, after: { status: to }, req,
    });
    res.json({ success: true, data: { id: req.params.poId, status: to } });
  } catch (e) { fail(res, 500, e.message); }
});

/**
 * Receive goods: the ONLY path where purchases touch inventory (§12).
 * Body: { receipts: [{productId, quantity}] } — validates against PO lines,
 * writes ledger movements of type purchase_receive, updates PO status.
 */
router.post('/purchases/:poId/receive', ...guard('purchases.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const po = await db.get('purchase_orders', req.params.poId);
    if (!po || po.merchantId !== req.merchantId) return fail(res, 404, 'Purchase order not found');
    if (!['approved', 'partially_received'].includes(po.status)) {
      return fail(res, 422, `Cannot receive goods on a ${po.status} purchase order`, 'INVALID_TRANSITION');
    }

    const receipts = Array.isArray((req.body || {}).receipts) ? req.body.receipts : [];
    const applied = [];
    for (const r of receipts) {
      const line = po.items.find((it) => it.productId === r.productId);
      if (!line) return fail(res, 400, `Product ${r.productId} is not on this purchase order`);
      const qty = parseInt(r.quantity, 10) || 0;
      if (qty <= 0) continue;
      const already = line.quantityReceived || 0;
      if (already + qty > line.quantityOrdered) {
        return fail(res, 422, `Cannot receive ${qty} of ${line.name}: only ${line.quantityOrdered - already} remaining`, 'OVER_RECEIPT');
      }
      const mv = await ledger.applyMovement(db, getAdmin(req), {
        merchantId: req.merchantId, productId: line.productId,
        delta: qty, type: 'purchase_receive',
        reason: `PO ${req.params.poId}`, refId: req.params.poId, actorId: req.user.uid,
      });
      line.quantityReceived = already + qty;
      applied.push({ productId: line.productId, name: line.name, qty, newStock: mv.newStock });
    }
    if (!applied.length) return fail(res, 400, 'No positive quantities received');

    const allReceived = po.items.every((it) => (it.quantityReceived || 0) >= it.quantityOrdered);
    const someReceived = po.items.some((it) => (it.quantityReceived || 0) > 0);
    const newStatus = allReceived ? 'received' : (someReceived ? 'partially_received' : po.status);

    await db.update('purchase_orders', req.params.poId, {
      items: po.items, status: newStatus, updatedAt: new Date().toISOString(),
    });
    eventBus.publish(eventBus.EVENTS.PURCHASE_RECEIVED, {
      merchantId: req.merchantId, data: { poId: req.params.poId, applied },
    });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'purchase.received', resourceType: 'purchase_order',
      resourceId: req.params.poId, merchantId: req.merchantId,
      after: { applied, newStatus }, req,
    });
    res.json({ success: true, data: { id: req.params.poId, status: newStatus, applied } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ EXPENSES ═══════════════════════════════

const EXPENSE_CATEGORIES = ['rent', 'electricity', 'internet', 'transport', 'salaries', 'marketing', 'packaging', 'supplies', 'other'];

router.get('/expenses', ...guard('expenses.read'), async (req, res) => {
  try {
    const expenses = await listAll(getDb(req), 'expenses');
    let mine = expenses.filter((x) => x.merchantId === req.merchantId);
    const range = parseRange(req.query);
    if (range.from || range.to) mine = mine.filter((x) => analytics.inRange(x.date || x.createdAt, range.from, range.to));
    if (req.query.category) mine = mine.filter((x) => x.category === req.query.category);

    const totalsByCategory = EXPENSE_CATEGORIES.reduce((acc, c) => {
      acc[c] = Math.round(mine.filter((x) => (x.category || 'other') === c).reduce((s, x) => s + (Number(x.amount) || 0), 0));
      return acc;
    }, {});

    res.json({
      success: true,
      data: mine.sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || ''))).slice(0, 200),
      totalsByCategory,
      total: Math.round(mine.reduce((s, x) => s + (Number(x.amount) || 0), 0)),
    });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/expenses', ...guard('expenses.write'), async (req, res) => {
  try {
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'amount must be a positive number');
    const category = EXPENSE_CATEGORIES.includes(b.category) ? b.category : 'other';
    const doc = {
      merchantId: req.merchantId, amount: Math.round(amount),
      category, description: String(b.description || '').slice(0, 500),
      date: b.date || new Date().toISOString(),
      createdBy: req.user.uid, createdAt: new Date().toISOString(),
    };
    const ref = await getDb(req).add('expenses', doc);
    await recordAudit(getDb(req), {
      actorId: req.user.uid, action: 'expense.created', resourceType: 'expense',
      resourceId: ref.id, merchantId: req.merchantId, after: { amount, category }, req,
    });
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/expenses/:expenseId', ...guard('expenses.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const existing = await db.get('expenses', req.params.expenseId);
    if (!existing || existing.merchantId !== req.merchantId) return fail(res, 404, 'Expense not found');
    const patch = {};
    if (req.body.amount != null) {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'amount must be a positive number');
      patch.amount = Math.round(amount);
    }
    if (req.body.category != null && EXPENSE_CATEGORIES.includes(req.body.category)) patch.category = req.body.category;
    if (req.body.description != null) patch.description = String(req.body.description);
    if (req.body.date != null) patch.date = String(req.body.date);
    await db.update('expenses', req.params.expenseId, { ...patch, updatedAt: new Date().toISOString() });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'expense.updated', resourceType: 'expense',
      resourceId: req.params.expenseId, merchantId: req.merchantId,
      before: { amount: existing.amount, category: existing.category }, after: patch, req,
    });
    res.json({ success: true, data: { id: req.params.expenseId, ...patch } });
  } catch (e) { fail(res, 500, e.message); }
});

router.delete('/expenses/:expenseId', ...guard('expenses.write'), async (req, res) => {
  try {
    const db = getDb(req);
    const existing = await db.get('expenses', req.params.expenseId);
    if (!existing || existing.merchantId !== req.merchantId) return fail(res, 404, 'Expense not found');
    await db.delete('expenses', req.params.expenseId);
    await recordAudit(db, {
      actorId: req.user.uid, action: 'expense.deleted', resourceType: 'expense',
      resourceId: req.params.expenseId, merchantId: req.merchantId,
      before: { amount: existing.amount, category: existing.category }, req,
    });
    res.json({ success: true, data: { id: req.params.expenseId, deleted: true } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ STAFF ═══════════════════════════════

router.get('/staff', ...guard('staff.read'), async (req, res) => {
  try {
    const staff = await listAll(getDb(req), 'staff');
    const mine = staff.filter((s) => s.sellerId === req.merchantId || s.merchantId === req.merchantId)
      .map((s) => ({
        id: s.id, name: s.name || s.staffName || '', email: s.email || '',
        role: s.role || s.staffRole || 'sales',
        capabilities: effectiveCapabilities({ role: s.role || s.staffRole, capabilities: s.capabilities }),
        active: s.active !== false,
        createdAt: s.createdAt || null,
      }));
    res.json({ success: true, data: mine });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/staff', ...guard('staff.manage'), async (req, res) => {
  try {
    const db = getDb(req);
    const b = req.body || {};
    if (!b.name || !b.email) return fail(res, 400, 'name and email required');
    const caps = Array.isArray(b.capabilities) ? b.capabilities : undefined;
    const doc = {
      sellerId: req.merchantId, merchantId: req.merchantId,
      name: String(b.name).trim(), email: String(b.email).trim().toLowerCase(),
      staffRole: String(b.role || 'sales'),
      ...(caps ? { capabilities: caps } : {}),
      inviteCode: 'STF' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      active: true, createdBy: req.user.uid, createdAt: new Date().toISOString(),
    };
    const ref = await db.add('staff', doc);
    eventBus.publish(eventBus.EVENTS.STAFF_INVITED, { merchantId: req.merchantId, data: { staffId: ref.id, email: doc.email } });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'staff.created', resourceType: 'staff',
      resourceId: ref.id, merchantId: req.merchantId, after: { email: doc.email, role: doc.staffRole }, req,
    });
    res.json({ success: true, data: { id: ref.id, ...doc } });
  } catch (e) { fail(res, 500, e.message); }
});

router.put('/staff/:staffId/capabilities', ...guard('staff.manage'), async (req, res) => {
  try {
    const db = getDb(req);
    const member = await db.get('staff', req.params.staffId);
    if (!member || (member.sellerId !== req.merchantId && member.merchantId !== req.merchantId)) {
      return fail(res, 404, 'Staff member not found');
    }
    const caps = Array.isArray((req.body || {}).capabilities) ? req.body.capabilities : null;
    if (!caps) return fail(res, 400, 'capabilities[] required');

    const { CAPABILITIES } = require('../middleware/capabilities');
    const invalid = caps.filter((c) => !CAPABILITIES.includes(c));
    if (invalid.length) return fail(res, 400, `Unknown capabilities: ${invalid.join(', ')}`);

    const before = member.capabilities || null;
    await db.update('staff', req.params.staffId, { capabilities: caps, updatedAt: new Date().toISOString() });
    eventBus.publish(eventBus.EVENTS.STAFF_PERMISSIONS_CHANGED, {
      merchantId: req.merchantId, data: { staffId: req.params.staffId },
    });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'staff.permissions_changed', resourceType: 'staff',
      resourceId: req.params.staffId, merchantId: req.merchantId,
      before, after: caps, req,
    });
    res.json({ success: true, data: { id: req.params.staffId, capabilities: caps } });
  } catch (e) { fail(res, 500, e.message); }
});

router.delete('/staff/:staffId', ...guard('staff.manage'), async (req, res) => {
  try {
    const db = getDb(req);
    const member = await db.get('staff', req.params.staffId);
    if (!member || (member.sellerId !== req.merchantId && member.merchantId !== req.merchantId)) {
      return fail(res, 404, 'Staff member not found');
    }
    await db.update('staff', req.params.staffId, { active: false, deactivatedAt: new Date().toISOString() });
    await recordAudit(db, {
      actorId: req.user.uid, action: 'staff.deactivated', resourceType: 'staff',
      resourceId: req.params.staffId, merchantId: req.merchantId,
      before: { email: member.email }, req,
    });
    res.json({ success: true, data: { id: req.params.staffId, deactivated: true } });
  } catch (e) { fail(res, 500, e.message); }
});

// ═══════════════════════════════ NOTIFICATIONS ═══════════════════════════════

router.get('/notifications', ...guard('notifications.read'), async (req, res) => {
  try {
    const notes = await listAll(getDb(req), 'merchant_notifications');
    const mine = notes.filter((n) => n.merchantId === req.merchantId)
      .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
      .slice(0, 50);
    const unread = mine.filter((n) => !n.read).length;
    res.json({ success: true, data: mine, unread });
  } catch (e) { fail(res, 500, e.message); }
});

router.post('/notifications/mark-read', ...guard('notifications.read'), async (req, res) => {
  try {
    const db = getDb(req);
    const ids = Array.isArray((req.body || {}).ids) ? req.body.ids : null;
    const notes = await listAll(db, 'merchant_notifications');
    const mine = notes.filter((n) => n.merchantId === req.merchantId && (!ids || ids.includes(n.id)) && !n.read);
    for (const n of mine) {
      await db.update('merchant_notifications', n.id, { read: true, readAt: new Date().toISOString() });
    }
    res.json({ success: true, data: { marked: mine.length } });
  } catch (e) { fail(res, 500, e.message); }
});

// Wire the notification writers once per process: domain events → notifications.
// The route module keeps a module-level db reference set at mount time.
let mountedDb = null;
(function wireNotificationWriters() {
  const writeNote = (type, message, severity) => (event) => {
    if (!mountedDb) return;
    Promise.resolve(mountedDb.add('merchant_notifications', {
      merchantId: event.merchantId, type,
      message: typeof message === 'function' ? message(event.data) : message,
      severity: severity || 'info', read: false, ts: event.ts,
    })).catch(() => {});
  };
  const { EVENTS } = eventBus;
  eventBus.subscribe(EVENTS.LOW_STOCK, writeNote(EVENTS.LOW_STOCK, (d) => `Low stock warning on product ${d.productId}`, 'warning'));
  eventBus.subscribe(EVENTS.OUT_OF_STOCK, writeNote(EVENTS.OUT_OF_STOCK, (d) => `Product ${d.productId} is OUT OF STOCK`, 'critical'));
  eventBus.subscribe(EVENTS.PURCHASE_RECEIVED, writeNote(EVENTS.PURCHASE_RECEIVED, () => 'Goods received on purchase order', 'success'));
  eventBus.subscribe(EVENTS.ORDER_STATUS_CHANGED, writeNote(EVENTS.ORDER_STATUS_CHANGED, (d) => `Order ${d.orderId}: ${d.from} → ${to_label(d.to)}`, 'info'));
})();

function to_label(s) { return String(s || '').replace(/_/g, ' '); }

/**
 * Mount the merchant OS API. Called from server-production.js with the flat db
 * adapter so event-driven notification writes use the same connection.
 * options.authMiddleware: substitute token verifier (tests / alt auth stacks).
 */
function mountMerchantOs(app, options = {}) {
  if (options.authMiddleware) authTokenMiddleware = options.authMiddleware;
  mountedDb = app.get('db');
  app.use('/api/merchant', router);
}

module.exports = { mountMerchantOs, router };
