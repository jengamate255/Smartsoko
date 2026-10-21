/** Loopback-only disposable UI test server. Never imports the production entry point or .env. */
'use strict';
process.env.NODE_ENV = 'test';
global.fetch = async () => {
    throw new Error('Outbound requests disabled in disposable fixture');
};
const express = require('express'),
    fs = require('fs'),
    path = require('path'),
    vm = require('vm');
const { randomUUID } = require('crypto');
const app = express();
app.use(express.json());
const publicDir = path.join(__dirname, '../public');
const ids = {
    customer: '00000000-0000-4000-8000-000000000010',
    seller: '00000000-0000-4000-8000-000000000020',
    order: '00000000-0000-4000-8000-000000000030',
    admin: '00000000-0000-4000-8000-000000000040',
};
const data = {
    profiles: new Map([
        [
            ids.customer,
            {
                id: ids.customer,
                name: 'Disposable QA Customer',
                email: 'qa@example.invalid',
                phone: '000',
                role: 'customer',
            },
        ],
    ]),
    sellers: new Map([[ids.seller, { id: ids.seller, name: 'Disposable QA Store', isOpen: true }]]),
    orders: new Map([
        [
            ids.order,
            {
                id: ids.order,
                customerName: 'Disposable QA Customer',
                sellerId: ids.seller,
                sellerName: 'Disposable QA Store',
                customerId: ids.customer,
                total: 1000,
                totalPaid: 1000,
                nonRefundableFee: 100,
                paymentStatus: 'paid',
                escrowStatus: 'held',
                status: 'pending',
                items: [{ id: 'qa-product', name: 'QA Item', price: 800, quantity: 1 }],
                createdAt: new Date().toISOString(),
            },
        ],
    ]),
    platform_settings: new Map(),
};
const db = {
    async getAll(table) {
        return [...(data[table] || new Map()).values()];
    },
    async get(table, id) {
        return data[table]?.get(id) || null;
    },
    async where(table, key, op, value) {
        return (await this.getAll(table)).filter(row => row[key] === value);
    },
    async update(table, id, patch) {
        data[table].set(id, { ...data[table].get(id), ...patch });
    },
    async add(table, row) {
        const id = randomUUID();
        (data[table] ||= new Map()).set(id, { ...row, id });
        return { id };
    },
    async delete(table, id) {
        data[table]?.delete(id);
    },
};
const auth = (req, res, next) => {
    if (req.headers.authorization === 'Bearer disposable-qa-admin')
        req.user = { uid: ids.admin, role: 'admin', email: 'qa-admin@example.invalid' };
    next();
};
const gate = (req, res, next) =>
    req.user ? next() : res.status(401).json({ success: false, error: 'QA admin required' });
app.set('db', db);
app.set('authMiddleware', { optionalAuth: auth });
app.set('reportDelivery', {
    async list() {
        return { configured: false, schedules: [] };
    },
    async create() {
        throw Object.assign(new Error('QA email sending disabled'), { status: 503 });
    },
});
app.set('financeReader', async table => {
    if (table === 'wallets')
        return [
            {
                id: ids.seller,
                role: 'merchant',
                balance: 700,
                total_earned: 700,
                total_withdrawn: 0,
            },
        ];
    if (table === 'wallet_transactions')
        return [
            {
                id: 'tx',
                wallet_id: ids.seller,
                status: 'completed',
                balance_after: 700,
                created_at: new Date().toISOString(),
            },
        ];
    if (table === 'escrow_holds')
        return [
            {
                id: 'hold',
                order_id: ids.order,
                status: 'held',
                seller_amount: 700,
                platform_amount: 100,
            },
        ];
    return db.getAll(table);
});
const refunds = new Map();
let credited = 0;
let trackingOffline = false;
app.set('refundReader', async () => [...refunds.values()]);
app.get('/test/tracking/:mode', (req, res) => {
    trackingOffline = req.params.mode === 'offline';
    res.json({ ok: true });
});
app.get('/api/admin/drivers', auth, gate, (req, res) => {
    if (trackingOffline) return res.status(503).json({ error: 'Disposable tracking outage' });
    const now = Date.now();
    res.json({
        success: true,
        data: [
            require('../server/src/services/driver-presence').position({
                id: 'fresh',
                name: 'QA Fresh Driver',
                isOnline: true,
                currentLatitude: 0,
                currentLongitude: 0,
                lastLocationUpdate: new Date(now).toISOString(),
            }),
            require('../server/src/services/driver-presence').position({
                id: 'stale',
                name: 'QA Stale Driver',
                isOnline: true,
                currentLatitude: 1,
                currentLongitude: 1,
                lastLocationUpdate: new Date(now - 600000).toISOString(),
            }),
        ],
    });
});
app.set('refundRpc', async (name, args) => {
    if (refunds.has(args.p_request_id))
        return { success: true, replayed: true, refund: refunds.get(args.p_request_id) };
    const order = data.orders.get(args.p_order_id);
    if (!order || args.p_amount !== 900)
        return { success: false, error: 'Refund balance mismatch' };
    if (order.escrowStatus === 'refunded') return { success: true, replayed: true };
    const refund = {
        request_id: args.p_request_id,
        order_id: args.p_order_id,
        amount: 900,
        status: 'completed',
        payment_reference: 'REFUND-' + args.p_order_id,
    };
    refunds.set(args.p_request_id, refund);
    credited += 900;
    order.escrowStatus = 'refunded';
    order.paymentStatus = 'refunded';
    return { success: true, replayed: false, refund };
});
app.get('/api/auth/verify', auth, gate, (req, res) => res.json({ success: true, user: req.user }));
app.get('/api/admin/orders', auth, gate, async (req, res) =>
    res.json({ success: true, orders: await db.getAll('orders'), total: data.orders.size })
);
app.get('/api/admin/users', auth, gate, async (req, res) => {
    const settings = await db.getAll('platform_settings');
    const deleted = settings.find(r => r.key === 'deleted_users')?.value || [];
    res.json({
        success: true,
        data: (await db.getAll('profiles')).map(u => ({
            ...u,
            status: deleted.includes(u.id) ? 'deleted' : 'active',
        })),
    });
});
app.get('/api/admin/sellers', auth, gate, async (req, res) =>
    res.json({ success: true, data: await db.getAll('sellers') })
);
const source = fs.readFileSync(path.join(__dirname, '../server/server-production.js'), 'utf8');
const start = source.indexOf("app.put('/api/admin/orders/:id/status'"),
    end = source.indexOf('// Order timeline:', start);
