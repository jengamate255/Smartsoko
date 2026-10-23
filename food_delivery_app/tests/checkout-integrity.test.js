import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { quoteOrder, customerIdFor } = require('../server/src/services/checkout');
const { schemas } = require('../server/src/middleware/validate');
const { IdempotencyStore, idempotency } = require('../server/src/middleware/idempotency');
const seller = '00000000-0000-4000-8000-000000000001';
const customer = '00000000-0000-4000-8000-000000000010';
function database() {
    const data = {
        products: [
            {
                id: 'p1',
                name: 'Chapati',
                price: 5000,
                sellerId: seller,
                stock: 10,
                variations: 'Regular=0, Extra=+500',
            },
            { id: 'p2', name: 'Milk', price: 2000, sellerId: seller, stock: 20 },
        ],
        sellers: [{ id: seller, isOpen: true }],
        profiles: [{ id: customer, firebase_uid: 'firebase-customer' }],
        orders: [],
        promotions: [
            {
                id: 'promo',
                code: 'SAVE10',
                discountType: 'percentage',
                discountValue: 10,
                isActive: true,
                maxDiscount: 600,
            },
        ],
    };
    return {
        data,
        async get(c, id) {
            return data[c]?.find(x => x.id === id) || null;
        },
        async getAll(c) {
            return data[c] || [];
        },
        async where(c, k, op, v) {
            return (data[c] || []).filter(
                x => x[k] === v || (c === 'orders' && k === 'customerId' && x.customer_id === v)
            );
        },
        async add(c, d) {
            const row = { id: 'order-' + (data[c].length + 1), ...d };
            data[c].push(row);
            return row;
        },
    };
}
const basket = (changes = {}) => ({
    items: [
        {
            id: 'p1',
            name: 'Forged',
            price: 1,
            quantity: 2,
            variation: 'Extra',
            variationDelta: -4999,
        },
    ],
    ...changes,
});
describe('authoritative checkout pricing', () => {
    it('uses catalog name, price and variation, ignoring tampered cart fields', async () => {
        const q = await quoteOrder(database(), basket());
        expect(q.subtotal).toBe(11000);
        expect(q.items[0]).toMatchObject({ name: 'Chapati', price: 5000, variationDelta: 500 });
    });
    it('rejects nonexistent, unavailable, orphaned, and closed-seller products', async () => {
        const db = database();
        await expect(
            quoteOrder(db, basket({ items: [{ id: 'missing', quantity: 1 }] }))
        ).rejects.toMatchObject({ status: 404 });
        db.data.products[0].isAvailable = false;
        await expect(quoteOrder(db, basket())).rejects.toMatchObject({ status: 409 });
        delete db.data.products[0].isAvailable;
        delete db.data.products[0].sellerId;
        await expect(quoteOrder(db, basket())).rejects.toMatchObject({ status: 409 });
        db.data.products[0].sellerId = seller;
        db.data.sellers[0].isOpen = false;
        await expect(quoteOrder(db, basket())).rejects.toMatchObject({ status: 409 });
    });
    it('rejects mixed sellers and unknown options', async () => {
        const db = database();
        db.data.products[1].sellerId = '00000000-0000-4000-8000-000000000002';
        await expect(
            quoteOrder(
                db,
                basket({
                    items: [
                        { id: 'p1', quantity: 1 },
                        { id: 'p2', quantity: 1 },
                    ],
                })
            )
        ).rejects.toMatchObject({ status: 409 });
        await expect(
            quoteOrder(db, basket({ items: [{ id: 'p1', quantity: 1, variation: 'Fake' }] }))
        ).rejects.toMatchObject({ status: 409 });
    });
    it('aggregates duplicate product lines before checking stock', async () => {
        await expect(
            quoteOrder(
                database(),
                basket({
                    items: [
                        { id: 'p1', quantity: 6 },
                        { id: 'p1', quantity: 5 },
                    ],
                })
            )
        ).rejects.toMatchObject({ status: 409 });
    });
    it('prices delivery from the restaurant delivery_fee, not the platform default', async () => {
        const db = database();
        const config = { deliveryFee: 2000, taxRate: 0.18 };
        // Absent field → platform default (current behavior).
        expect((await quoteOrder(db, basket(), config)).deliveryFee).toBe(2000);
        // Explicit snake_case restaurant fee wins, including 0 = free delivery.
        db.data.sellers[0].delivery_fee = 1500;
        expect((await quoteOrder(db, basket(), config)).deliveryFee).toBe(1500);
        db.data.sellers[0].delivery_fee = 0;
        expect((await quoteOrder(db, basket(), config)).deliveryFee).toBe(0);
        // Invalid values fall back to the platform default.
        for (const bad of ['', -5, 'abc', null, undefined]) {
            db.data.sellers[0].delivery_fee = bad;
            expect((await quoteOrder(db, basket(), config)).deliveryFee).toBe(2000);
        }
        // camelCase sellers rows are honored too.
        delete db.data.sellers[0].delivery_fee;
        db.data.sellers[0].deliveryFee = 3000;
        expect((await quoteOrder(db, basket(), config)).deliveryFee).toBe(3000);
    });
    it('validates and caps discounts server-side', async () => {
        const db = database();
        const q = await quoteOrder(db, basket({ promoCode: 'save10' }));
        expect(q.discount).toBe(600);
        expect(q.total).toBe(q.subtotal + q.deliveryFee + q.taxAmount - 600);
        db.data.promotions[0].expiresAt = '2000-01-01';
        await expect(quoteOrder(db, basket({ promoCode: 'SAVE10' }))).rejects.toThrow(
            'not currently valid'
        );
    });
    it('maps verified Firebase UIDs to profiles and fails closed without one', async () => {
        expect(await customerIdFor(database(), { uid: 'firebase-customer' })).toBe(customer);
        await expect(customerIdFor(database(), { uid: 'unknown-firebase' })).rejects.toMatchObject({
            status: 409,
        });
    });
    it('accepts the real COD nullable fields and rejects unbounded quantities', () => {
        const body = {
            ...basket(),
            deliveryAddress: 'QA test address',
            customerName: 'QA',
            customerPhone: '255700000000',
            paymentMethod: 'cod',
            paymentNumber: null,
            deliveryLat: null,
            deliveryLng: null,
        };
        expect(schemas.order.safeParse(body).success).toBe(true);
        expect(
            schemas.order.safeParse({ ...body, items: [{ id: 'p1', quantity: 10001 }] }).success
        ).toBe(false);
    });
});

