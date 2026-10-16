/**
 * Analytics service (§8) — single source of truth for sales/revenue/profit
 * calculations. Pure functions over order/expense arrays so every page and
 * the overview endpoint produce identical numbers.
 *
 * Time bucketing uses EAT (UTC+3) per Tanzania-first §19, but is offset-driven
 * so it can be reconfigured, not hardcoded into business logic.
 */
'use strict';

const EAT_OFFSET_MIN = 180; // UTC+3

/** Shift an ISO timestamp into EAT and return YYYY-MM-DD for daily buckets. */
function dayKey(isoTs) {
  if (!isoTs) return null;
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + EAT_OFFSET_MIN * 60000);
  return shifted.toISOString().slice(0, 10);
}

function inRange(isoTs, fromIso, toIso) {
  if (!isoTs) return false;
  const t = new Date(isoTs).getTime();
  if (Number.isNaN(t)) return false;
  if (fromIso && t < new Date(fromIso).getTime()) return false;
  if (toIso && t > new Date(toIso).getTime()) return false;
  return true;
}

const REVENUE_STATUSES = new Set(['delivered', 'completed', 'in_transit', 'picked_up', 'ready_for_delivery', 'assigned']);
const CANCELLED = new Set(['cancelled', 'refunded']);

/**
 * Order statuses are compared case-insensitively: the live orders table holds
 * "COMPLETED" and "REFUNDED" next to lowercase values, and the case-sensitive
 * sets below silently counted a refunded order as revenue and dropped
 * completed ones from it.
 */
function normStatus(value) {
  return String(value || '').toLowerCase();
}

/**
 * summarizeOrders(orders, { from, to }) →
 * { revenue, cost, grossProfit, orders, aov, cancelled, customers }
 */
function summarizeOrders(orders, range = {}) {
  let revenue = 0, cost = 0, count = 0, cancelled = 0;
  const customerIds = new Set();

  for (const o of orders || []) {
    if (!inRange(o.createdAt, range.from, range.to)) continue;
    const status = normStatus(o.status) || 'pending';
    if (CANCELLED.has(status)) { cancelled++; continue; }
    // Revenue counts orders actually moving to the merchant's favor
    if (REVENUE_STATUSES.has(status) || status === 'pending' || status === 'accepted' || status === 'preparing') {
      count++;
      revenue += Number(o.total) || 0;
      const c = Number(o.cost) || 0; // optional cost snapshot on order
      cost += c;
      if (o.customerId) customerIds.add(o.customerId);
    }
  }

  const grossProfit = revenue - cost;
  return {
    revenue: Math.round(revenue),
    cost: Math.round(cost),
    grossProfit: Math.round(grossProfit),
    orders: count,
    cancelled,
    aov: count ? Math.round(revenue / count) : 0,
    customers: customerIds.size,
  };
}

/** Daily series [{day, revenue, orders}] ordered ascending. */
function dailySeries(orders, days = 14) {
  const buckets = new Map();
  const todayKey = dayKey(new Date().toISOString());
  // Seed last `days` days so charts show zero-days instead of gaps
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    buckets.set(dayKey(d.toISOString()), { revenue: 0, orders: 0 });
  }
  void todayKey;

  for (const o of orders || []) {
    const k = dayKey(o.createdAt);
    if (!k || !buckets.has(k)) continue;
    if (CANCELLED.has(normStatus(o.status))) continue;
    buckets.set(k, {
      revenue: (buckets.get(k).revenue || 0) + (Number(o.total) || 0),
      orders: (buckets.get(k).orders || 0) + 1,
    });
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, v]) => ({ day, revenue: Math.round(v.revenue), orders: v.orders }));
}

/** Coerce an order's items field to an array. Supabase may store items as a
 * JSON string (text column), which is not iterable and would throw
 * "object is not iterable" inside topProducts(). */
function itemsToArray(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try { const parsed = JSON.parse(items); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
  }
  if (items && typeof items === 'object') {
    // Firestore/Supabase object-shaped items {name:..., qty:...}
    const vals = Object.values(items);
    return Array.isArray(vals) && vals.length && typeof vals[0] === 'object' ? vals : [items];
  }
  return [];
}

/** Top products by units + revenue from order items. */
function topProducts(orders, limit = 5) {
  const agg = new Map();
  for (const o of orders || []) {
    if (CANCELLED.has(normStatus(o.status))) continue;
    for (const it of itemsToArray(o.items)) {
      const key = it.id || it.name;
      if (!key) continue;
      const prev = agg.get(key) || { id: it.id || key, name: it.name || key, units: 0, revenue: 0 };
      prev.units += Number(it.quantity) || 0;
      prev.revenue += (Number(it.price) || 0) * (Number(it.quantity) || 0);
      agg.set(key, prev);
    }
  }
  return [...agg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({ ...p, revenue: Math.round(p.revenue) }));
}

/** Net profit = gross profit from orders − expenses in the same window. */
function netProfit(summary, expenses, range = {}) {
  const totalExpenses = (expenses || [])
    .filter((e) => inRange(e.date || e.createdAt, range.from, range.to))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return { expenses: Math.round(totalExpenses), netProfit: summary.grossProfit - Math.round(totalExpenses) };
}

module.exports = { dayKey, inRange, summarizeOrders, dailySeries, topProducts, netProfit, itemsToArray, REVENUE_STATUSES, EAT_OFFSET_MIN };
