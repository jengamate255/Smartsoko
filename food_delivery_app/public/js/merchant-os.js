/**
 * Merchant OS frontend client (public/js/merchant-os.js)
 * ES module. Talks ONLY to /api/merchant/* with a real Firebase ID token.
 * No hardcoded business data anywhere — every number comes from the backend.
 *
 * Usage from merchant.html:
 *   import { MerchantOS } from './js/merchant-os.js';
 *   const os = new MerchantOS();
 *   await os.refreshOverview();          // renders #mosOverview widgets
 *   os.renderOrdersTable(...); etc.
 */
'use strict';

const TZS_FMT = new Intl.NumberFormat('sw-TZ', { maximumFractionDigits: 0 });

export function fmtTZS(n) {
  return 'TSh ' + TZS_FMT.format(Number(n) || 0);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export class MerchantOS {
  constructor() {
    this.token = null;
    this.overview = null;
    this._notifTimer = null;
  }

  /** Format a number as Tanzanian Shillings (shared with merchant.html inline usage). */
  fmtTZS(n) { return fmtTZS(n); }

  /** Grab a fresh Firebase ID token; throws if not signed in. */
  async ensureToken() {
    if (!window.auth) throw new Error('Firebase auth not initialized');
    const user = window.auth.currentUser;
    if (!user) throw new Error('Not signed in');
    this.token = await user.getIdToken(true);
    return this.token;
  }

  async api(path, options = {}) {
    await this.ensureToken();
    const res = await fetch('/api/merchant' + path, {
      method: options.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + this.token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // ─── Overview / home ────────────────────────────────────────────
  async refreshOverview() {
    const { data } = await this.api('/overview');
    this.overview = data;

    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('mosTodayRevenue', esc(fmtTZS(data.today.revenue)));
    set('mosTodayOrders', esc(data.today.orders));
    set('mosTodayProfit', esc(fmtTZS(data.today.netProfit)));
    set('mosMonthRevenue', esc(fmtTZS(data.month.revenue)));
    set('mosPendingOrders', esc(data.pendingOrders));
    set('mosCustomersMonth', esc(data.customersMonth));
    set('mosLowStockCount', esc(data.lowStockCount + data.outOfStockCount));
    set('mosOutstandingPayments', `${esc(data.outstandingPayments.count)} · ${esc(fmtTZS(data.outstandingPayments.total))}`);

    this.renderAlerts(data.alerts || []);
    this.renderSalesTrend(data.salesTrend || []);
    this.renderTopProducts(data.topProducts || []);
    this.renderRecentOrders(data.recentOrders || []);
    return data;
  }

  renderAlerts(alerts) {
    const el = document.getElementById('mosAlerts');
    if (!el) return;
    if (!alerts.length) { el.innerHTML = '<div class="text-sm text-gray-500">All clear — no alerts.</div>'; return; }
    const colors = { high: '#dc2626', medium: '#d97706', low: '#2563eb' };
    el.innerHTML = alerts.map((a) => `
      <div class="flex items-center gap-2 text-sm py-1">
        <span style="width:8px;height:8px;border-radius:50%;background:${colors[a.severity] || '#6b7280'};display:inline-block"></span>
        <span>${esc(a.message)}</span>
      </div>`).join('');
  }

  /** Inline SVG line chart of daily revenue — no external chart lib needed. */
  renderSalesTrend(series) {
    const el = document.getElementById('mosSalesChart');
    if (!el) return;
    if (!series.length) { el.innerHTML = '<div class="text-sm text-gray-500">No sales data yet.</div>'; return; }
    const w = 560, h = 160, pad = 24;
    const max = Math.max(1, ...series.map((s) => s.revenue));
    const pts = series.map((s, i) => {
      const x = pad + (i / Math.max(1, series.length - 1)) * (w - pad * 2);
      const y = h - pad - (s.revenue / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const labels = series
      .filter((_, i) => i % Math.ceil(series.length / 7) === 0)
      .map((s, i) => `<text x="${pad + i * ((w - pad * 2) / Math.max(1, Math.ceil(series.length / 7) - 1))}" y="${h - 4}" font-size="9" fill="#9ca3af" text-anchor="middle">${esc(s.day.slice(5))}</text>`)
      .join('');
    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
        <polyline points="${pts.join(' ')}" fill="none" stroke="#059669" stroke-width="2" stroke-linejoin="round"/>
        ${pts.map((p) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="2.5" fill="#059669"/>`).join('')}
        ${labels}
      </svg>
      <div class="text-xs text-gray-400 mt-1">Daily revenue, last ${series.length} days (TZS)</div>`;
  }

  renderTopProducts(top) {
    const el = document.getElementById('mosTopProducts');
    if (!el) return;
    if (!top.length) { el.innerHTML = '<div class="text-sm text-gray-500">No product sales yet.</div>'; return; }
    el.innerHTML = '<table class="w-full text-sm"><thead><tr class="text-left text-gray-500">' +
      '<th class="py-1">Product</th><th>Units</th><th class="text-right">Revenue</th></tr></thead><tbody>' +
      top.map((p) => `<tr class="border-t border-gray-100">
        <td class="py-1">${esc(p.name)}</td><td>${esc(p.units)}</td><td class="text-right">${esc(fmtTZS(p.revenue))}</td>
      </tr>`).join('') + '</tbody></table>';
  }

  renderRecentOrders(recent) {
    const el = document.getElementById('mosRecentOrders');
    if (!el) return;
    if (!recent.length) { el.innerHTML = '<div class="text-sm text-gray-500">No orders yet.</div>'; return; }
    const badge = { pending: '#d97706', accepted: '#2563eb', preparing: '#7c3aed', delivered: '#059669', completed: '#059669', cancelled: '#dc2626' };
    el.innerHTML = recent.map((o) => `
      <div class="flex items-center justify-between py-2 border-t border-gray-100 text-sm">
        <div>
          <div class="font-medium">${esc(o.customerName || 'Customer')}</div>
          <div class="text-xs text-gray-400">${esc(String(o.createdAt || '').slice(0, 16).replace('T', ' '))}</div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs px-2 py-0.5 rounded-full" style="background:${badge[o.status] || '#6b7280'}22;color:${badge[o.status] || '#6b7280'}">${esc(String(o.status || '').replace(/_/g, ' '))}</span>
          <span class="font-semibold">${esc(fmtTZS(o.total))}</span>
        </div>
      </div>`).join('');
  }

  // ─── Orders ─────────────────────────────────────────────────────
  async loadOrders(statusFilter = 'all') {
    const qs = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const { data, counts, allowedTransitionsHint } = await this.api('/orders' + qs);
    return { orders: data || [], counts: counts || {}, hints: allowedTransitionsHint || {} };
  }

  /**
   * Advance an order through its state machine. The server enforces valid
   * transitions; we surface its error message when a move is illegal.
   */
  async advanceOrder(orderId, toStatus) {
    try {
      await this.api(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'POST', body: { status: toStatus } });
      window.skToast?.show?.('Order updated', 'success') || window.showToast?.('Order updated');
      return true;
    } catch (e) {
      window.skToast?.show?.(e.message, 'error') || window.showToast?.(e.message, 'error') || alert(e.message);
      return false;
    }
  }

  // ─── Products ───────────────────────────────────────────────────
  async loadProducts(params = '') {
    const { data } = await this.api('/products' + (params ? '?' + params : ''));
    return data || [];
  }

  async createProduct(payload) {
    const { data } = await this.api('/products', { method: 'POST', body: payload });
    return data;
  }

  async updateProduct(productId, patch) {
    const { data } = await this.api(`/products/${encodeURIComponent(productId)}`, { method: 'PUT', body: patch });
    return data;
  }

  // ─── Inventory ──────────────────────────────────────────────────
  async loadInventory() {
    const { data, summary } = await this.api('/inventory');
    return { rows: data || [], summary };
  }

  async adjustStock(productId, delta, type = 'adjustment', reason = undefined) {
    try {
      const { data } = await this.api('/inventory/adjust', {
        method: 'POST', body: { productId, delta: Number(delta), type, reason },
      });
      return data;
    } catch (e) {
      window.skToast?.show?.(e.message, 'error');
      throw e;
    }
  }

  async stockMovements(productId) {
    const { data } = await this.api('/inventory/movements' + (productId ? `?productId=${encodeURIComponent(productId)}` : ''));
    return data || [];
  }

  // ─── Customers ──────────────────────────────────────────────────
  async loadCustomers(segment) {
    const qs = segment && segment !== 'all' ? `?segment=${encodeURIComponent(segment)}` : '';
    const { data } = await this.api('/customers' + qs);
    return data || [];
  }

  async customerNotes(customerId, note) {
    const { data } = await this.api(`/customers/${encodeURIComponent(customerId)}/notes`, { method: 'POST', body: { note } });
    return data;
  }

  // ─── Payments (read-only truth) ────────────────────────────────
  async loadPayments(filter = {}) {
    const params = new URLSearchParams(filter).toString();
    const { data, summary } = await this.api('/payments' + (params ? '?' + params : ''));
    return { payments: data || [], summary };
  }

  // ─── Suppliers & Purchases ─────────────────────────────────────
  async loadSuppliers() {
    const { data } = await this.api('/suppliers');
    return data || [];
  }

  async createSupplier(payload) {
    const { data } = await this.api('/suppliers', { method: 'POST', body: payload });
    return data;
  }

  async createPurchaseOrder(payload) {
    const { data } = await this.api('/purchases', { method: 'POST', body: payload });
    return data;
  }

  async receiveGoods(poId, receipts) {
    const { data } = await this.api(`/purchases/${encodeURIComponent(poId)}/receive`, { method: 'POST', body: { receipts } });
    return data;
  }

  // ─── Expenses ──────────────────────────────────────────────────
  async loadExpenses(range = {}) {
    const params = new URLSearchParams(range).toString();
    const { data, totalsByCategory, total } = await this.api('/expenses' + (params ? '?' + params : ''));
    return { expenses: data || [], totalsByCategory, total };
  }

  async createExpense(payload) {
    const { data } = await this.api('/expenses', { method: 'POST', body: payload });
    return data;
  }

  // ─── Staff ─────────────────────────────────────────────────────
  async loadStaff() {
    const { data } = await this.api('/staff');
    return data || [];
  }

  async inviteStaff(payload) {
    const { data } = await this.api('/staff', { method: 'POST', body: payload });
    return data;
  }

  async setStaffCapabilities(staffId, capabilities) {
    const { data } = await this.api(`/staff/${encodeURIComponent(staffId)}/capabilities`, { method: 'PUT', body: { capabilities } });
    return data;
  }

  // ─── Notifications ─────────────────────────────────────────────
  async loadNotifications() {
    const { data, unread } = await this.api('/notifications');
    return { notifications: data || [], unread };
  }

  async markNotificationsRead(ids = null) {
    await this.api('/notifications/mark-read', { method: 'POST', body: { ids } });
  }

  startNotificationPolling(intervalMs = 60000) {
    this.stopNotificationPolling();
    this._notifTimer = setInterval(async () => {
      try {
        const { notifications, unread } = await this.loadNotifications();
        const bell = document.getElementById('mosUnreadBadge');
        if (bell) {
          bell.textContent = String(unread);
          bell.classList.toggle('hidden', unread === 0);
        }
      } catch (_) { /* offline or logged out */ }
    }, intervalMs);
  }

  stopNotificationPolling() {
    if (this._notifTimer) clearInterval(this._notifTimer);
    this._notifTimer = null;
  }
}

// Auto-instantiate for inline script usage on merchant.html
if (typeof window !== 'undefined') {
  window.MerchantOS = MerchantOS;
  window.merchantOS = window.merchantOS || new MerchantOS();
}
