import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const customer = '00000000-0000-4000-8000-000000000010';
describe('PesaPal uses saved order totals', () => {
    let server,
        base,
        vendorCalls = [],
        originalFetch;
    beforeAll(async () => {
        vi.stubEnv('PESAPAL_CONSUMER_KEY', '');
        vi.stubEnv('PESAPAL_CONSUMER_SECRET', '');
        const express = require('express');
        const payment = require('../api/pesapal');
        await payment.init(null, {
            verifyToken(req, res, next) {
                req.user = { uid: customer, email: 'qa@example.invalid' };
                next();
            },
        });
        const app = express();
        app.use(express.json());
        app.set('db', {
            async get(c, id) {
                return id === 'mine'
                    ? {
                          id,
                          customerId: customer,
                          total: 3180,
                          paymentStatus: 'pending_confirmation',
                          customerName: 'QA Tester',
                          customerPhone: '255700000000',
                      }
                    : id === 'other'
                      ? { id, customerId: 'other-user', total: 3180 }
                      : null;
            },
        });
        app.use('/pay', payment);
        server = await new Promise(resolve => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        base = 'http://127.0.0.1:' + server.address().port;
        originalFetch = global.fetch;
        vi.stubGlobal('fetch', async (url, options) => {
            if (String(url).startsWith(base)) return originalFetch(url, options);
            vendorCalls.push({ url: String(url), body: options?.body && JSON.parse(options.body) });
            const body = String(url).includes('RequestToken')
                ? { token: 'qa-token' }
                : String(url).includes('RegisterIPN')
                  ? { ipn_id: 'qa-ipn' }
                  : String(url).includes('GetTransactionStatus')
                    ? {
                          status_code: 1,
                          payment_status_description: 'COMPLETED',
                          merchant_reference: 'INV-1',
                          amount: 3180,
                          currency: 'TZS',
                          status: '200',
                      }
                    : {
                          order_tracking_id: 'qa-tracking',
                          redirect_url: 'https://example.invalid/qa-payment',
                      };
            return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        });
    }, 120000);
    afterAll(async () => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        if (server) await new Promise(r => server.close(r));
    });
    const pay = body =>
        fetch(base + '/pay/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    it('ignores a tampered amount and callback URL', async () => {
        const r = await pay({
            orderId: 'mine',
            amount: 1,
            callbackUrl: 'https://example.invalid/attacker',
        });
        expect(r.status).toBe(200);
        const sent = vendorCalls.find(c => c.url.includes('SubmitOrderRequest'));
        expect(Number(sent.body.amount)).toBe(3180);
        expect(sent.body.callback_url).toContain('/api/payments/pesapal/callback?orderId=mine');
        expect(sent.body.callback_url).not.toContain('attacker');
    });
    it('rejects a foreign or nonexistent order before contacting the payment provider', async () => {
        const before = vendorCalls.length;
        expect((await pay({ orderId: 'other', amount: 1 })).status).toBe(403);
        expect((await pay({ orderId: 'missing', amount: 1 })).status).toBe(404);
        expect((await pay({ amount: 1 })).status).toBe(400);
        expect(vendorCalls.length).toBe(before);
    });
    it('settles an IPN from PesaPal status, not from the notification payload', async () => {
        // API 3.0 IPN bodies are {OrderNotificationType:"IPNCHANGE",
        // OrderTrackingId, OrderMerchantReference} and deliberately carry no
        // payment status, so the handler must call GetTransactionStatus. It also
        // required a signature header and read only `MerchantReference`, which
        // matched no ledger row — so every settled payment went unrecorded.
        const before = vendorCalls.length;
        const r = await fetch(base + '/pay/ipn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                OrderNotificationType: 'IPNCHANGE',
                OrderTrackingId: 'qa-tracking',
                OrderMerchantReference: 'INV-1',
            }),
        });
        expect(r.status).toBe(200);
        expect(await r.json()).toMatchObject({
            orderTrackingId: 'qa-tracking',
            orderMerchantReference: 'INV-1',
            status: 200,
        });
        const statusLookup = vendorCalls
            .slice(before)
            .find(c => c.url.includes('GetTransactionStatus'));
        expect(statusLookup).toBeTruthy();
        expect(statusLookup.url).toContain('qa-tracking');
    });
});

