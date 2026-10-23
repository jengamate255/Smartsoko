'use strict';
const sellerOf = row => row && (row.sellerId || row.seller_id || row.merchantId || row.merchant_id || row.restaurantId || row.restaurant_id);
const productOf = item => item && (item.productId || item.product_id || item.menuItemId || item.id);
function itemsOf(order) {
    let items = order.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (_) { return []; } }
    return Array.isArray(items) ? items : [];
}

function planSellerRepairs(orders, sellers, products = []) {
    const known = new Set(sellers.map(s => s.id));
    const catalog = new Map(products.map(p => [p.id, sellerOf(p)]));
    return orders.map(order => {
        const existing = sellerOf(order);
        if (existing) return { id: order.id, status: known.has(existing) ? 'linked' : 'invalid_reference', sellerId: existing };
        const items = itemsOf(order);
        const snapshots = items.map(sellerOf);
        if (items.length && snapshots.every(id => id && known.has(id)) && new Set(snapshots).size === 1)
            return { id: order.id, status: 'repairable', sellerId: snapshots[0], evidence: 'item_seller_snapshot', expectedItems: order.items };
        // Today's catalog is useful for review but cannot prove historical ownership.
        const current = items.map(item => catalog.get(productOf(item)));
        if (items.length && current.every(id => id && known.has(id)) && new Set(current).size === 1)
            return { id: order.id, status: 'review_required', candidateSellerId: current[0], evidence: 'current_catalog_only' };
        return { id: order.id, status: 'unresolved' };
    });
}

function enrichOrders(orders, sellers) {
    const byId = new Map(sellers.map(s => [s.id, s]));
    const plans = new Map(planSellerRepairs(orders, sellers).map(p => [p.id, p]));
    return orders.map(order => {
        const plan = plans.get(order.id);
        const id = sellerOf(order) || (plan.status === 'repairable' ? plan.sellerId : null);
        const seller = byId.get(id);
        return { ...order, ...(id ? { sellerId: id } : {}), sellerName: order.sellerName || order.merchantName || (seller && (seller.name || seller.storeName)) || '', sellerAssociation: plan.status };
    });
}
module.exports = { sellerOf, itemsOf, planSellerRepairs, enrichOrders };
