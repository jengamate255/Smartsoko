import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let escrow, payment, calls, options;
const order = {
    id: '00000000-0000-4000-8000-000000000123',
    status: 'pending',
    payment_method: 'pesapal',
    payment_status: 'pending_confirmation',
    created_at: '2026-01-01T00:00:00Z',
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

beforeAll(() => {
    vi.stubEnv('SUPABASE_URL', 'https://finance.example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.stubEnv('PESAPAL_CONSUMER_KEY', 'test-key');
    vi.stubEnv('PESAPAL_CONSUMER_SECRET', 'test-secret');
    for (const path of ['../api/pesapal', '../server/src/services/escrow'])
        delete require.cache[require.resolve(path)];
    escrow = require('../server/src/services/escrow');
    payment = require('../api/pesapal');
});
afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});
beforeEach(() => {
    calls = [];
    options = { ledger: [], gateway: { status_code: 0 } };
    vi.stubGlobal('fetch', async (url, init = {}) => {
        const u = new URL(url);
        calls.push({ url: u, init });
        if (u.pathname.includes('RequestToken')) return response({ token: 'test-token' });
        if (u.pathname.includes('GetTransactionStatus')) return response(options.gateway);
        if (u.pathname.endsWith('/rpc/transition_order_escrow'))
            return options.rpcFailure
                ? response({ message: 'rolled back' }, 500)
                : response({ released: true });
        if (u.pathname.endsWith('/orders'))
            return response(init.method === 'PATCH' ? (options.changed ? [] : [order]) : [order]);
        if (u.pathname.endsWith('/payments')) {
            if (options.lookupFailure && init.method !== 'PATCH')
                return response({ message: 'unavailable' }, 503);
            return response(options.ledger);
        }
        throw new Error(`Unexpected request: ${url}`);
    });
});

describe('transactional escrow boundary', () => {
    it('performs release with one database transaction, not separate wallet writes', async () => {
        expect(await escrow.releaseEscrow(order.id)).toEqual({ released: true });
        expect(calls).toHaveLength(1);
        expect(JSON.parse(calls[0].init.body)).toMatchObject({
            p_order_id: order.id,
            p_action: 'release',
        });
    });
    it('propagates transaction failure without a partial-write fallback', async () => {
        options.rpcFailure = true;
        await expect(escrow.refundEscrow(order.id)).rejects.toThrow('500');
        expect(calls).toHaveLength(1);
    });
    it('never credits a prepaid driver inline after release or refund', () => {
        for (const status of ['held', 'released', 'refunded', 'disputed'])
            expect(escrow.escrowPaysDriver({ escrowStatus: status })).toBe(true);
        expect(escrow.escrowPaysDriver({ escrow_status: 'pending' })).toBe(false);
    });
});

describe('abandonment sweep fails closed', () => {
    it('leaves the order alone when the ledger cannot be read', async () => {
        options.lookupFailure = true;
        const result = await payment.cancelAbandonedPesapalOrders();
        expect(result.failed).toBe(1);
        expect(calls.filter(c => c.init.method === 'PATCH')).toHaveLength(0);
    });
    it('requires review for multiple payment attempts', async () => {
        options.ledger = [{ id: 'a' }, { id: 'b' }];
        expect((await payment.cancelAbandonedPesapalOrders()).unverifiable).toBe(1);
        expect(calls.filter(c => c.init.method === 'PATCH')).toHaveLength(0);
    });
    it('does not cancel a completed or untraceable payment', async () => {
        options.ledger = [{ id: 'a', status: 'completed', metadata: {} }];
        expect((await payment.cancelAbandonedPesapalOrders()).cancelled).toBe(0);
        options.ledger = [{ id: 'a', status: 'pending', metadata: {} }];
        expect((await payment.cancelAbandonedPesapalOrders()).cancelled).toBe(0);
        expect(calls.filter(c => c.init.method === 'PATCH')).toHaveLength(0);
    });
    it('does not treat an unknown gateway response as nonpayment', async () => {
        options.ledger = [
            { id: 'a', status: 'pending', metadata: { orderTrackingId: 'tracking' } },
        ];
        options.gateway = { error: { message: 'unavailable' } };
        expect((await payment.cancelAbandonedPesapalOrders()).failed).toBe(1);
        expect(calls.filter(c => c.init.method === 'PATCH')).toHaveLength(0);
    });
    it('uses conditional cancellation and does not mark a concurrently paid ledger cancelled', async () => {
        options.ledger = [
            { id: 'a', status: 'pending', metadata: { orderTrackingId: 'tracking' } },
        ];
        options.changed = true;
        expect((await payment.cancelAbandonedPesapalOrders()).cancelled).toBe(0);
        const patches = calls.filter(c => c.init.method === 'PATCH');
        expect(patches).toHaveLength(1);
        expect(patches[0].url.searchParams.get('payment_status')).toBe('eq.pending_confirmation');
        expect(patches[0].url.searchParams.get('escrow_status')).toBe('eq.pending');
        expect(patches[0].url.searchParams.get('total_paid')).toBe('is.null');
    });
});
