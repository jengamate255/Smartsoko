/**
 * Analytics Module
 * Provides analytics data loading and rendering for the merchant dashboard
 */

import { db } from '../config/firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getSalesAnalytics } from './merchant-enhancements.js';

/**
 * Load analytics data for the dashboard
 * @param {string} period - Period in days: '7', '30', '365'
 * @returns {Promise<Object>} Analytics data
 */
export async function loadAnalytics(period = '30') {
  const sellerId = window.currentSeller?.id;
  if (!sellerId) {
    console.warn('No seller ID for analytics');
    return getEmptyAnalytics();
  }

  try {
    return await getSalesAnalytics(period, sellerId);
  } catch (error) {
    console.error('Error loading analytics:', error);
    return getEmptyAnalytics();
  }
}

/**
 * Fetch dashboard analytics (alias for loadAnalytics)
 * @param {string} period - Period in days
 * @returns {Promise<Object>} Analytics data
 */
export async function fetchDashboardAnalytics(period = '30') {
  return loadAnalytics(period);
}

/**
 * Render dashboard analytics to the UI
 * @param {Object} data - Analytics data from loadAnalytics
 */
export function renderDashboardAnalytics(data) {
  if (!data) return;

  // Update KPI cards
  updateElement('todaySales', formatTSh(data.todaySales));
  updateElement('orderCount', data.todayOrders);
  updateElement('avgOrderValue', formatTSh(data.avgToday));
  updateElement('pendingOrders', `${data.pendingCount} pending order${data.pendingCount === 1 ? '' : 's'}`);

  // Update delta badges
  updateDelta('salesDeltaBadge', data.salesChange);
  updateDelta('ordersDeltaBadge', data.ordersChange);
  updateDelta('aovDeltaBadge', data.aovChange);

  // Update analytics tab if visible
  updateElement('analyticsRevenue', formatTSh(data.totalSales));
  updateElement('analyticsOrders', data.totalOrders);
  updateElement('analyticsAov', formatTSh(data.avgOrderValue));
  updateElement('analyticsRetention', '68%'); // Placeholder
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateDelta(id, change) {
  const el = document.getElementById(id);
  if (!el) return;

  let icon = 'trending_flat', text = '0%', cls = 'kpi-delta';
  if (change > 0) {
    icon = 'trending_up';
    text = `+${change.toFixed(1)}%`;
    cls += ' delta-positive';
  } else if (change < 0) {
    icon = 'trending_down';
    text = `${change.toFixed(1)}%`;
    cls += ' delta-negative';
  }
  el.className = cls;
  el.innerHTML = `<span class="material-symbols-outlined" style="font-size: 12px;">${icon}</span>${text}`;
}

function formatTSh(amount) {
  return 'TSh ' + (amount || 0).toLocaleString();
}

function getEmptyAnalytics() {
  return {
    todaySales: 0,
    todayOrders: 0,
    pendingCount: 0,
    totalSales: 0,
    totalOrders: 0,
    completedOrders: 0,
    avgOrderValue: 0,
    avgToday: 0,
    avgYesterday: 0,
    yestSales: 0,
    yestOrders: 0,
    salesChange: 0,
    ordersChange: 0,
    aovChange: 0,
    orders: []
  };
}

/**
 * Initialize analytics module
 */
export async function initAnalytics() {
  console.log('Analytics module initialized');
  return true;
}

export { formatTSh };