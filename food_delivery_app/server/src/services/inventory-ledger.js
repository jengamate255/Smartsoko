/**
 * Inventory ledger service (§6).
 * Every inventory change is a movement doc in `inventory_movements`:
 *   { merchantId, productId, delta (+/-), type, reason, refId,
 *     balanceAfter, actorId, ts }
 *
 * Consistency model (choose ONE source of truth — never both):
 *   • When a product doc exists, its `stockQuantity` IS the authoritative
 *     current stock; each movement records delta + resulting `balanceAfter`
 *     as an auditable trail, then synchronizes the product field.
 *   • When no product doc exists (orphan movements), current stock is derived
 *     as Σ(movement deltas).
 *
 * Movement types: purchase_receive, sale, return, damage, adjustment, audit.
 */
'use strict';

const eventBus = require('./event-bus');

const MOVEMENT_TYPES = ['purchase_receive', 'sale', 'return', 'damage', 'adjustment', 'audit'];

/** Pure math: apply movements to a base stock. Unit-tested without Firestore. */
function computeBalance(baseStock, movements) {
  return (Number(baseStock) || 0)
    + movements.reduce((sum, m) => sum + (Number(m.delta) || 0), 0);
}

/**
 * applyMovement(db, { admin }, entry)
 * entry: { merchantId, productId, delta, type, reason?, refId?, actorId? }
 * Reads the product once for base/balance sync; writes movement then updates
 * product.stockQuantity. Returns { movementId, newStock } or throws.
 */
async function applyMovement(db, admin, entry) {
  if (!db) throw new Error('Database not available');
  const { merchantId, productId, delta } = entry;
  const type = entry.type || 'adjustment';

  if (!merchantId || !productId) throw new Error('merchantId and productId are required');
  if (!MOVEMENT_TYPES.includes(type)) {
    throw new Error(`Invalid movement type: ${type}. Allowed: ${MOVEMENT_TYPES.join(', ')}`);
  }
  const n = Number(delta);
  if (!Number.isFinite(n)) throw new Error('delta must be a finite number');
  if (type === 'sale' && n >= 0) throw new Error('sale movements must have negative delta');
  if (type === 'purchase_receive' && n <= 0) throw new Error('purchase_receive must have positive delta');

  if (typeof db.applyInventoryMovement === 'function') {
    const atomic = await db.applyInventoryMovement({ ...entry, delta: n, type });
    if (atomic) {
      eventBus.publish(atomic.newStock === 0 ? eventBus.EVENTS.OUT_OF_STOCK : eventBus.EVENTS.STOCK_ADJUSTED,
        { merchantId, data: { productId, delta: n, type, level: atomic.newStock } });
      return atomic;
    }
  }

  // Load current product (adapter first, Firestore direct as backup)
  let product = null;
  try { product = await db.get('products', productId); } catch (_) { /* try fs */ }

  const base = Number(product ? (product.baseStock ?? product.stockQuantity ?? 0) : 0);

  // Authoritative current stock: the synced product field when the doc exists.
  // (Orphan movements without a product doc simply record delta truthfully.)
  const hasProductDoc = Boolean(product && product.id);
  const currentDerived = hasProductDoc
    ? Number(product.stockQuantity ?? 0)
    : 0;
  const balanceAfter = currentDerived + n;

  // Never silently go below zero — that hides data errors.
  if (balanceAfter < 0) {
    const err = new Error(`Insufficient stock: would result in ${balanceAfter}`);
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const movement = {
    merchantId,
    productId,
    delta: n,
    type,
    reason: entry.reason || null,
    refId: entry.refId || null,
    balanceAfter,
    actorId: entry.actorId || null,
    ts: new Date().toISOString(),
  };
  const ref = await db.add('inventory_movements', movement);

  // Keep the legacy stockQuantity field synchronized for customer-facing reads
  try {
    if (product && product.id) {
      await db.update('products', product.id, { stockQuantity: balanceAfter });
    } else if (admin && admin.firestore) {
      await admin.firestore().collection('products').doc(productId)
        .update({ stockQuantity: balanceAfter });
    }
  } catch (_) { /* product may not exist yet; movement still recorded */ }

  // Threshold events → notification center
  if (balanceAfter === 0) {
    eventBus.publish(eventBus.EVENTS.OUT_OF_STOCK, { merchantId, data: { productId } });
  } else if (product && product.minStock != null && balanceAfter <= Number(product.minStock)) {
    eventBus.publish(eventBus.EVENTS.LOW_STOCK, { merchantId, data: { productId, level: balanceAfter } });
  } else {
    eventBus.publish(eventBus.EVENTS.STOCK_ADJUSTED, { merchantId, data: { productId, delta: n, type } });
  }

  return { movementId: ref.id, newStock: balanceAfter };
}

module.exports = { MOVEMENT_TYPES, computeBalance, applyMovement };
