/** Dry run by default. --apply only repairs unanimous seller IDs captured in order items. */
'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { planSellerRepairs } = require('../server/src/services/seller-associations');
const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
async function request(resource, method = 'GET', body) {
    if (!base || !key) throw new Error('Supabase service credentials required');
    const result = await fetch(`${base}/rest/v1/${resource}`, {
        method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    });
    if (!result.ok) throw new Error(`Database request failed (${result.status})`);
    return result.json();
}
async function all(table, fields) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
        const batch = await request(`${table}?select=${fields}&order=id.asc&limit=1000&offset=${offset}`);
        rows.push(...batch);
        if (batch.length < 1000) return rows;
    }
}
(async () => {
    const [orders, sellers, products, restaurants] = await Promise.all([
        all('orders', 'id,restaurant_id,items'), all('sellers', 'id'), all('products', 'id,seller_id'), all('restaurants', 'id'),
    ]);
    const plans = planSellerRepairs(orders, [...sellers, ...restaurants], products);
    const counts = plans.reduce((result, plan) => { result[plan.status] = (result[plan.status] || 0) + 1; return result; }, {});
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', counts }));
    if (!process.argv.includes('--apply')) return;
    let repaired = 0, conflicts = 0;
    for (const plan of plans.filter(p => p.status === 'repairable')) {
        // A concurrent order edit or an already-repaired association cannot be overwritten.
        const updated = await request(`orders?id=eq.${encodeURIComponent(plan.id)}&restaurant_id=is.null&items=eq.${encodeURIComponent(JSON.stringify(plan.expectedItems))}`, 'PATCH', { restaurant_id: plan.sellerId });
        if (updated.length) repaired++; else conflicts++;
    }
    console.log(JSON.stringify({ repaired, conflicts, remaining: plans.filter(p => ['unresolved', 'review_required', 'invalid_reference'].includes(p.status)).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
