import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  createOrderSchema,
  createProductSchema,
  updateProductSchema,
  paginationSchema,
  categoryFilterSchema
} = require('../validators/schemas');

describe('createOrderSchema', () => {
  it('accepts a valid order', () => {
    const result = createOrderSchema.parse({
      customerId: 'abc123',
      customerName: 'Test User',
      deliveryAddress: '123 Main St, City',
      items: [{ productId: 'p1', name: 'Item', quantity: 1, price: 1000, sellerId: 's1' }],
      total: 1000,
      sellerId: 's1'
    });
    expect(result.customerName).toBe('Test User');
    expect(result.items).toHaveLength(1);
  });

  it('rejects order with empty items', () => {
    expect(() => createOrderSchema.parse({
      customerId: 'abc123',
      customerName: 'Test',
      deliveryAddress: '123 St',
      items: [],
      total: 0,
      sellerId: 's1'
    })).toThrow();
  });

  it('rejects order missing required fields', () => {
    expect(() => createOrderSchema.parse({})).toThrow();
  });

  it('defaults paymentMethod to cash', () => {
    const result = createOrderSchema.parse({
      customerId: 'abc123',
      customerName: 'Test',
      deliveryAddress: '123 St',
      items: [{ productId: 'p1', name: 'Item', quantity: 1, price: 500, sellerId: 's1' }],
      total: 500,
      sellerId: 's1'
    });
    expect(result.paymentMethod).toBe('cash');
  });
});

describe('createProductSchema', () => {
  it('accepts valid product', () => {
    const result = createProductSchema.parse({
      name: 'Test Product',
      price: 2500,
      category: 'food'
    });
    expect(result.name).toBe('Test Product');
    expect(result.isAvailable).toBe(true);
  });

  it('rejects product without name', () => {
    expect(() => createProductSchema.parse({ price: 100, category: 'food' })).toThrow();
  });

  it('rejects negative price', () => {
    expect(() => createProductSchema.parse({ name: 'P', price: -1, category: 'food' })).toThrow();
  });
});

describe('paginationSchema', () => {
  it('defaults to page 1, limit 20', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('rejects limit over 100', () => {
    expect(() => paginationSchema.parse({ limit: '999' })).toThrow();
  });
});

describe('categoryFilterSchema', () => {
  it('accepts valid category', () => {
    const result = categoryFilterSchema.parse({ category: 'food' });
    expect(result.category).toBe('food');
  });

  it('rejects invalid category', () => {
    expect(() => categoryFilterSchema.parse({ category: 'invalid' })).toThrow();
  });
});
