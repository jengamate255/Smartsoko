'use strict';
const number = value => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) throw new Error('Invalid amount in finance ledger');
    return n;
};
const field = (row, a, b) => row[a] ?? row[b];
async function readTable(table) {
    const tables = new Set([
        'orders',
        'sellers',
        'restaurants',
        'wallets',
        'wallet_transactions',
        'escrow_holds',
        'vendor_payouts',
        'payments',
        'drivers',
        'profiles',
        'platform_settings',
        'products',
        'admin_order_refunds',
    ]);
    if (!tables.has(table)) throw new Error('Unsupported export table');
    const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Database credentials required');
    const rows = [];
    for (let offset = 0; offset < 100000; offset += 1000) {
        const result = await fetch(
            `${url}/rest/v1/${table}?select=*&order=id.asc&limit=1000&offset=${offset}`,
            {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(20000),
            }
        );
        if (!result.ok) throw new Error(`Could not read ${table} (${result.status})`);
        const batch = await result.json();
        rows.push(...batch);
        if (batch.length < 1000) return rows;
    }
    throw new Error('Export limit reached; use a database-native snapshot');
}
function summarize({
    orders,
    sellers,
    restaurants,
    wallets,
    holds,
    payouts,
    payments,
    transactions,
}) {
    const stores = new Map([...restaurants, ...sellers].map(row => [String(row.id), row]));
    const merchantWallets = wallets.filter(
        w => w.role === 'merchant' || (!w.role && stores.has(String(w.id)))
    );
    const merchantIds = new Set(merchantWallets.map(w => String(w.id)));
    const merchantPayouts = payouts.filter(p =>
        merchantIds.has(String(field(p, 'walletId', 'wallet_id')))
    );
    const completed = merchantPayouts.filter(p => ['paid', 'completed'].includes(p.status));
    const sum = (rows, key, alias) =>
        rows.reduce((total, row) => total + number(alias ? field(row, key, alias) : row[key]), 0);
    const collected = orders.filter(o => field(o, 'paymentStatus', 'payment_status') === 'paid');
    const refundRows = payments.filter(p => p.method === 'refund' && p.status === 'completed');
    const held = holds.filter(h => h.status === 'held');
    const earned = holds.filter(h => ['released', 'refunded'].includes(h.status));
    const rows = merchantWallets.map(wallet => {
        const id = String(wallet.id),
            store = stores.get(id);
        return {
            id,
            name: store?.name || 'Unlinked merchant wallet',
            available: number(wallet.balance),
            pending: sum(
                held.filter(h => {
                    const order = orders.find(o => o.id === field(h, 'orderId', 'order_id'));
                    return (
                        String(
                            order &&
                                (order.sellerId ||
                                    order.restaurantId ||
                                    order.restaurant_id ||
                                    order.merchantId)
                        ) === id
                    );
                }),
                'sellerAmount',
                'seller_amount'
            ),
            earned: number(field(wallet, 'totalEarned', 'total_earned')),
            withdrawn: number(field(wallet, 'totalWithdrawn', 'total_withdrawn')),
            queued: sum(
                merchantPayouts.filter(
                    p =>
                        String(field(p, 'walletId', 'wallet_id')) === id &&
                        ['pending', 'processing'].includes(p.status)
                ),
                'amount'
            ),
        };
    });
    const reconciliation = [];
    for (const wallet of merchantWallets) {
        const ledger = transactions
            .filter(
                t =>
                    String(field(t, 'walletId', 'wallet_id')) === String(wallet.id) &&
                    t.status === 'completed'
            )
            .sort((a, b) =>
                String(field(a, 'createdAt', 'created_at')).localeCompare(
                    String(field(b, 'createdAt', 'created_at'))
                )
            );
        if (!ledger.length) {
            reconciliation.push({
                walletId: wallet.id,
                status: 'unverified',
                reason: 'No transaction history',
            });
            continue;
        }
        const latest = ledger.at(-1),
            after = field(latest, 'balanceAfter', 'balance_after');
        if (after == null || number(after) !== number(wallet.balance))
            reconciliation.push({
                walletId: wallet.id,
                status: 'mismatch',
                reason: 'Wallet balance differs from latest ledger balance',
            });
    }
    return {
        asOf: new Date().toISOString(),
        currency: 'TZS',
        grossOrderValue: sum(orders, 'total'),
        collectedOrderValue: collected.reduce(
            (s, o) => s + number(field(o, 'totalPaid', 'total_paid') ?? o.total),
            0
        ),
        refundedToWallet: sum(refundRows, 'amount'),
        availableBalance: sum(merchantWallets, 'balance'),
        pendingEscrow: sum(held, 'sellerAmount', 'seller_amount'),
        platformEarned: sum(earned, 'platformAmount', 'platform_amount'),
        completedPayouts: sum(completed, 'amount'),
        queuedPayouts: sum(
            merchantPayouts.filter(p => ['pending', 'processing'].includes(p.status)),
            'amount'
        ),
        unlinkedPayouts: payouts.filter(
            p => !merchantIds.has(String(field(p, 'walletId', 'wallet_id')))
        ).length,
        overduePayouts: payouts.filter(
            p =>
                ['pending', 'processing'].includes(p.status) &&
                Date.parse(field(p, 'createdAt', 'created_at')) < Date.now() - 7 * 86400000
        ).length,
        unlinkedPayoutIds: payouts
            .filter(p => !merchantIds.has(String(field(p, 'walletId', 'wallet_id'))))
            .map(p => p.id),
        unallocatedHeldEarnings: sum(
            held.filter(h => {
                const order = orders.find(o => o.id === field(h, 'orderId', 'order_id'));
                return !merchantIds.has(
                    String(
                        order &&
                            (order.sellerId ||
                                order.restaurantId ||
                                order.restaurant_id ||
                                order.merchantId)
                    )
                );
            }),
            'sellerAmount',
            'seller_amount'
        ),
        rows,
        reconciliation,
    };
}
async function snapshot(read = readTable) {
    const [orders, sellers, restaurants, wallets, holds, payouts, payments, transactions] =
        await Promise.all(
            [
                'orders',
                'sellers',
                'restaurants',
                'wallets',
                'escrow_holds',
                'vendor_payouts',
                'payments',
                'wallet_transactions',
            ].map(read)
        );
    return summarize({
        orders,
        sellers,
        restaurants,
        wallets,
        holds,
        payouts,
        payments,
        transactions,
    });
}
module.exports = { readTable, summarize, snapshot };