describe('PesaPal settlement amount guard', () => {
    // A COMPLETED status alone is not proof of payment: GetTransactionStatus
    // also reports the amount and currency, and an order must never be marked
    // paid for money that does not match its quote.
    it('accepts exactly the quoted amount in TZS', () => {
        const { amountMismatch } = require('../api/pesapal');
        expect(amountMismatch(5540, { amount: 5540, currency: 'TZS' })).toBeNull();
        expect(amountMismatch('5540', { amount: 5540, currency: 'tzs' })).toBeNull();
        expect(amountMismatch(5540, { amount: 5540 })).toBeNull(); // currency may be absent
    });

    it('refuses a partial payment, a currency mix-up, or an unreadable amount', () => {
        const { amountMismatch } = require('../api/pesapal');
        expect(amountMismatch(5540, { amount: 540, currency: 'TZS' })).toContain(
            '540 != expected 5540'
        );
        expect(amountMismatch(5540, { amount: '5540.50', currency: 'TZS' })).toContain(
            '!= expected 5540'
        );
        expect(amountMismatch(5540, { amount: 5540, currency: 'USD' })).toContain('USD');
        expect(amountMismatch(5540, { amount: 5540, currency: 'TZS ' })).toBeNull();
        expect(amountMismatch(undefined, { amount: 5540, currency: 'TZS' })).toContain(
            'unreadable'
        );
        expect(amountMismatch(5540, { currency: 'TZS' })).toContain('unreadable');
    });
});

describe('escrow split', () => {
    // Delivery releases the hold, and this split decides who is owed what, so it
    // has to match the seeded escrow_holds rows (total = seller + driver +
    // platform) instead of being recomputed per release path.
    it('divides a payment into seller, driver and platform shares', () => {
        const { splitOf } = require('../server/src/services/escrow');
        const split = splitOf(
            { total_paid: 5540, delivery_fee: 2000, non_refundable_fee: 0 },
            5540
        );
        expect(split).toEqual({ paid: 5540, seller: 3540, driver: 2000, platform: 0 });
        expect(split.seller + split.driver + split.platform).toBe(split.paid);
    });

    it('keeps the platform fee and never pays out a negative seller share', () => {
        const { splitOf } = require('../server/src/services/escrow');
        const withFee = splitOf(
            { total_paid: 10000, delivery_fee: 2000, non_refundable_fee: 500 },
            10000
        );
        expect(withFee.platform).toBe(500);
        expect(withFee.seller).toBe(7500);
        const underwater = splitOf(
            { total_paid: 1000, delivery_fee: 2000, non_refundable_fee: 0 },
            1000
        );
        expect(underwater.seller).toBe(0);
    });
});

describe('abandoned PesaPal orders', () => {
    // An order that chose PesaPal and never paid would otherwise sit at
    // pending_confirmation forever. Age is decided by the sweep's query; these
    // are the orders that must never be cancelled regardless of age.
    it('cancels only unpaid PesaPal orders that are still open', () => {
        const { shouldCancelAbandonedOrder } = require('../api/pesapal');
        const base = {
            id: 'o1',
            payment_method: 'pesapal',
            payment_status: 'pending_confirmation',
            status: 'pending',
        };
        expect(shouldCancelAbandonedOrder(base)).toBe(true);
        expect(shouldCancelAbandonedOrder({ ...base, status: 'ready_for_delivery' })).toBe(true);
        expect(shouldCancelAbandonedOrder({ ...base, status: 'COMPLETED' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, status: 'delivered' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, status: 'cancelled' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, status: 'refunded' })).toBe(false);
    });

    it('never touches a paid, non-PesaPal or unidentified order', () => {
        const { shouldCancelAbandonedOrder } = require('../api/pesapal');
        const base = {
            id: 'o1',
            payment_method: 'pesapal',
            payment_status: 'pending_confirmation',
            status: 'pending',
        };
        expect(shouldCancelAbandonedOrder({ ...base, payment_status: 'paid' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, payment_status: 'cod' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, payment_method: 'cod' })).toBe(false);
        expect(shouldCancelAbandonedOrder({ ...base, id: null })).toBe(false);
        expect(shouldCancelAbandonedOrder(null)).toBe(false);
        // camelCase rows (the dual-db adapter's shape) behave the same
        expect(
            shouldCancelAbandonedOrder({
                id: 'o1',
                paymentMethod: 'pesapal',
                paymentStatus: 'pending_confirmation',
                status: 'pending',
            })
        ).toBe(true);
    });
});

describe('escrow-aware driver payout', () => {
    // A prepaid order pays the driver out of the escrow hold at release, so the
    // inline "credit the driver on delivery" path must skip it — otherwise the
    // delivery fee is paid twice (once inline, once by the release).
    it('flags escrow-held orders so the inline driver credit is skipped', () => {
        const { escrowHeld } = require('../server/src/services/escrow');
        expect(escrowHeld({ escrow_status: 'held' })).toBe(true);
        expect(escrowHeld({ escrowStatus: 'HELD' })).toBe(true);
        expect(escrowHeld({ escrow_status: 'pending' })).toBe(false);
        expect(escrowHeld({ escrow_status: 'released' })).toBe(false);
        expect(escrowHeld({})).toBe(false);
        expect(escrowHeld(null)).toBe(false);
    });
});

