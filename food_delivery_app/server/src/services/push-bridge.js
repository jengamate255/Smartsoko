/**
 * Push bridge — subscribes to canonical event-bus events and fans them out
 * as FCM push notifications.
 *
 * Wiring (single source of truth — no UI page hardcodes push logic):
 *   order.created        → notify the merchant ("New order #x")
 *   order.status_changed → notify the customer when relevant
 *                          (accepted / in_transit / delivered)
 *   order.cancelled      → notify the customer
 *   inventory.low_stock  → notify the merchant
 *
 * Notifications are ALSO persisted to the notifications table (same as the
 * notification center) so users see them even without a device token.
 */
'use strict';

const eventBus = require('./event-bus');
const push = require('./push');

const appRef = { app: null };

function init(app) {
  if (appRef.app) return; // idempotent
  appRef.app = app;
  const db = () => app.get('db');

  // ── New order → merchant push + notification row ──
  eventBus.subscribe(eventBus.EVENTS.ORDER_CREATED, async (event) => {
    const { orderId, total, merchantId } = event.data || {};
    if (!merchantId) return;
    const payload = {
      title: 'New order received',
      body: `Order #${String(orderId || '').slice(0, 8)} — check your dashboard to accept it.`,
      data: { type: 'order.created', orderId: String(orderId || ''), total: String(total || 0) },
      collapseKey: `order-${orderId}`,
    };
    await push.sendToUid(app, merchantId, payload);
    await persistNotification(db(), {
      userId: merchantId, title: payload.title, body: payload.body,
      type: 'order', data: { orderId, total },
    });
  });

  // ── Status change → customer push (accept / dispatch / deliver milestones) ──
  eventBus.subscribe(eventBus.EVENTS.ORDER_STATUS_CHANGED, async (event) => {
    const { orderId, from, to } = event.data || {};
    if (!orderId) return;
    const order = await safeGet(db(), 'orders', orderId);
    if (!order) return;

    const customerUid = order.customerId || order.customer_id || order.customerUid;
    if (!customerUid) return;

    const M = {
      accepted: { title: 'Order confirmed', body: 'The merchant confirmed your order.' },
      preparing: { title: 'Order being prepared', body: 'Your food is being prepared now.' },
      ready_for_delivery: { title: 'Ready for delivery', body: 'Your order is ready and waiting for a driver.' },
      in_transit: { title: 'On the way', body: 'Your order has been picked up and is on the way.' },
      delivered: { title: 'Order delivered', body: 'Enjoy your meal! Rate your experience.' },
    };
    const m = M[to] || M[canonicalize(to)];
    if (!m) return;

    await push.sendToUid(app, customerUid, {
      title: m.title, body: m.body,
      data: { type: 'order.status', orderId: String(orderId), status: to },
      collapseKey: `order-${orderId}`,
    });
    await persistNotification(db(), {
      userId: customerUid, title: m.title, body: m.body,
      type: 'order', data: { orderId, status: to },
    });
  });

  // ── Cancelled → customer push ──
  eventBus.subscribe(eventBus.EVENTS.ORDER_CANCELLED, async (event) => {
    const { orderId } = event.data || {};
    if (!orderId) return;
    const order = await safeGet(db(), 'orders', orderId);
    if (!order) return;
    const customerUid = order.customerId || order.customer_id || order.customerUid;
    if (!customerUid) return;
    await push.sendToUid(app, customerUid, {
      title: 'Order cancelled',
      body: `Order #${String(orderId).slice(0, 8)} was cancelled. You have not been charged.`,
      data: { type: 'order.cancelled', orderId: String(orderId) },
      collapseKey: `order-${orderId}`,
    });
    await persistNotification(db(), {
      userId: customerUid, title: 'Order cancelled',
      body: `Order #${String(orderId).slice(0, 8)} was cancelled.`,
      type: 'order', data: { orderId },
    });
  });

  // ── Low stock → merchant push ──
  eventBus.subscribe(eventBus.EVENTS.LOW_STOCK, async (event) => {
    const { productId, level } = event.data || {};
    const merchantId = event.merchantId;
    if (!merchantId) return;
    await push.sendToUid(app, merchantId, {
      title: 'Low stock alert',
      body: `A product is down to ${level} units — restock soon.`,
      data: { type: 'inventory.low_stock', productId: String(productId || '') },
      collapseKey: `stock-${productId}`,
    });
    await persistNotification(db(), {
      userId: merchantId, title: 'Low stock alert',
      body: `A product is down to ${level} units — restock soon.`,
      type: 'inventory', data: { productId, level },
    });
  });
}

// ── helpers ──────────────────────────────────────────────────────────────
function canonicalize(s) {
  return { confirmed: 'accepted', dispatched: 'in_transit', ready: 'ready_for_delivery', pickedup: 'picked_up' }[s] || s;
}

async function safeGet(db, table, id) {
  try { return await db.get(table, id); } catch (_) { return null; }
}

async function persistNotification(db, { userId, title, body, type, data }) {
  if (!db || !db.add) return;
  try {
    await db.add('notifications', {
      userId, title, body, type: type || 'general',
      data: data || {}, read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // notifications table may not exist in one of the DBs — non-fatal
  }
}

module.exports = { init };
