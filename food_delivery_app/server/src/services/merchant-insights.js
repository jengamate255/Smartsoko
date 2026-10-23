'use strict';
const analytics = require('./analytics-service');
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const status = value => String(value || '').toLowerCase();

function insights(orders, expenses, days = 30) {
  const start = analytics.dayKey(new Date(Date.now() - (days - 1) * 86400000).toISOString());
  const range = { from: `${start}T00:00:00+03:00` };
  const selected = orders.filter(o => analytics.inRange(o.createdAt, range.from));
  const summary = analytics.summarizeOrders(selected);
  const profit = analytics.netProfit(summary, expenses, range);
  const eligible = selected.filter(o => !['cancelled', 'refunded'].includes(status(o.status)));
  const peak = new Map(); const categories = new Map();
  for (const order of eligible) {
    const hour = (new Date(order.createdAt).getUTCHours() + 3) % 24;
    peak.set(hour, (peak.get(hour) || 0) + 1);
    for (const item of analytics.itemsToArray(order.items)) {
      const category = item.category || 'Other';
      categories.set(category, (categories.get(category) || 0) + num(item.price) * num(item.quantity));
    }
  }
  const rows = selected.map(o => ({id: o.id, createdAt: o.createdAt, status: status(o.status),
    paymentStatus: status(o.paymentStatus) || 'unconfirmed', total: num(o.total),
    refund: status(o.status) === 'refunded' ? num(o.total) : 0,
    deliveryFee: num(o.deliveryFee), serviceFee: num(o.serviceFee),
    commission: o.commission == null ? null : num(o.commission),
    payoutStatus: o.payoutStatus || 'Not linked to a payout',
  }));
  const knownCosts = eligible.every(o => o.cost != null);
  const knownCommission = eligible.every(o => o.commission != null);
  return {days, timeZone: 'Africa/Dar_es_Salaam', summary: {...summary,
    expenses: profit.expenses, netProfit: knownCosts && knownCommission
      ? profit.netProfit - eligible.reduce((s,o) => s + num(o.commission) + num(o.serviceFee) + num(o.deliveryFee), 0) : null,
    costsComplete: knownCosts, commissionsComplete: knownCommission,
    refunds: rows.reduce((s,o) => s + o.refund, 0),
    fees: eligible.reduce((s,o) => s + num(o.serviceFee) + num(o.deliveryFee) + num(o.commission), 0)},
    daily: analytics.dailySeries(selected, days), topProducts: analytics.topProducts(selected, 5),
    peakHours: [...peak].sort((a,b) => b[1]-a[1]).map(([hour,count]) => ({hour,count})),
    categories: [...categories].map(([category,revenue]) => ({category,revenue})), rows};
}
module.exports = { insights };