describe('checkout retry and ownership HTTP boundaries', () => {
    let server, base, db, directory, store;
    beforeAll(async () => {
        vi.stubEnv('ORDER_ACCESS_SECRET', 'isolated-qa-guest-signing-secret-32-bytes');
        const express = require('express');
        const { orderRoutes } = require('../server/src/routes/orders');
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smartsoko-checkout-'));
        store = new IdempotencyStore(directory);
        db = database();
        const app = express();
        app.use(express.json());
        app.set('db', db);
        app.set('config', { deliveryFee: 2000, taxRate: 0.18 });
        const optionalAuth = (req, res, next) => {
            if (req.headers['x-test-user'])
                req.user = { uid: req.headers['x-test-user'], roles: ['customer'] };
            next();
        };
        const verifyToken = (req, res, next) =>
            optionalAuth(req, res, () =>
                req.user ? next() : res.status(401).json({ error: 'No token' })
            );
        orderRoutes(app, {
            authMiddleware: { optionalAuth, verifyToken },
            idempotencyMiddleware: idempotency({ store }),
        });
        server = await new Promise(resolve => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        base = 'http://127.0.0.1:' + server.address().port;
    }, 120000);
    afterAll(async () => {
        vi.unstubAllEnvs();
        if (server) await new Promise(resolve => server.close(resolve));
        if (directory) fs.rmSync(directory, { recursive: true, force: true });
    });
    const post = (body, key, user = 'firebase-customer') =>
        fetch(base + '/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': key,
                'x-test-user': user,
            },
            body: JSON.stringify(body),
        });
    const order = () => ({
        ...basket(),
        deliveryAddress: 'QA test address',
        customerName: 'QA',
        customerPhone: '255700000000',
        paymentMethod: 'cod',
        paymentNumber: null,
        deliveryLat: null,
        deliveryLng: null,
    });
    it('creates one order for 20 concurrent retries and replays after store restart', async () => {
        const before = db.data.orders.length;
        const replies = await Promise.all(Array.from({ length: 20 }, () => post(order(), 'race')));
        expect(replies.every(r => [200, 409].includes(r.status))).toBe(true);
        expect(db.data.orders.length - before).toBe(1);
        const retry = await post(order(), 'race');
        expect(retry.status).toBe(200);
        expect(retry.headers.get('idempotency-replayed')).toBe('true');
        const saved = await retry.json();
        expect(saved.order.customer_id).toBe(customer);
        expect(saved.order.subtotal).toBe(11000);
        const reopened = new IdempotencyStore(directory);
        expect(fs.readdirSync(directory).filter(f => f.endsWith('.json')).length).toBe(1);
        expect(
            reopened.read(
                require('../server/src/middleware/idempotency').generateKey({
                    user: { uid: 'firebase-customer' },
                    headers: { 'idempotency-key': 'race' },
                    method: 'POST',
                    path: '/api/orders',
                    body: order(),
                })
            ).body.order.id
        ).toBe(saved.order.id);
    });
    it('rejects key reuse with a different payload', async () => {
        const r = await post({ ...order(), deliveryAddress: 'Changed test address' }, 'race');
        expect(r.status).toBe(409);
    });
    it('rejects stale quote totals without writing and permits a corrected retry', async () => {
        const before = db.data.orders.length;
        expect((await post({ ...order(), quotedTotal: 1 }, 'stale')).status).toBe(409);
        expect(db.data.orders.length).toBe(before);
        expect((await post(order(), 'stale')).status).toBe(200);
        expect(db.data.orders.length).toBe(before + 1);
    });
    it('history returns owned orders and detail denies another customer', async () => {
        const r = await fetch(base + '/api/orders', {
            headers: { 'x-test-user': 'firebase-customer' },
        });
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.orders.length).toBeGreaterThan(0);
        expect(body.orders.every(o => o.customer_id === customer)).toBe(true);
        const id = db.data.orders[0].id;
        const other = await fetch(base + '/api/orders/' + id, {
            headers: { 'x-test-user': '00000000-0000-4000-8000-000000000099' },
        });
        expect(other.status).toBe(403);
    });
    it('requires authentication for online order creation', async () => {
        expect(
            (await post({ ...order(), paymentMethod: 'pesapal' }, 'guest-online', '')).status
        ).toBe(401);
    });
    it('returns a database stock conflict as 409 and releases the retry key after rollback', async () => {
        const add = db.add.bind(db);
        const before = db.data.orders.length;
        db.add = async () => {
            throw Object.assign(new Error('Product unavailable or insufficient stock'), {
                code: 'P0001',
            });
        };
        try {
            expect((await post(order(), 'atomic-conflict')).status).toBe(409);
        } finally {
            db.add = add;
        }
        expect(db.data.orders).toHaveLength(before);
        expect((await post(order(), 'atomic-conflict')).status).toBe(200);
    });
    it('issues private guest tracking access scoped to one order', async () => {
        const r = await post(order(), 'guest-cod', '');
        expect(r.status).toBe(200);
        const saved = await r.json();
        expect(saved.accessToken).toBeTruthy();
        const own = await fetch(base + '/api/orders/' + saved.order.id, {
            headers: { 'x-order-access-token': saved.accessToken },
        });
        expect(own.status).toBe(200);
        expect((await fetch(base + '/api/orders/' + saved.order.id)).status).toBe(401);
        expect(
            (
                await fetch(base + '/api/orders/' + db.data.orders[0].id, {
                    headers: { 'x-order-access-token': saved.accessToken },
                })
            ).status
        ).toBe(401);
        expect(
            (
                await fetch(base + '/api/orders/' + saved.order.id, {
                    headers: { 'x-order-access-token': saved.accessToken + 'forged' },
                })
            ).status
        ).toBe(401);
    });
});
