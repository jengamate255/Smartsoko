import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let server, base, complete, rpc;
const id = '00000000-0000-4000-8000-000000000123';

beforeAll(async () => {
    vi.stubEnv('ALLOW_ANON_ADMIN', 'true'); // money endpoint must still require a session
    const express = require('express');
    const escrow = require('../server/src/services/escrow');
    complete = vi.spyOn(escrow, 'completeVendorPayout');
    rpc = vi.spyOn(escrow, 'rpc');
    const app = express();
    app.use(express.json());
    app.set('db', {
        async getAll() {
            return [];
        },
    });
    app.set('authMiddleware', {
        optionalAuth(req, res, next) {
            if (req.headers['x-test-role'])
                req.user = { uid: 'test-admin', role: req.headers['x-test-role'] };
            next();
        },
    });
    require('../server/src/routes/admin-extended').adminExtendedRoutes(app);
    server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
    complete.mockReset().mockResolvedValue({ success: true, payout_id: id });
    rpc.mockReset().mockResolvedValue({ success: true, status: 'verified' });
});
afterAll(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (server) await new Promise(resolve => server.close(resolve));
});
const post = (role, body, payout = id) =>
    fetch(`${base}/api/admin/payouts/${payout}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
        body: JSON.stringify({ merchantId: id, revision: 1, ...body }),
    });

describe('manual payout recording', () => {
    it('rejects anonymous users even when anonymous admin mode is enabled', async () => {
        expect((await post(null, { transactionRef: 'MPESA-REF' })).status).toBe(401);
        expect(complete).not.toHaveBeenCalled();
    });
    it('rejects non-admin users', async () => {
        expect((await post('merchant', { transactionRef: 'MPESA-REF' })).status).toBe(403);
        expect(complete).not.toHaveBeenCalled();
    });
    it('requires a valid payout id and a transfer reference', async () => {
        expect((await post('admin', {})).status).toBe(400);
        expect((await post('admin', { transactionRef: 'REF' }, 'bad-id')).status).toBe(400);
        expect(complete).not.toHaveBeenCalled();
    });
    it('records a transfer with the atomic wallet-debit function', async () => {
        expect((await post('admin', { transactionRef: ' MPESA-REF ' })).status).toBe(200);
        expect(complete).toHaveBeenCalledWith(id, {
            merchantId: id,
            revision: 1,
            transactionRef: 'MPESA-REF',
            note: null,
        });
    });
    it('returns a conflict when a payout was already completed', async () => {
        complete.mockResolvedValue({ success: false, error: 'payout already paid' });
        expect((await post('admin', { transactionRef: 'REF' })).status).toBe(409);
    });
    it('requires the reviewed account revision when recording a transfer', async () => {
        expect((await post('admin', { transactionRef: 'REF', revision: null })).status).toBe(400);
        expect(complete).not.toHaveBeenCalled();
    });
});

describe('admin destination verification', () => {
    const verify = (role, body) =>
        fetch(`${base}/api/admin/payout-accounts/${id}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(role ? { 'x-test-role': role } : {}),
            },
            body: JSON.stringify(body),
        });
    it('requires admin authentication and independent-review confirmation', async () => {
        expect((await verify(null, { revision: 1, confirmed: true })).status).toBe(401);
        expect((await verify('merchant', { revision: 1, confirmed: true })).status).toBe(403);
        expect((await verify('admin', { revision: 1 })).status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
    });
    it('uses the authenticated reviewer identity, not one provided by the caller', async () => {
        expect(
            (await verify('admin', { revision: 2, confirmed: true, actor: 'attacker' })).status
        ).toBe(200);
        expect(rpc).toHaveBeenCalledWith('verify_merchant_payout_account', {
            p_merchant_id: id,
            p_revision: 2,
            p_actor: 'test-admin',
        });
    });
    it('does not expose payout account details anonymously', async () => {
        expect((await fetch(`${base}/api/admin/payout-accounts`)).status).toBe(401);
    });
});
