'use strict';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function adminRefundRoutes(app, gate) {
    app.get('/api/admin/orders/:id/refunds', ...gate, async (req, res) => {
        if (!UUID.test(req.params.id))
            return res.status(400).json({ success: false, error: 'Invalid order ID' });
        try {
            const rows = await (
                app.get('refundReader') || require('../services/admin-finance').readTable
            )('admin_order_refunds');
            return res.json({
                success: true,
                data: rows.filter(row => (row.order_id || row.orderId) === req.params.id),
            });
        } catch (_) {
            return res
                .status(503)
                .json({
                    success: false,
                    error: 'Wallet refund history unavailable; check the refund migration',
                });
        }
    });
    app.post('/api/admin/orders/:id/refund', ...gate, async (req, res) => {
        const { amount, reason, requestId, destination } = req.body || {};
        if (!req.user || !['admin', 'super_admin'].includes(String(req.user.role).toLowerCase()))
            return res.status(403).json({ success: false, error: 'Verified admin required' });
        if (
            !UUID.test(req.params.id) ||
            !UUID.test(requestId || '') ||
            !Number.isSafeInteger(amount) ||
            amount <= 0 ||
            amount > 2147483647 ||
            typeof reason !== 'string' ||
            !reason.trim() ||
            reason.length > 1000 ||
            destination !== 'wallet'
        )
            return res
                .status(400)
                .json({
                    success: false,
                    error: 'Order ID, request ID, integer amount, reason and wallet destination required',
                });
        try {
            const result = await (app.get('refundRpc') || require('../services/escrow').rpc)(
                'admin_refund_order',
                {
                    p_order_id: req.params.id,
                    p_request_id: requestId,
                    p_amount: amount,
                    p_actor: req.user.uid,
                    p_reason: reason.trim(),
                }
            );
            if (!result.success) return res.status(409).json(result);
            require('../config/logger').logAudit('admin_wallet_refund', {
                orderId: req.params.id,
                requestId,
                amount,
                actor: req.user.uid,
                replayed: result.replayed,
            });
            return res.json({
                ...result,
                message: result.replayed
                    ? 'Wallet refund already completed'
                    : 'Refund credited to customer wallet',
            });
        } catch (error) {
            require('../services/operations-monitor').recordFailure('admin-refunds', error);
            if (/request failed: 404|schema cache/i.test(error.message))
                return res
                    .status(503)
                    .json({
                        success: false,
                        error: 'Wallet refunds require the admin wallet refund database migration before use.',
                    });
            return res
                .status(503)
                .json({
                    success: false,
                    error: 'Refund could not be confirmed. Retry with the same request ID.',
                });
        }
    });
}
module.exports = { adminRefundRoutes };
