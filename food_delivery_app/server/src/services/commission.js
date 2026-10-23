'use strict';
function calculate(base, category, rules) {
    const active = rules.filter(r => r.isActive !== false);
    const rule =
        active.find(r => r.category === category) ||
        active.find(r => !r.category || r.category === 'all');
    if (!rule) return { amount: 0, ruleId: null };
    const rate = Number(rule.rate),
        fixed = ['flat', 'fixed'].includes(rule.type);
    if (!Number.isFinite(rate) || rate < 0 || (!fixed && rate > 100))
        throw new Error('Invalid commission rule');
    return {
        amount: Math.min(Math.max(0, base), Math.round(fixed ? rate : (base * rate) / 100)),
        ruleId: rule.id,
    };
}
async function quoteCommission(db, base, category) {
    const rows = await db.where('platform_settings', 'key', '==', 'commission_rules');
    let rules = rows?.[0]?.value || [];
    if (typeof rules === 'string') rules = JSON.parse(rules);
    if (!Array.isArray(rules)) throw new Error('Commission rules unavailable');
    return calculate(base, category, rules);
}
module.exports = { calculate, quoteCommission };
