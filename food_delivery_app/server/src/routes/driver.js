/**
 * Legacy public API routes: /api/sellers, /api/sellers/:sellerId
 * and the /api/driver/* family used by public/js/driver-app.js and the
 * error-scanner sanity probes. Ported from server-dev.js onto the flat
 * dual-db interface (app.get('db'): add/get/where/update/set/getAll)
 * with small in-memory caches.
 *
 * Mounted by server-production.js:
 *   driverRoutes(app)  → /api/driver/*, /api/sellers, /api/sellers/:id
 *   riderRoutes()      → express router for /api/riders & /api/v1/riders
 */
const express = require('express');

// Simple TTL cache wrapper (serves stale value on fetch failure)
const _cache = {};
function cached(key, ttlMs, fetcher) {
  return async (req, res, next) => {
    const now = Date.now();
    const entry = _cache[key];
    if (entry && now - entry.time < ttlMs) return res.json(entry.value);
    try {
      const value = await fetcher(req);
      _cache[key] = { time: now, value };
      res.json(value);
    } catch (e) {
      if (entry) return res.json(entry.value);
      next(e);
    }
  };
}

function noDb(res) { return res.status(503).json({ error: 'Database not available' }); }

/** Publish order.status_changed on the event bus (drives FCM + notifications). */
function publishOrderEvent(app, order, to) {
  try {
    const eventBus = require('../services/event-bus');
    eventBus.publish(eventBus.EVENTS.ORDER_STATUS_CHANGED, {
      data: { orderId: order.id || order.orderId, from: order.status, to },
    });
  } catch (_) { /* never break the transition for a push */ }
}