vm.runInNewContext(source.slice(start, end), {
    app,
    optionalAuth: auth,
    adminGate: gate,
    VALID_ORDER_STATUSES: new Set(['pending', 'accepted', 'confirmed', 'preparing', 'delivered']),
    db: {
        collection: table => ({
            doc: id => ({
                get: async () => ({ exists: data[table].has(id), data: () => data[table].get(id) }),
                update: patch => db.update(table, id, patch),
            }),
        }),
    },
    appendOrderEvent: async () => {},
    logAudit() {},
    broadcastToAdmins() {},
    logger: { error() {} },
});
require('../server/src/routes/admin-refunds').adminRefundRoutes(app, [auth, gate]);
require('../server/src/routes/admin-extended').adminExtendedRoutes(app);
app.get('/api/config', (req, res) => res.json({ mapbox: false }));
app.get('/test/results', (req, res) =>
    res.json({
        ids,
        credited,
        refundCount: refunds.size,
        order: data.orders.get(ids.order),
        customer: data.profiles.get(ids.customer),
        settings: [...data.platform_settings.values()],
    })
);
app.get(
    [
        '/config/firebase-config.js',
        '/config/cross-platform-service.js',
        '/auth-check.js',
        '/nav-component.js',
    ],
    (req, res) =>
        res
            .type('js')
            .send(
                `window.auth={currentUser:{uid:'${ids.admin}',email:'qa-admin@example.invalid',getIdToken:async()=>'disposable-qa-admin'},onAuthStateChanged:cb=>cb({uid:'${ids.admin}'})};window.Chart=class{destroy(){}};`
            )
);
app.get('/config/mapbox-config.js', (req, res) =>
    res.type('js').send('window.initMapbox=()=>null;window.setMapboxToken=()=>{};')
);
app.get('/api/*', (req, res) => res.json({ success: true, data: [] }));
app.get('/admin', (req, res) =>
    res.type('html').send(
        fs
            .readFileSync(path.join(publicDir, 'admin.html'), 'utf8')
            .replace(/<script[^>]*src="https:[^"]+"[^>]*><\/script>/g, '')
            .replace('<body', '<body data-disposable-fixture="smartsoko-admin-qa"')
            .replace(
                '</body>',
                `<aside style="position:fixed;bottom:0;left:0;z-index:99999;background:white;padding:8px"><button onclick="fetch('/test/tracking/offline').then(()=>window.dispatchEvent(new Event('online')))">QA Tracking Offline</button><button onclick="fetch('/test/tracking/online').then(()=>window.dispatchEvent(new Event('online')))">QA Tracking Online</button></aside></body>`
            )
    )
);
app.use(express.static(publicDir, { dotfiles: 'deny' }));
const server = app.listen(0, '127.0.0.1', () =>
    console.log(JSON.stringify({ base: 'http://127.0.0.1:' + server.address().port, ids }))
);
