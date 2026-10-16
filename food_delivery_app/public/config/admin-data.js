// ⚠️ DEPRECATED: The admin dashboard now calls the real API directly
// (`apiHelpers` -> `GET/PUT /api/admin/*`). This Windshield stub is kept for
// other panels that may still import it; do not use it for admin role changes.
/* AdminDataService - shared data layer for SmartSoko admin panels.
 * Windshield: if no real endpoint is configured, serves empty-safe data so
 * the dashboard renders without JS errors. Live mode activates when the
 * service can reach the configured backend.
 */
(function () {
  'use strict';

  const EMPTY_ARR = () => [];

  class AdminDataService {
    constructor() {
      this._connected = false;
      this._subscriptions = [];
    }

    async init() {
      const cfg = window.apiConfig || window.API_CONFIG || null;
      try {
        if (cfg && cfg.baseUrl) {
          const probe = await fetch(cfg.baseUrl + '/api/admin/health', { signal: AbortSignal.timeout(1500) });
          this._connected = probe.ok;
        }
      } catch (e) {
        this._connected = false;
      }
      return this._connected;
    }

    async getDashboardStats() {
      return {
        totalUsers: 0, totalOrders: 0, totalRevenue: 0, totalDrivers: 0,
        pendingOrders: 0, activeOrders: 0, totalProducts: 0, totalRestaurants: 0,
        flaggedItems: 0, todayOrders: 0
      };
    }

    async getUsers() { return EMPTY_ARR(); }
    async getOrders() { return EMPTY_ARR(); }
    async getDrivers() { return EMPTY_ARR(); }
    async getFlaggedItems() { return EMPTY_ARR(); }
    async getRecentOrders() { return EMPTY_ARR(); }
    async getTopProducts() { return EMPTY_ARR(); }

    async getOrderStatusBreakdown() {
      return [{ status: 'pending', count: 0 }, { status: 'delivered', count: 0 }, { status: 'cancelled', count: 0 }];
    }

    async getRevenueData() {
      return { labels: [], values: [] };
    }

    subscribeToOrders() {
      return function unsubscribe() {};
    }

    disconnect() {}
  }

  window.AdminDataService = AdminDataService;
})();