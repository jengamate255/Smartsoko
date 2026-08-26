import { describe, it, expect, beforeEach } from 'vitest';
import { computeBalance, applyMovement, MOVEMENT_TYPES } from '../../server/src/services/inventory-ledger.js';
import { createRequire } from 'node:module';

// The ledger subscribes/publishes through CommonJS require(); use the SAME
// instance here so tests observe the exact bus the production code sees.
const require_ = createRequire(import.meta.url);
const eventBus = require_('../../server/src/services/event-bus.js');

/** In-memory db double implementing the flat adapter interface. */
function memoryDb(products, movements = []) {
  return {
    async get(col, id) { return col === 'products' ? (products[id] || null) : null; },
    async add(col, data) {
      const id = 'mv-' + Math.random().toString(36).slice(2, 8);
      movements.push({ id, ...data });
      return { id };
    },
    async update(col, id, patch) {
      if (col === 'products' && products[id]) Object.assign(products[id], patch);
    },
    async where(col, field, op, value) {
      if (col === 'inventory_movements') return movements.filter((m) => m[field] === value);
      return [];
    },
  };
}

describe('inventory ledger math', () => {
  it('computeBalance applies base + deltas', () => {
    // PRODUCT → STOCK +20 → SALE -2 → RETURN +1 → DAMAGE -1  = 18
    expect(computeBalance(20, [
      { delta: -2 }, { delta: +1 }, { delta: -1 },
    ])).toBe(18);
    expect(computeBalance(0, [])).toBe(0);
    expect(computeBalance('12', [{ delta: '3' }])).toBe(15); // string coercion
  });
});

describe('applyMovement', () => {
  let products, movements;
  beforeEach(() => { products = { p1: { id: 'p1', stockQuantity: 10, minStock: 3 } }; movements = []; });

  it('records an auditable movement and syncs product stock', async () => {
    const db = memoryDb(products, movements);
    const out = await applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: 5, type: 'purchase_receive' });
    expect(out.newStock).toBe(15);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ productId: 'p1', delta: 5, balanceAfter: 15, merchantId: 'm1', type: 'purchase_receive' });
    expect(products.p1.stockQuantity).toBe(15);

    const out2 = await applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: -2, type: 'sale' });
    expect(out2.newStock).toBe(13);
    expect(movements).toHaveLength(2);
    expect(products.p1.stockQuantity).toBe(13);
  });

  it('rejects negative resulting stock instead of silently corrupting data', async () => {
    const db = memoryDb(products);
    await expect(applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: -99, type: 'damage' }))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('validates movement types and sale sign', async () => {
    const db = memoryDb(products);
    await expect(applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: 1, type: 'teleport' }))
      .rejects.toThrow(/Invalid movement type/);
    await expect(applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: 5, type: 'sale' }))
      .rejects.toThrow(/negative delta/);
    await expect(applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: -5, type: 'purchase_receive' }))
      .rejects.toThrow(/positive delta/);
    expect(MOVEMENT_TYPES).toContain('audit');
  });

  it('publishes low/out-of-stock events to the bus', async () => {
    const seen = [];
    const un1 = eventBus.subscribe(eventBus.EVENTS.OUT_OF_STOCK, (e) => seen.push(e.type));
    const un2 = eventBus.subscribe(eventBus.EVENTS.LOW_STOCK, (e) => seen.push(e.type));

    products.p1.stockQuantity = 4;
    const db = memoryDb(products, []);
    await applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: -1 }); // 3 == minStock
    await applyMovement(db, null, { merchantId: 'm1', productId: 'p1', delta: -3 }); // 0 → OUT

    un1(); un2();
    expect(seen).toContain(eventBus.EVENTS.OUT_OF_STOCK);
  });
});
