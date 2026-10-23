'use strict';

function inputError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

// Store ownership, not the current staff member's identity, determines which
// restaurant wallet may be included. Never infer links from names or email.
async function context(db, merchantId) {
    const seller = await db.get('sellers', merchantId);
    if (!seller) throw new Error('Merchant store not found');
    const owner = seller.ownerId || seller.owner_id;
    const vendors = owner ? await db.where('vendors', 'profile_id', '==', owner) : [];
    // The shared dual-db reverse map currently calls restaurant_id merchantId.
    const restaurantOf = vendor => vendor.restaurantId || vendor.restaurant_id || vendor.merchantId;
    if (vendors.some(restaurantOf)) {
        const stores = await db.where('sellers', 'owner_id', '==', owner);
        if (stores.length !== 1 || stores[0].id !== merchantId)
            throw new Error(
                'Restaurant wallet ownership is ambiguous across stores; admin review required'
            );
    }
    const walletIds = [...new Set([merchantId, ...vendors.map(restaurantOf).filter(Boolean)])];
    return { walletIds, vendorIds: vendors.map(v => v.id) };
}

async function payouts(db, ctx) {
    const batches = await Promise.all([
        ...ctx.walletIds.map(id => db.where('vendor_payouts', 'wallet_id', '==', id)),
        ...ctx.vendorIds.map(id => db.where('vendor_payouts', 'vendor_id', '==', id)),
    ]);
    return [
        ...new Map(
            batches
                .flat()
                .filter(
                    p =>
                        !(p.walletId || p.wallet_id) ||
                        ctx.walletIds.includes(p.walletId || p.wallet_id)
                )
                .map(p => [p.id, p])
        ).values(),
    ].sort((a, b) =>
        String(b.createdAt || b.created_at || '').localeCompare(
            String(a.createdAt || a.created_at || '')
        )
    );
}

async function balance(db, merchantId) {
    const ctx = await context(db, merchantId);
    const [wallets, orders, history] = await Promise.all([
        Promise.all(ctx.walletIds.map(id => db.get('wallets', id))),
        Promise.all(ctx.walletIds.map(id => db.where('orders', 'restaurant_id', '==', id))),
        payouts(db, ctx),
    ]);
    const sum = field =>
        wallets.reduce((total, w) => total + Number((w && (w[field[0]] ?? w[field[1]])) || 0), 0);
    const released = sum(['balance', 'balance']);
    const pending = orders
        .flat()
        .filter(o => (o.escrowStatus || o.escrow_status) === 'held')
        .reduce(
            (total, o) =>
                total +
                Math.max(
                    0,
                    Number(o.totalPaid ?? o.total_paid ?? 0) -
                        Number(o.deliveryFee ?? o.delivery_fee ?? 0) -
                        Number(o.nonRefundableFee ?? o.non_refundable_fee ?? 0)
                ),
            0
        );
    const queued = history
        .filter(
            p =>
                ctx.walletIds.includes(p.walletId || p.wallet_id) &&
                ['pending', 'processing'].includes(String(p.status).toLowerCase())
        )
        .reduce((total, p) => total + Number(p.amount || 0), 0);
    return {
        availableBalance: released,
        pendingBalance: pending,
        lifetimeEarnings: sum(['totalEarned', 'total_earned']),
        totalWithdrawn: sum(['totalWithdrawn', 'total_withdrawn']),
        queuedPayouts: queued,
        currency: 'TZS',
        payoutMode: 'manual',
    };
}

function validateAccount(body) {
    const text = (key, min, max) => {
        if (typeof body[key] !== 'string') throw inputError(`${key} is required`);
        const value = body[key].trim();
        if (value.length < min || value.length > max || /[\x00-\x1f\x7f]/.test(value))
            throw inputError(`Invalid ${key}`);
        return value;
    };
    const method = body.method;
    if (!['mobile_money', 'bank_transfer'].includes(method))
        throw inputError('Choose mobile money or bank transfer');
    const data = {
        method,
        account_name: text('accountName', 2, 120),
        phone_number: null,
        bank_name: null,
        account_number: null,
    };
    if (method === 'mobile_money') {
        let phone = text('phoneNumber', 9, 20).replace(/[\s()-]/g, '');
        if (/^0[67]\d{8}$/.test(phone)) phone = '+255' + phone.slice(1);
        if (/^255[67]\d{8}$/.test(phone)) phone = '+' + phone;
        if (!/^\+255[67]\d{8}$/.test(phone))
            throw inputError('Enter a valid Tanzanian mobile-money number');
        data.phone_number = phone;
    } else {
        data.bank_name = text('bankName', 2, 80);
        data.account_number = text('accountNumber', 5, 34);
        if (!/^[a-zA-Z0-9 -]+$/.test(data.account_number))
            throw inputError('Invalid bank account number');
    }
    return data;
}

async function getAccount(db, merchantId) {
    return db.get('merchant_payout_accounts', merchantId);
}

async function saveAccount(db, merchantId, body) {
    const data = validateAccount(body);
    // The database trigger alone controls status/revision. A merchant cannot
    // self-verify by submitting status, revision or verifiedBy fields.
    if (await getAccount(db, merchantId)) {
        // PATCH avoids insert defaults accidentally resetting a verified row
        // when the merchant saves unchanged details. Changed fields are still
        // invalidated by the database trigger.
        await db.update('merchant_payout_accounts', merchantId, data);
    } else {
        await db.set('merchant_payout_accounts', merchantId, data);
    }
    return getAccount(db, merchantId);
}

module.exports = { context, payouts, balance, validateAccount, getAccount, saveAccount };
