import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let server, base, store, writes, delivery;
const userId = '00000000-0000-4000-8000-000000000321';
const scheduleId = '00000000-0000-4000-8000-000000000654';
beforeAll(async () => {
    vi.stubEnv('ALLOW_ANON_ADMIN', 'true');
    const express = require('express'); const app = express(); app.use(express.json());
    app.set('authMiddleware', { optionalAuth(req, res, next) { if (req.headers['x-test-role']) req.user = { uid: 'verified-admin', role: req.headers['x-test-role'] }; next(); } });
    app.set('db', {
        async getAll(table) { return [...(store[table] || new Map()).values()]; },
        async get(table, id) { return store[table]?.get(id) || null; },
        async where(table, field, op, value) { return [...(store[table] || new Map()).values()].filter(row => row[field] === value); },
        async update(table, id, patch) { writes.push({ table, id, patch }); store[table].set(id, { ...store[table].get(id), ...patch }); },
        async add(table, row) { const id = 'test-' + writes.length; writes.push({ table, row }); (store[table] ||= new Map()).set(id, { ...row, id }); return { id }; },
    });
    delivery = { create: vi.fn(), list: vi.fn(), pause: vi.fn() }; app.set('reportDelivery', delivery);
    require('../server/src/routes/admin-extended').adminExtendedRoutes(app);
    server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
    base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
    writes = []; store = { profiles: new Map([[userId, { id: userId, name: 'Disposable QA', email: 'qa@example.invalid', phone: '000', firebaseUid: 'qa-user', role: 'customer' }]]), platform_settings: new Map() };
    delivery.create.mockReset().mockResolvedValue({ id: scheduleId, status: 'active' });
    delivery.list.mockReset().mockResolvedValue({ configured: true, schedules: [] });
    delivery.pause.mockReset().mockResolvedValue({ id: scheduleId, status: 'paused' });
});
afterAll(async () => { vi.unstubAllEnvs(); if (server) await new Promise(resolve => server.close(resolve)); });
const request = (path, method, body, role) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

describe('isolated admin write workflows', () => {
    it('rejects anonymous and non-admin destructive requests even with the legacy demo flag', async () => {
        for (const [path, method, body] of [
            ['/api/admin/users/' + userId, 'DELETE'],
            ['/api/admin/users/' + userId, 'PUT', { role: 'admin' }],
            ['/api/admin/users/bulk-action', 'POST', { userIds: [userId], action: 'delete' }],
            ['/api/admin/orders/bulk-status', 'POST', { orderIds: ['o1'], status: 'delivered' }],
        ]) {
            expect((await request(path, method, body)).status).toBe(401);
            expect((await request(path, method, body, 'merchant')).status).toBe(403);
        }
        expect(writes).toEqual([]);
    });
    it('anonymizes a disposable account, retains its ID, and records deletion/suspension', async () => {
        const result = await request('/api/admin/users/' + userId, 'DELETE', null, 'admin');
        expect(result.status).toBe(200);
        expect((await result.json()).data).toMatchObject({ id: userId, anonymized: true });
        expect(store.profiles.get(userId)).toMatchObject({ id: userId, name: 'Deleted user', email: null, phone: null, firebaseUid: null });
        const settings = [...store.platform_settings.values()];
        expect(settings.find(row => row.key === 'deleted_users').value).toContain(userId);
        expect(settings.find(row => row.key === 'suspended_users').value).toContain(userId);
    });
    it('does not mutate data for a missing deletion target', async () => {
        expect((await request('/api/admin/users/missing', 'DELETE', null, 'admin')).status).toBe(404);
        expect(writes).toEqual([]);
    });
    it('validates schedules before creating them and uses the authenticated actor', async () => {
        const body = { name: 'Weekly', emails: ['admin@example.com'], reportType: 'orders', frequency: 'weekly', created_by: 'spoofed' };
        const path = '/api/admin/analytics/report/schedule';
        expect((await request(path, 'POST', body)).status).toBe(401);
        expect((await request(path, 'POST', body, 'customer')).status).toBe(403);
        expect((await request(path, 'POST', { ...body, emails: [] }, 'admin')).status).toBe(400);
        expect(delivery.create).not.toHaveBeenCalled();
        expect((await request(path, 'POST', body, 'admin')).status).toBe(200);
        expect(delivery.create).toHaveBeenCalledWith({ name: 'Weekly', emails: ['admin@example.com'], reportType: 'orders', frequency: 'weekly' }, 'verified-admin');
    });
    it('shows delivery configuration failures instead of claiming a schedule was created', async () => {
        delivery.create.mockRejectedValue(Object.assign(new Error('Email not configured'), { status: 503 }));
        const result = await request('/api/admin/analytics/report/schedule', 'POST', { name: 'Daily', emails: ['a@example.com'], reportType: 'revenue', frequency: 'daily' }, 'admin');
        expect(result.status).toBe(503); expect((await result.json()).success).toBe(false);
    });
    it('protects schedule recipients and supports pausing without deleting history', async () => {
        expect((await request('/api/admin/analytics/report/schedules', 'GET')).status).toBe(401);
        expect((await request('/api/admin/analytics/report/schedules', 'GET', null, 'admin')).status).toBe(200);
        expect((await request('/api/admin/analytics/report/schedules/' + scheduleId + '/pause', 'POST', {}, 'admin')).status).toBe(200);
        expect(delivery.pause).toHaveBeenCalledWith(scheduleId);
    });
});
