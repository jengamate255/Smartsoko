/**
 * Security regression tests for the hardened legacy routes:
 *   - server/src/routes/driver.js  (auth gate + tenancy on every rider route)
 *   - server/src/routes/features.js (gift-card admin gate, redeem/referrals
 *     gated to the authenticated session identity)
 * Same approach as tests/merchant-os/merchant-api.test.js: injection-stubbed
 * token verifier → real express middleware chain → memory db.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';

// driver/complete triggers escrow release; neutralize it unless no Supabase
// env is configured (the handler catches and warns instead of HTTP calling).
const _prevSupabaseUrl = process.env.SUPABASE_URL;
const _prevSupabaseKey = process.env.SUPABASE_SERVICE_KEY;
const _prevSupabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_URL = '';
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// Stub token verifier injected via riderRoutes({ authMiddleware }) /
// app.set('authMiddleware'). Token format: "uid:<uid>:role:<role>".
function stubVerifyToken(req, res, next) {
    const hdr = req.headers.authorization || '';
    const parts = hdr.startsWith('Bearer ') ? hdr.slice(7).split(':') : [];
    if (parts[0] !== 'uid' || !parts[1]) {
        return res.status(401).json({ success: false, error: 'no token' });
    }
    const role = parts[3] || 'customer';
    req.user = { uid: parts[1], role, roles: [role], email: parts[1] + '@test.tz' };
    next();
}

function memoryDb(seed = {}) {
    const store = JSON.parse(JSON.stringify(seed));
    return {
        async getAll(col) {
            return store[col] || [];
        },
        async get(col, id) {
            return (store[col] || []).find(d => d.id === id) || null;
        },
        async add(col, data) {
            const id = col.slice(0, 2) + '-' + Math.random().toString(36).slice(2, 8);
            (store[col] = store[col] || []).push({ id, ...data });
            return { id };
        },
        async set(col, id, data) {
            const rows = (store[col] = store[col] || []);
            const doc = rows.find(d => d.id === id);
            if (doc) Object.assign(doc, data);
            else rows.push({ id, ...data });
            return { id };
        },
        async update(col, id, patch) {
            const doc = (store[col] || []).find(d => d.id === id);
            if (doc) Object.assign(doc, patch);
            return doc;
        },
        async delete(col, id) {
            store[col] = (store[col] || []).filter(d => d.id !== id);
        },
        async where(col, f, op, v) {
            return (store[col] || []).filter(d => d[f] === v);
        },
    };
}

// ─── minimal in-process http helpers (no supertest dep) ────────────────────
function req(server, method, path, headers = {}, body) {
    return new Promise((resolve, reject) => {
        if (!server.listening) {
            server.listen(0, '127.0.0.1', () => {
                req(server, method, path, headers, body).then(resolve, reject);
            });
            return;
        }
        const payload = body ? JSON.stringify(body) : null;
        const r = http.request({
            host: '127.0.0.1',
            port: server.address().port,
            method,
            path,
            headers: {
                ...(payload
                    ? {
                          'content-type': 'application/json',
                          'content-length': Buffer.byteLength(payload),
                      }
                    : {}),
                ...headers,
            },
        });
        r.on('error', reject);
        r.on('response', res => {
            let raw = '';
            res.on('data', c => (raw += c));
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(raw);
                } catch (_) {}
                resolve({ status: res.statusCode, body: parsed || {} });
            });
        });
        if (payload) r.write(payload);
        r.end();
    });
}

function close(server) {
    if (server.listening) server.close();
}

function auth(uid, role = 'driver') {
    return { Authorization: `Bearer uid:${uid}:role:${role}` };
}

const DRIVER_SEED = {
    drivers: [
        { id: 'drv-1', firebase_uid: 'u-drv', name: 'Amir' },
        { id: 'drv-2', firebase_uid: 'u-drv2', name: 'Bele' },
    ],
    orders: [
        { id: 'o1', status: 'ready_for_delivery', driverId: null, deliveryFee: 2000 },
        { id: 'o2', status: 'in_transit', driverId: 'drv-1', deliveryFee: 2000 },
        { id: 'o3', status: 'in_transit', driverId: 'drv-2', deliveryFee: 2000 },
        { id: 'o4', status: 'pending', driverId: 'drv-1', deliveryFee: 2000 },
    ],
    wallets: [{ id: 'drv-1', balance: 0, totalEarned: 0, totalDeliveries: 0 }],
};

const FEATURE_SEED = {
    giftCards: [
        { id: 'gc-ok', code: 'GIFT10', balance: 1000, isRedeemed: false },
        { id: 'gc-used', code: 'GIFTDONE', balance: 5000, isRedeemed: true },
    ],
    wallets: [{ id: 'u-user', balance: 0 }],
    referrals: [
        {
            id: 'r-other',
            referrerId: 'u-stranger',
            refereeId: 'u-newbie',
            rewardAmount: 5000,
            rewardType: 'wallet_credit',
            status: 'pending',
        },
    ],
};

describe('rider routes — auth gate & tenancy', () => {
    let server;
    let db;
    beforeAll(async () => {
        const express = (await import('express')).default;
        const { riderRoutes } = await import('../server/src/routes/driver.js');
        db = memoryDb(DRIVER_SEED);
        const expressApp = express();
        expressApp.use(express.json());
        expressApp.set('db', db);
        expressApp.use('/api/driver', riderRoutes({ authMiddleware: stubVerifyToken }));
        server = http.createServer(expressApp);
    });
    afterAll(() => close(server));

    it('rejects anonymous sessions with 401', async () => {
        const avail = await req(server, 'GET', '/api/driver/available-orders');
        expect(avail.status).toBe(401);
        const accept = await req(
            server,
            'PUT',
            '/api/driver/orders/o1/accept',
            {},
            { driverId: 'hacker' }
        );
        expect(accept.status).toBe(401);
    });

    it('rejects non-driver roles with 403', async () => {
        const res = await req(
            server,
            'GET',
            '/api/driver/available-orders',
            auth('u-cust', 'customer')
        );
        expect(res.status).toBe(403);
    });

    it('serves available-orders to a driver role', async () => {
        const res = await req(server, 'GET', '/api/driver/available-orders', auth('u-drv'));
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('accept sets driverId from the session, never from body', async () => {
        const res = await req(server, 'PUT', '/api/driver/orders/o1/accept', auth('u-drv'), {
            driverId: 'u-attacker-id',
            driverName: 'Attacker',
        });
        expect(res.status).toBe(200);
        const o1 = (await db.where('orders', 'id', '==', 'o1'))[0];
        expect(o1.driverId).toBe('drv-1');
        expect(o1.driverName).toBe('Amir');
        expect(o1.driverId).not.toBe('u-attacker-id');
    });

    it('accept fails closed without a driver row (403 NO_DRIVER_PROFILE)', async () => {
        const res = await req(server, 'PUT', '/api/driver/orders/o4/accept', auth('u-nodriver'), {
            driverId: 'o4',
        });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('NO_DRIVER_PROFILE');
    });

    it('complete credits only the authenticated driver and blocks others', async () => {
        const foreign = await req(server, 'PUT', '/api/driver/orders/o2/complete', auth('u-drv2'), {
            driverId: 'u-drv2',
        });
        expect(foreign.status).toBe(403);

        const ok = await req(server, 'PUT', '/api/driver/orders/o2/complete', auth('u-drv'), {});
        expect(ok.status).toBe(200);
        const wallet = (await db.where('wallets', 'id', '==', 'drv-1'))[0];
        expect(wallet.balance).toBe(2000);
        expect(wallet.totalDeliveries).toBe(1);
        const o2 = (await db.where('orders', 'id', '==', 'o2'))[0];
        expect(o2.status).toBe('delivered');
    });

    it('complete reapplies idempotently after first completion', async () => {
        const again = await req(server, 'PUT', '/api/driver/orders/o2/complete', auth('u-drv'), {});
        expect(again.status).toBe(409);
    });

    it('status route validates transition strings and ownership', async () => {
        const bad = await req(server, 'PUT', '/api/driver/orders/o2/status', auth('u-drv'), {
            status: 'PWNED_STATUS',
        });
        expect(bad.status).toBe(400);
        const foreign = await req(server, 'PUT', '/api/driver/orders/o2/status', auth('u-drv2'), {
            status: 'delivered',
        });
        expect(foreign.status).toBe(403);
        // canonical edge from the delivered state (delivered → completed) is fine
        const ok = await req(server, 'PUT', '/api/driver/orders/o2/status', auth('u-drv'), {
            status: 'completed',
        });
        expect(ok.status).toBe(200);
    });

    it("/:driverId/earnings only serves the driver's own id", async () => {
        const other = await req(server, 'GET', '/api/driver/drv-1/earnings', auth('u-drv2'));
        expect(other.status).toBe(403);
        const mine = await req(server, 'GET', '/api/driver/drv-1/earnings', auth('u-drv'));
        expect(mine.status).toBe(200);
        expect(typeof mine.body.balance).toBe('number');
    });
});

describe('feature routes — gift cards & referrals', () => {
    let server;
    let db;
    beforeAll(async () => {
        const express = (await import('express')).default;
        const featuresRouter = (await import('../server/src/routes/features.js')).default;
        db = memoryDb(FEATURE_SEED);
        const expressApp = express();
        expressApp.use(express.json());
        expressApp.set('db', db);
        expressApp.set('authMiddleware', {
            optionalAuth(req, res, next) {
                // Resolves the same stub token format; anon stays unsigned-in.
                const hdr = req.headers.authorization || '';
                const parts = hdr.startsWith('Bearer ') ? hdr.slice(7).split(':') : [];
                if (parts[0] === 'uid' && parts[1]) {
                    const role = parts[3] || 'customer';
                    req.user = { uid: parts[1], role, roles: [role] };
                }
                next();
            },
            verifyToken: stubVerifyToken,
        });
        expressApp.use('/api', featuresRouter);
        server = http.createServer(expressApp);
    });
    afterAll(() => close(server));

    it('gift card creation is admin-only (401 anon, 403 customer, 200 admin)', async () => {
        const anon = await req(server, 'POST', '/api/gift-cards', {}, { code: 'X1', amount: 100 });
        expect(anon.status).toBe(401);
        const cust = await req(server, 'POST', '/api/gift-cards', auth('u-cust', 'customer'), {
            code: 'X1',
            amount: 100,
        });
        expect(cust.status).toBe(403);
        const admin = await req(server, 'POST', '/api/gift-cards', auth('u-admin', 'admin'), {
            code: 'X1',
            amount: 100,
        });
        expect(admin.status).toBe(200);
        const row = (await db.where('giftCards', 'code', '==', 'X1'))[0];
        expect(row.isRedeemed).toBe(false);
    });

    it('redeem requires auth and credits the session user, ignoring body userId', async () => {
        const anon = await req(server, 'POST', '/api/gift-cards/redeem', {}, { code: 'gift10' });
        expect(anon.status).toBe(401);

        const res = await req(server, 'POST', '/api/gift-cards/redeem', auth('u-user'), {
            code: 'gift10',
            userId: 'u-victim',
        });
        expect(res.status).toBe(200);
        expect(res.body.newBalance).toBe(1000);
        const wallet = (await db.where('wallets', 'id', '==', 'u-user'))[0];
        expect(wallet.balance).toBe(1000); // u-victim's wallet untouched (it doesn't exist)
        const card = (await db.where('giftCards', 'id', '==', 'gc-ok'))[0];
        expect(card.isRedeemed).toBe(true);
        expect(card.redeemedBy).toBe('u-user');
    });

    it('double redeem of the same code fails', async () => {
        const again = await req(server, 'POST', '/api/gift-cards/redeem', auth('u-user'), {
            code: 'GIFT10',
        });
        expect(again.status).toBe(400);
        expect(again.body.error).toMatch(/already redeemed/i);
        const usedCard = (await db.where('giftCards', 'id', '==', 'gc-used'))[0];
        // previously-redeemed card keeps total balance unchanged
        expect(usedCard.balance).toBe(5000);
        const wallet = (await db.where('wallets', 'id', '==', 'u-user'))[0];
        expect(wallet.balance).toBe(1000); // no double credit
    });

    it('referral creation forces session referrer & server reward constant', async () => {
        const anon = await req(server, 'POST', '/api/referrals', {}, { refereeId: 'u-n1' });
        expect(anon.status).toBe(401);

        const res = await req(server, 'POST', '/api/referrals', auth('u-user'), {
            referrerId: 'u-stranger',
            refereeId: 'u-new1',
            rewardAmount: 999999,
        });
        expect(res.status).toBe(200);
        expect(res.body.referral.referrerId).toBe('u-user');
        expect(res.body.referral.rewardAmount).not.toBe(999999);
        expect(res.body.referral.rewardAmount).toBeGreaterThan(0);
    });

    it('referral completion is referrer-only and body cannot change the credit', async () => {
        const anon = await req(
            server,
            'POST',
            '/api/referrals/complete',
            {},
            { referralId: 'r-other' }
        );
        expect(anon.status).toBe(401);

        const notMine = await req(server, 'POST', '/api/referrals/complete', auth('u-user'), {
            referralId: 'r-other',
        });
        expect(notMine.status).toBe(403);

        const res = await req(server, 'POST', '/api/referrals', auth('u-user'), {
            refereeId: 'u-new2',
        });
        const referralId = res.body.referral.id;
        const complete = await req(server, 'POST', '/api/referrals/complete', auth('u-user'), {
            referralId,
            rewardAmount: 999999,
        });
        expect(complete.status).toBe(200);
        const wallet = (await db.where('wallets', 'id', '==', 'u-user'))[0];
        expect(wallet.balance).toBe(1000 + res.body.referral.rewardAmount);
        const again = await req(server, 'POST', '/api/referrals/complete', auth('u-user'), {
            referralId,
        });
        expect(again.status).toBe(400);
    });
});

// process.env restored for other suites running in the same process
afterAll(() => {
    if (_prevSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = _prevSupabaseUrl;
    if (_prevSupabaseKey !== undefined) process.env.SUPABASE_SERVICE_KEY = _prevSupabaseKey;
    if (_prevSupabaseRoleKey !== undefined)
        process.env.SUPABASE_SERVICE_ROLE_KEY = _prevSupabaseRoleKey;
}, 30000);
