/**
 * Event bus — in-process pub/sub driving the notification center (§16).
 * Domain mutations publish events; handlers persist notifications and can
 * later fan out to FCM/email. No UI page hardcodes notification logic.
 *
 * Events carry: { type, merchantId, data, ts }. Handlers must never throw
 * into the publisher — errors are logged and isolated.
 */
'use strict';

const { logger } = (() => {
  try { return require('../config/logger'); }
  catch (_) { return { logger: console }; }
})();

const handlers = new Map(); // eventType -> Set<fn>
const history = [];         // ring buffer for tests/debug
const MAX_HISTORY = 500;

function subscribe(eventType, fn) {
  if (!handlers.has(eventType)) handlers.set(eventType, new Set());
  handlers.get(eventType).add(fn);
  return () => handlers.get(eventType).delete(fn);
}

function publish(type, payload = {}) {
  const event = {
    type,
    merchantId: payload.merchantId || null,
    data: payload.data || {},
    ts: new Date().toISOString(),
  };
  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();

  const subs = handlers.get(type) || new Set();
  for (const fn of subs) {
    try {
      // Handlers may be sync or async; async failures are contained.
      Promise.resolve(fn(event)).catch((e) =>
        logger.error && logger.error(`event handler error (${type}): ${e.message}`)
      );
    } catch (e) {
      logger.error && logger.error(`event handler error (${type}): ${e.message}`);
    }
  }
  return event;
}

function recentEvents(limit = 50) {
  return history.slice(-limit).reverse();
}

function clear() { // test hook
  handlers.clear();
  history.length = 0;
}

// Canonical event names (keep as single source of truth)
const EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_STATE_CHANGED: 'payment.state_changed',
  REFUND_CREATED: 'refund.created',
  LOW_STOCK: 'inventory.low_stock',
  OUT_OF_STOCK: 'inventory.out_of_stock',
  STOCK_ADJUSTED: 'inventory.adjusted',
  PURCHASE_RECEIVED: 'purchase.received',
  STAFF_INVITED: 'staff.invited',
  STAFF_PERMISSIONS_CHANGED: 'staff.permissions_changed',
  SETTINGS_CHANGED: 'settings.changed',
};

module.exports = { subscribe, publish, recentEvents, clear, EVENTS };
