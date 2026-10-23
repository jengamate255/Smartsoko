'use strict';
const express = require('express');
const finance = require('../services/merchant-finance');

module.exports = ({ guard, getDb, failDb }) => {
    const router = express.Router();
    const respond = handler => async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            await handler(req, res);
        } catch (error) {
            if (error.status === 400)
                return res.status(400).json({ success: false, error: error.message });
            return failDb(res, error);
        }
    };
    router.get(
        '/balance',
        ...guard('payments.read'),
        respond(async (req, res) => {
            res.json({ success: true, data: await finance.balance(getDb(req), req.merchantId) });
        })
    );
    router.get(
        '/payouts',
        ...guard('payments.read'),
        respond(async (req, res) => {
            const rows = await finance.payouts(
                getDb(req),
                await finance.context(getDb(req), req.merchantId)
            );
            const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
            res.json({
                success: true,
                data: rows.slice(0, limit),
                counts: rows.reduce((counts, row) => {
                    counts[row.status] = (counts[row.status] || 0) + 1;
                    return counts;
                }, {}),
            });
        })
    );
    router.get(
        '/payout-details',
        ...guard('payments.read'),
        respond(async (req, res) => {
            res.json({ success: true, data: await finance.getAccount(getDb(req), req.merchantId) });
        })
    );
    router.put(
        '/payout-details',
        ...guard('payments.write'),
        respond(async (req, res) => {
            // Only an owner/platform admin may change the destination, not an accountant.
            if (!['merchant', 'admin', 'super_admin'].includes(req.user.role) || req.user.staffId)
                return res
                    .status(403)
                    .json({
                        success: false,
                        error: 'Only the store owner can change payout details',
                    });
            res.json({
                success: true,
                data: await finance.saveAccount(getDb(req), req.merchantId, req.body || {}),
            });
        })
    );
    router.post('/payout', ...guard('payments.write'), (req, res) => {
        res.status(409).json({
            success: false,
            error: 'Payouts are automatically queued on delivery. Check payout history; no additional withdrawal request is needed.',
        });
    });
    return router;
};
