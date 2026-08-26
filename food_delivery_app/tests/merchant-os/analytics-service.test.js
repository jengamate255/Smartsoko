import { describe, it, expect } from 'vitest';
import {
  dayKey, summarizeOrders, dailySeries, topProducts, netProfit,
} from '../../server/src/services/analytics-service.js';

const NOW = new Date().toISOString();
const iso = (daysAgo, h = 10) => new Date(Date.now() - daysAgo * 86400000 - (14 - h) * 3600000).toISOString();

const ORDERS = [
  { createdAt: iso(0), status: 'delivered', total: 20000, customerId: 'c1', items: [{ id: 'p1', name: 'Chapati', price: 4000, quantity: 5 }] },
  { createdAt: iso(0), status: 'pending', total: 8000, customerId: 'c2', items: [{ id: 'p2', name: 'Ndizi', price: 2000, quantity: 4 }] },
  { createdAt: iso(1), status: 'completed', total: 15000, cost: 9000, customerId: 'c1', items: [{ id: 'p1', name: 'Chapati', price: 5000, quantity: 3 }] },
  { createdAt: iso(3), status: 'cancelled', total: 99999, customerId: 'c3', items: [] },
  { createdAt: iso(40), status: 'delivered', total: 5000, customerId: 'c1', items: [] },
];

describe('analytics service (single source of truth)', () => {
  it('dayKey buckets in EAT not UTC', () => {
    // 2026-08-25T20:30Z is already 2026-08-25 23:30 EAT → same day
    expect(dayKey('2026-08-25T20:30:00Z')).toBe('2026-08-25');
    // 2026-08-25T21:30Z is 2026-08-26 00:30 EAT → next day
    expect(dayKey('2026-08-25T21:30:00Z')).toBe('2026-08-26');
  });

  it('summarizeOrders excludes cancelled and out-of-range orders', () => {
    const week = summarizeOrders(ORDERS, { from: iso(7) });
    expect(week.orders).toBe(3);
    expect(week.revenue).toBe(43000); // 20000 + 8000 + 15000; cancelled 99999 excluded
    expect(week.cancelled).toBe(1);
    expect(week.aov).toBe(Math.round(43000 / 3));
    expect(week.customers).toBe(2);

    const month = summarizeOrders(ORDERS, { from: iso(60) });
    expect(month.orders).toBe(4);
    expect(month.revenue).toBe(48000);
  });

  it('gross profit uses order cost snapshots when present', () => {
    const s = summarizeOrders([ORDERS[2]]);
    expect(s.grossProfit).toBe(6000); // 15000 − 9000
  });

  it('dailySeries covers zero-days with no gaps', () => {
    const series = dailySeries(ORDERS, 7);
    expect(series).toHaveLength(7);
    const withData = series.filter((d) => d.orders > 0);
    expect(withData.length).toBeGreaterThanOrEqual(2);
    expect(series[series.length - 1].day).toBe(dayKey(NOW));
  });

  it('topProducts aggregates units and revenue across orders', () => {
    const top = topProducts(ORDERS, 5);
    const chapati = top.find((t) => t.id === 'p1');
    expect(chapati.units).toBe(8);
    expect(chapati.revenue).toBe(35000); // 4000*5 + 5000*3
    expect(top[0].id).toBe('p1'); // sorted by revenue
  });

  it('netProfit subtracts expenses in the same window only', () => {
    const summary = summarizeOrders(ORDERS, { from: iso(7) });
    const expenses = [
      { amount: 3000, date: iso(0), category: 'transport' },
      { amount: 1000, date: iso(50), category: 'rent' }, // outside window
    ];
    const n = netProfit(summary, expenses, { from: iso(7) });
    expect(n.expenses).toBe(3000);
    expect(n.netProfit).toBe(summary.grossProfit - 3000);
  });
});
