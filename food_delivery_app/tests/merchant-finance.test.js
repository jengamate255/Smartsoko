import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const finance = require('../server/src/services/merchant-finance');
let server, base, rows, writes, failRead;
const seed = () => ({
    sellers: [
        { id: 'S-A', owner_id: 'P-A' },
        { id: 'S-B', owner_id: 'P-B' },
    ],
    vendors: [
        { id: 'V-A', profile_id: 'P-A', restaurant_id: 'R-A' },
        { id: 'V-B', profile_id: 'P-B', restaurant_id: 'R-B' },
    ],
    wallets: [
        { id: 'R-A', balance: 3000, total_earned: 8000, total_withdrawn: 5000 },
        { id: 'R-B', balance: 999999 },
    ],
    orders: [
        {
            id: 'held',
            restaurant_id: 'R-A',
            escrow_status: 'held',
            total_paid: 5540,
            delivery_fee: 2000,
            non_refundable_fee: 540,
        },
        {
            id: 'cod',
            restaurant_id: 'R-A',
            status: 'delivered',
            total: 900000,
            payment_method: 'cod',
        },
        { id: 'foreign', restaurant_id: 'R-B', escrow_status: 'held', total_paid: 999999 },
    ],
    vendor_payouts: [
        {
            id: 'own',
            wallet_id: 'R-A',
            vendor_id: 'V-A',
            order_id: 'paid',
            amount: 3000,
            status: 'pending',
        },
        { id: 'legacy', vendor_id: 'V-A', amount: 45000, status: 'pending' },
        { id: 'foreign', wallet_id: 'R-B', vendor_id: 'V-B', amount: 999999, status: 'pending' },
    ],
    merchant_payout_accounts: [{ id: 'S-B', status: 'verified', accountName: 'Other merchant' }],
});
const db = {
    async get(table, id) {
        if (failRead) throw new Error('Database unavailable');
        return (rows[table] || []).find(r => r.id === id) || null;
    },
    async where(table, key, op, value) {
        if (failRead) throw new Error('Database unavailable');
        return (rows[table] || []).filter(r => r[key] === value);
    },
    async set(table, id, data) {
        writes.push({ table, id, data });
        (rows[table] ||= []).push({ id, ...data, status: 'pending', revision: 1 });
    },
};
beforeEach(() => {
    rows = seed();
    writes = [];
    failRead = false;
});
beforeAll(async () => {
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use(
        '/finance',
        require('../server/src/routes/merchant-finance')({
            getDb: () => db,
            guard: () => [
                (req, res, next) => {
                    if (!req.headers['x-test-role']) return res.sendStatus(401);
                    req.user = { role: req.headers['x-test-role'], uid: 'staff-or-owner' };
                    req.merchantId = 'S-A'; // server-resolved tenant, never taken from body/query
                    next();
                },
            ],
            failDb: (res, error) => res.status(503).json({ success: false, error: error.message }),
        })
    );
    server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}/finance`;
});
afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
});
const request = (path, method = 'GET', body, role = 'merchant') =>
    fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

describe('merchant finance source of truth', () => {
    it('uses released wallets, not delivered COD totals or a guessed commission', async () => {
        expect(await finance.balance(db, 'S-A')).toMatchObject({
            availableBalance: 3000,
            pendingBalance: 3000,
            lifetimeEarnings: 8000,
            totalWithdrawn: 5000,
            queuedPayouts: 3000,
        });
    });
    it('isolates histories and deduplicates wallet/vendor matches', async () => {
        const result = await (await request('/payouts?merchantId=S-B')).json();
        expect(result.data.map(p => p.id).sort()).toEqual(['legacy', 'own']);
    });
    it('does not invent restaurant links when an owner has no vendor mapping', async () => {
        rows.vendors = [];
        expect((await finance.context(db, 'S-A')).walletIds).toEqual(['S-A']);
    });
    it('understands the actual dual-db camelCase read shapes', async () => {
        const { mapToFirestore } = require('../lib/server-db');
        const mappedDb = {
            ...db,
            async get(table, id) {
                const row = await db.get(table, id);
                return row && mapToFirestore(row, table);
            },
            async where(...args) {
                return (await db.where(...args)).map(row => mapToFirestore(row, args[0]));
            },
        };
        expect((await finance.context(mappedDb, 'S-A')).walletIds).toEqual(['S-A', 'R-A']);
        expect(await finance.balance(mappedDb, 'S-A')).toMatchObject({
            availableBalance: 3000,
            pendingBalance: 3000,
        });
    });
    it('fails closed when multiple stores make the restaurant link ambiguous', async () => {
        rows.sellers.push({ id: 'S-A2', owner_id: 'P-A' });
        await expect(finance.context(db, 'S-A')).rejects.toThrow('ambiguous');
    });
    it('never presents a failed database read as zero earnings', async () => {
        failRead = true;
        expect((await request('/balance')).status).toBe(503);
    });
    it('prevents duplicate withdrawal requests for already queued releases', async () => {
        expect((await request('/payout', 'POST', { amount: 3000 })).status).toBe(409);
        expect(writes).toHaveLength(0);
    });
});

describe('merchant payout details', () => {
    const details = {
        method: 'mobile_money',
        accountName: 'Test Merchant',
        phoneNumber: '0712345678',
    };
    it('normalizes Tanzania numbers and discards self-verification/foreign tenant fields', async () => {
        expect(
            (
                await request('/payout-details', 'PUT', {
                    ...details,
                    id: 'S-B',
                    merchantId: 'S-B',
                    status: 'verified',
                    revision: 99,
                })
            ).status
        ).toBe(200);
        expect(writes).toEqual([
            {
                table: 'merchant_payout_accounts',
                id: 'S-A',
                data: {
                    method: 'mobile_money',
                    account_name: 'Test Merchant',
                    phone_number: '+255712345678',
                    bank_name: null,
                    account_number: null,
                },
            },
        ]);
    });
    it('requires a session and restricts edits to store owners, not accountants', async () => {
        expect((await request('/payout-details', 'PUT', details, null)).status).toBe(401);
        expect((await request('/payout-details', 'PUT', details, 'accountant')).status).toBe(403);
        expect(writes).toHaveLength(0);
    });
    it('does not expose another store payout account', async () => {
        expect((await (await request('/payout-details?merchantId=S-B')).json()).data).toBeNull();
    });
    it('patches existing details without supplying approval or insert defaults', async () => {
        let patch;
        const existing = { id: 'S-A', status: 'verified', revision: 1 };
        await finance.saveAccount(
            {
                async get() {
                    return existing;
                },
                async update(table, id, data) {
                    patch = { table, id, data };
                },
                async set() {
                    throw new Error('Should not upsert an existing account');
                },
            },
            'S-A',
            details
        );
        expect(patch.id).toBe('S-A');
        expect(patch.data.status).toBeUndefined();
        expect(patch.data.revision).toBeUndefined();
    });
    it('rejects malformed phone/bank details before writing', async () => {
        expect(
            (await request('/payout-details', 'PUT', { ...details, phoneNumber: '123' })).status
        ).toBe(400);
        expect(() =>
            finance.validateAccount({
                method: 'bank_transfer',
                accountName: 'Test Merchant',
                bankName: 'Bank',
                accountNumber: '<script>',
            })
        ).toThrow('Invalid bank account');
        expect(writes).toHaveLength(0);
    });
});