/** Express router with the /api/driver/* paths (also used for /api/riders). */
function riderRoutes() {
  const router = express.Router();

  // Available (ready_for_delivery) orders — cached 30s
  router.get('/available-orders', cached('orders:available', 30000, async () => {
    const db = riderRoutes._app && riderRoutes._app.get('db');
    if (!db) return [];
    try {
      return await db.where('orders', 'status', '==', 'ready_for_delivery');
    } catch (e) {
      return [];
    }
  }));

  // Active orders for a driver
  router.get('/:driverId/active-orders', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const ACTIVE = ['assigned', 'accepted', 'picked_up', 'pickedup', 'in_transit'];
      const orders = await db.where('orders', 'driverId', '==', req.params.driverId);
      res.json(orders.filter(o => ACTIVE.includes(o.status)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Driver profile - exact match for current driver (mobile app) - exit router to let app handle
  router.get('/profile', (req, res, next) => {
    // Exit this router entirely, pass to app's next middleware (mobile-app.js route)
    next('router');
  });

  // Driver profile by ID (legacy)
  router.get('/:driverId/profile', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const driver = await db.get('drivers', req.params.driverId);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      res.json(driver);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update driver profile
  router.put('/:driverId/profile', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      await db.set('drivers', req.params.driverId, {
        ...req.body,
        ownerId: req.params.driverId,
        updatedAt: new Date().toISOString(),
      });
      res.json({ message: 'Profile saved' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Online status toggle
  router.put('/:driverId/status', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const isOnline = !!req.body.isOnline;
      await db.set('drivers', req.params.driverId, {
        isOnline,
        available: isOnline,
        status: isOnline ? 'online' : 'offline',
        updatedAt: new Date().toISOString(),
      });
      res.json({ message: `Driver is now ${isOnline ? 'online' : 'offline'}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Earnings summary
  router.get('/:driverId/earnings', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const uid = req.params.driverId;
      const [wallet, txns, orders] = await Promise.all([
        db.get('wallets', uid).catch(() => null),
        db.where('transactions', 'userId', '==', uid).catch(() => []),
        db.where('orders', 'driverId', '==', uid).catch(() => []),
      ]);
      const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
      res.json({
        balance: Number(wallet && wallet.balance) || 0,
        totalEarned: Number(wallet && wallet.totalEarned) || 0,
        totalDeliveries: Number(wallet && wallet.totalDeliveries) || 0,
        transactions: txns.filter(t => t.type === 'delivery_earning'),
        completedCount: delivered.length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Order navigation data (seller + customer coordinates)
  router.get('/order/:orderId/navigation', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const order = await db.get('orders', req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const sellerId = order.sellerId || order.merchantId;
      let sellerCoords = null;
      if (sellerId) {
        const seller = await db.get('sellers', sellerId).catch(() => null);
        if (seller && seller.latitude != null && seller.longitude != null) {
          sellerCoords = { lat: seller.latitude, lng: seller.longitude, name: seller.name || seller.storeName || 'Merchant' };
        }
      }
      res.json({
        orderId: req.params.orderId,
        status: order.status,
        sellerId,
        sellerCoords,
        customerCoords: (order.deliveryLat != null && order.deliveryLng != null)
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
        customerAddress: order.customerAddress || order.deliveryAddress || '',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Accept order
  router.put('/orders/:orderId/accept', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const order = await db.get('orders', req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.driverId && order.status !== 'ready_for_delivery') {
        return res.status(409).json({ error: 'Order already assigned' });
      }
      const now = new Date().toISOString();
      await db.update('orders', req.params.orderId, {
        driverId: req.body.driverId,
        driverName: req.body.driverName || null,
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
      });
      publishOrderEvent(req.app, order, 'accepted');
      res.json({ message: 'Order accepted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Decline / pass on an order (driver chooses not to take it)
  router.put('/orders/:orderId/decline', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const order = await db.get('orders', req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      // Only an assigned driver can decline their own assignment
      if (order.driverId && order.driverId !== req.body.driverId) {
        return res.status(403).json({ error: 'NOT_YOURS' });
      }
      const now = new Date().toISOString();
      // Return the order to the pool for other drivers
      const declinedBy = Array.from(new Set(
        (order.declinedBy || []).concat([req.body.driverId]).filter(Boolean)
      )).slice(-20);
      await db.update('orders', req.params.orderId, {
        driverId: null,
        driverName: null,
        status: 'ready_for_delivery',
        declinedBy,
        updatedAt: now,
      });
      res.json({ message: 'Order declined — returned to the delivery pool' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update order status
  router.put('/orders/:orderId/status', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const { status } = req.body || {};
      if (!status) return res.status(400).json({ error: 'status is required' });
      const order = await db.get('orders', req.params.orderId).catch(() => null);
      await db.update('orders', req.params.orderId, {
        status,
        updatedAt: new Date().toISOString(),
      });
      if (order) publishOrderEvent(req.app, order, status);
      res.json({ message: `Status updated to ${status}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete delivery (credits the driver wallet)
  router.put('/orders/:orderId/complete', async (req, res) => {
    try {
      const db = req.app.get('db');
      if (!db) return noDb(res);
      const uid = req.body.driverId;
      if (!uid) return res.status(400).json({ error: 'driverId required' });

      const order = await db.get('orders', req.params.orderId);
      if (!order) return res.status(404).json({ error: 'ORDER_GONE' });
      if (order.status === 'delivered' || order.status === 'completed') {
        return res.status(409).json({ error: 'ALREADY_DONE' });
      }
      if (order.driverId !== uid) return res.status(403).json({ error: 'NOT_YOURS' });

      const fee = Number(order.deliveryFee) || 0;
      const now = new Date().toISOString();
      const wallet = await db.get('wallets', uid).catch(() => null);
      await db.set('wallets', uid, {
        balance: (Number(wallet && wallet.balance) || 0) + fee,
        totalEarned: (Number(wallet && wallet.totalEarned) || 0) + fee,
        totalDeliveries: (Number(wallet && wallet.totalDeliveries) || 0) + 1,
        updatedAt: now,
      });
      await db.update('orders', req.params.orderId, { status: 'delivered', deliveredAt: now, updatedAt: now });
      publishOrderEvent(req.app, order, 'delivered');
      res.json({ message: 'Delivery completed', fee });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

/** Register the legacy /api/driver/* and /api/sellers routes on the app. */
function driverRoutes(app) {
  riderRoutes._app = app;
  app.use('/api/driver', riderRoutes());

  // Public seller catalogue (home/discovery pages + sanity probe)
  app.get('/api/sellers', async (req, res, next) => {
    try {
      const db = app.get('db');
      if (!db) return noDb(res);
      const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
      const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ error: 'Invalid pagination' });
      const all = await require('../services/catalog-cache').catalogRows(db, 'sellers');
      require('../services/catalog-cache').sendCatalog(req, res, db, all.filter(s => s.isOpen !== false).slice(offset, offset + limit));
    } catch (e) { next(e); }
  });

  // Seller detail
  app.get('/api/sellers/:sellerId', async (req, res) => {
    try {
      const db = app.get('db');
      if (!db) return noDb(res);
      const seller = await db.get('sellers', req.params.sellerId);
      if (!seller) return res.status(404).json({ error: 'Seller not found' });
      res.json(seller);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { driverRoutes, riderRoutes };