describe('status-by-ref ownership and IPN rate limit', () => {
    // /status-by-ref used to return the full payments row to anyone who knew a
    // reference, and /ipn (whose signature check fails open by design) was
    // infinitely replayable. Both need only a cheap fixture to prove.
    let server, base, originalFetch, payment;
    beforeAll(async () => {
        vi.stubEnv('PESAPAL_CONSUMER_KEY', '');
        vi.stubEnv('PESAPAL_CONSUMER_SECRET', '');
        const express = require('express');
        payment = require('../api/pesapal');
        await payment.init(
            {
                collection() {
                    return {
                        where() {
                            return this;
                        },
                        limit() {
                            return this;
                        },
                        async get() {
                            return {
                                empty: false,
                                docs: [
                                    {
                                        id: 'payment-doc-1',
                                        data: () => ({
                                            merchantReference: 'INV-TEST-REF',
                                            // Fields that must never leave the server:
                                            email: 'other@example.invalid',
                                            profileId: 'other-user',
                                            internalNotes: 'fraud watchlist',
                                            status: 'completed',
                                            amount: 3180,
                                            currency: 'TZS',
                                            orderTrackingId: 'qa-tracking',
                                            metadata: { orderId: 'order-1' },
                                        }),
                                    },
                                ],
                            };
                        },
                    };
                },
            },
            {
                verifyToken(req, res, next) {
                    req.user = { uid: customer, email: 'qa@example.invalid' };
                    next();
                },
            }
        );
        const app = express();
        app.use(express.json());
        app.use('/pay', payment);
        server = await new Promise(resolve => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        base = 'http://127.0.0.1:' + server.address().port;
        // Keep the test hermetic: anything the route tries outside this server
        // (e.g. a Supabase ledger lookup, when one is configured) answers
        // "no rows" instead of touching the network.
        originalFetch = global.fetch;
        vi.stubGlobal('fetch', async (url, options) => {
            if (String(url).startsWith(base)) return originalFetch(url, options);
            return new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        });
    });
    afterAll(async () => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        if (server) await new Promise(r => server.close(r));
    });

    const statusByRef = ref =>
        fetch(base + '/pay/status-by-ref/' + encodeURIComponent(ref)).then(r => r.status);

    it('refuses a reference that cannot be linked to the caller', async () => {
        // Fail-closed by design: Firestore mirror rows carry no owner, so a
        // reference neither the topup map nor a ledger row can attribute to
        // the caller is denied rather than leaked.
        expect(await statusByRef('INV-NO-TOPUP')).toBe(403);
    });

    it('refuses a reference owned by another user', async () => {
        payment.topupOrders.set('foreign-tracking', {
            profileId: 'other-user',
            email: 'other@example.invalid',
            merchantReference: 'INV-FOREIGN-REF',
        });
        expect(await statusByRef('INV-FOREIGN-REF')).toBe(403);
    });

    it('returns only the poller fields for the owner', async () => {
        const { topupOrders } = payment;
        topupOrders.set('qa-tracking', {
            profileId: customer,
            email: 'qa@example.invalid',
            merchantReference: 'INV-TEST-REF',
        });
        const r = await fetch(base + '/pay/status-by-ref/INV-TEST-REF');
        expect(r.status).toBe(200);
        const payload = await r.json();
        expect(payload.success).toBe(true);
        expect(payload.data).toMatchObject({
            merchantReference: 'INV-TEST-REF',
            status: 'completed',
            amount: 3180,
            currency: 'TZS',
            orderTrackingId: 'qa-tracking',
            orderId: 'order-1',
        });
        expect(Object.keys(payload.data).sort()).toEqual(
            [
                'amount',
                'createdAt',
                'currency',
                'id',
                'merchantReference',
                'orderId',
                'orderTrackingId',
                'status',
            ].sort()
        );
        expect(JSON.stringify(payload)).not.toContain('other@example.invalid');
        expect(JSON.stringify(payload)).not.toContain('other-user');
        expect(JSON.stringify(payload)).not.toContain('fraud watchlist');
    });

    it('rate limits /ipn at about five requests per minute per IP', async () => {
        const ipn = ip =>
            fetch(base + '/pay/ipn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
                body: JSON.stringify({ OrderTrackingId: 'qa-tracking' }),
            }).then(r => r.status);
        // Right-most XFF entry is trusted (a real proxy appends the client);
        // requests 1-5 pass, anything beyond within the window gets 429.
        const codes = [];
        for (let i = 0; i < 8; i++) codes.push(await ipn('203.0.113.9, 10.0.0.1'));
        codes.slice(0, 5).forEach(c => expect(c).toBe(200));
        codes.slice(5).forEach(c => expect(c).toBe(429));
        // A different IP is unaffected by the first bucket.
        expect(await ipn('198.51.100.1')).toBe(200);
    });
});
