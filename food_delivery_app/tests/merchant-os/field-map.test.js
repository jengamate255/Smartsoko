/**
 * Unit tests for the camelCase ↔ Postgres column contract in lib/server-db.js.
 *
 * These exist because the deployed `promotions` table uses different column
 * names than the merchant-OS promo shape (usage_limit / min_order_amount /
 * valid_until), so POST/PUT /promos failed with "column does not exist", and
 * because changing the per-table map silently changed the read direction too
 * (an aliasing-order bug in the reverse map).
 *
 * Pure functions only — no database, no network.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Keep the module's env warning out of the test output; server-db.js only reads
// these at createDualDb() time, so a placeholder is harmless here.
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-key';

const require = createRequire(import.meta.url);
const { mapToSupabase, mapToFirestore } = require('../../lib/server-db.js');

describe('promotions: writing the merchant-OS promo shape', () => {
  const written = mapToSupabase({
    merchantId: 'm-1',
    code: 'KARIBU10',
    discountValue: 5000,
    discountType: 'amount',
    maxUses: 10,
    minOrder: 1000,
    expiresAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }, 'promotions');

  it('maps the tenant to merchant_id', () => {
    expect(written.merchant_id).toBe('m-1');
  });

  it('maps camelCase discount fields onto the live columns', () => {
    expect(written.discount_value).toBe(5000);
    expect(written.discount_type).toBe('amount');
    expect(written.is_active).toBe(true);
  });

  it('maps maxUses/minOrder/expiresAt onto usage_limit/min_order_amount/valid_until', () => {
    expect(written.usage_limit).toBe(10);
    expect(written.min_order_amount).toBe(1000);
    expect(written.valid_until).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never targets columns that do not exist', () => {
    expect(written).not.toHaveProperty('max_uses');
    expect(written).not.toHaveProperty('min_order');
    expect(written).not.toHaveProperty('expires_at');
  });
});

describe('promotions: reading a live row back', () => {
  const read = mapToFirestore({
    id: 'p-1',
    code: 'KARIBU10',
    discount_value: 5000,
    discount_type: 'amount',
    usage_limit: 10,
    usage_count: 3,
    min_order_amount: 1000,
    valid_until: '2026-01-01T00:00:00.000Z',
    is_active: true,
    merchant_id: 'm-1',
  }, 'promotions');

  it('returns the camelCase names the route mapper prefers', () => {
    expect(read.discountValue).toBe(5000);
    expect(read.discountType).toBe('amount');
    expect(read.maxUses).toBe(10);
    expect(read.usageCount).toBe(3);
    expect(read.minOrder).toBe(1000);
    expect(read.expiresAt).toBe('2026-01-01T00:00:00.000Z');
    expect(read.isActive).toBe(true);
  });

  it('resolves a column shared by several logical names to the primary one', () => {
    // merchant_id is written by both merchantId and sellerId; the reverse map
    // must keep the first (merchantId), not the last.
    expect(read.merchantId).toBe('m-1');
  });
});

describe('products: the explicit reverse overrides must not regress', () => {
  const read = mapToFirestore({
    id: 'pr-1',
    name: 'Rice',
    seller_id: 'm-1',
    stock: 7,
    image_url: 'x.png',
    is_available: false,
  }, 'products');

  it('renames physical columns to the fields the app reads', () => {
    expect(read.sellerId).toBe('m-1');
    expect(read.stockQuantity).toBe(7);
    expect(read.imageUrl).toBe('x.png');
    expect(read.isAvailable).toBe(false);
  });

  it('still writes stockQuantity as stock', () => {
    expect(mapToSupabase({ stockQuantity: 4 }, 'products').stock).toBe(4);
  });
});

describe('unknown tables', () => {
  it('fall back to plain snake_case mapping', () => {
    const out = mapToSupabase({ someField: 1, otherThing: 'x' }, 'not_a_mapped_table');
    expect(out).toEqual({ some_field: 1, other_thing: 'x' });
  });
});
