/**
 * Server-only escrow API. The database locks the order and commits money,
 * hold state and manual payout instructions together. See migrations
 * 20261018120000_wallet_layer_rebuild and 20261018143000_atomic_escrow_movements.
 * Customer refunds remain in the payments ledger consumed by PesaPal /wallet;
 * merchant and driver earnings use wallets + wallet_transactions.
 */
'use strict';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ESCROW_HOLD = 'held';
const ESCROW_RELEASED = 'released';
const ESCROW_REFUNDED = 'refunded';
const TX_SELLER_RELEASE = 'escrow_release';
const TX_DRIVER_FEE = 'delivery_fee';

async function request(path, body) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase not configured');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (!response.ok)
        throw new Error(`Supabase escrow request failed: ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
}

function rpc(fn, args) {
    return request(`rpc/${fn}`, args || {});
}

function escrowHeld(order) {
    return (
        String((order && (order.escrowStatus ?? order.escrow_status)) || '').toLowerCase() ===
        ESCROW_HOLD
    );
}

// A delivery retry after release must not pay the driver a second time inline.
function escrowPaysDriver(order) {
    const state = String(
        (order && (order.escrowStatus ?? order.escrow_status)) || ''
    ).toLowerCase();
    return ['held', 'released', 'refunded', 'disputed'].includes(state);
}

function splitOf(order, paidAmount) {
    const paid = Number(paidAmount ?? order.total_paid ?? order.total ?? 0);
    const platform = Number(order.non_refundable_fee || 0);
    const driver = Number(order.delivery_fee || 0);
    return { paid, platform, driver, seller: Math.max(0, paid - platform - driver) };
}

function transition(orderId, action, amount = null, reference = '') {
    return rpc('transition_order_escrow', {
        p_order_id: orderId,
        p_action: action,
        p_amount: amount,
        p_reference: reference,
    });
}

// The gateway amount must already have been verified by the settlement code.
// A late payment on a cancelled order is refunded in this same transaction.
function holdEscrow(orderId, paidAmount) {
    return transition(orderId, 'hold', paidAmount);
}

function releaseEscrow(orderId, { reason = 'delivered' } = {}) {
    return transition(orderId, 'release', null, reason);
}

function refundEscrow(orderId, { reference = '' } = {}) {
    return transition(orderId, 'refund', null, reference);
}

async function holdOf(orderId) {
    const rows = await request(
        `escrow_holds?select=*&order_id=eq.${encodeURIComponent(orderId)}&limit=1`
    );
    return (rows && rows[0]) || null;
}

async function releaseDeliveredEscrow({ limit = 25 } = {}) {
    const orders = await request(
        `orders?select=id,status&escrow_status=eq.held&status=in.(delivered,completed,COMPLETED,Completed)&order=created_at.asc&limit=${limit}`
    );
    const released = [];
    const failed = [];
    for (const order of orders || []) {
        try {
            const result = await releaseEscrow(order.id, { reason: `delivered (${order.status})` });
            if (result.released) released.push(order.id);
        } catch (error) {
            failed.push({ orderId: order.id, error: error.message });
        }
    }
    return { checked: (orders || []).length, released, failed };
}

function completeVendorPayout(
    payoutId,
    { merchantId, revision, transactionRef = null, note = null } = {}
) {
    if (!merchantId || !Number.isInteger(revision) || revision < 1)
        throw new Error('Verified payout account and revision required');
    return rpc('complete_verified_vendor_payout', {
        p_payout_id: payoutId,
        p_merchant_id: merchantId,
        p_revision: revision,
        p_transaction_ref: transactionRef,
        p_note: note,
    });
}

module.exports = {
    holdEscrow,
    holdOf,
    releaseEscrow,
    releaseDeliveredEscrow,
    completeVendorPayout,
    refundEscrow,
    splitOf,
    escrowHeld,
    escrowPaysDriver,
    rpc,
    ESCROW_HOLD,
    ESCROW_RELEASED,
    ESCROW_REFUNDED,
    TX_SELLER_RELEASE,
    TX_DRIVER_FEE,
};
