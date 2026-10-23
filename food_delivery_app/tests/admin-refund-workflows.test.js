import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let server, base, rpc;
const order = '00000000-0000-4000-8000-000000000101',
    requestId = '00000000-0000-4000-8000-000000000201';
beforeAll(async () => {
    const express = require('express'),
        app = express();
    app.use(express.json());
    rpc = vi.fn();
    app.set('refundRpc', rpc);
    const auth = (req, res, next) => {
        const role = req.headers['x-test-role'];
        if (!role) return res.status(401).json({ success: false });
        req.user = { uid: 'verified-admin', role };
        if (!['admin', 'super_admin'].includes(role))
            return res.status(403).json({ success: false });
        next();
    };
    require('../server/src/routes/admin-refunds').adminRefundRoutes(app, [auth]);
    server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() =>
    rpc
        .mockReset()
        .mockResolvedValue({
            success: true,
            replayed: false,
            refund: { amount: 900, status: 'completed' },
        })
);
afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
});
const post = (body = {}, role = 'admin') =>
    fetch(base + '/api/admin/orders/' + order + '/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
        body: JSON.stringify({
            requestId,
            amount: 900,
            reason: 'Isolated QA',
            destination: 'wallet',
            ...body,
        }),
    });
describe('atomic admin wallet refund HTTP API', () => {
    it('rejects anonymous and non-admin requests without RPC calls', async () => {
        expect((await post({}, null)).status).toBe(401);
        expect((await post({}, 'customer')).status).toBe(403);
        expect(rpc).not.toHaveBeenCalled();
    });
    it('validates amount, request IDs, reason and explicit wallet destination', async () => {
        for (const body of [
            { amount: 0 },
            { amount: 1.5 },
            { requestId: 'bad' },
            { reason: '' },
            { destination: 'bank' },
        ])
            expect((await post(body)).status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
    });
    it('uses the verified actor and sends the request ID to the atomic transaction', async () => {
        const result = await post({ actor: 'spoof' });
        expect(result.status).toBe(200);
        expect(rpc).toHaveBeenCalledWith('admin_refund_order', {
            p_order_id: order,
            p_request_id: requestId,
            p_amount: 900,
            p_actor: 'verified-admin',
            p_reason: 'Isolated QA',
        });
        expect((await result.json()).message).toContain('credited');
    });
    it('returns conflicts for released funds and safely reports uncertain outcomes', async () => {
        rpc.mockResolvedValueOnce({ success: false, error: 'Released funds' });
        expect((await post()).status).toBe(409);
        rpc.mockRejectedValueOnce(new Error('connection interrupted'));
        const response = await post();
        expect(response.status).toBe(503);
        expect((await response.json()).error).toContain('same request ID');
    });
    it('returns a successful replay after a network retry', async () => {
        rpc.mockResolvedValue({ success: true, replayed: true });
        const response = await post();
        expect((await response.json()).message).toContain('already completed');
    });
});
