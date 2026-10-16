/**
 * Orders Module
 * Provides order loading and management functionality
 */

import { db } from '../config/firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { loadOrdersRealtime } from './merchant-enhancements.js';

/**
 * Load orders for a seller (one-time fetch)
 * @param {string} sellerId - Optional seller ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of order objects
 */
export async function loadOrders(sellerId = null, options = {}) {
  const targetSellerId = sellerId || window.currentSeller?.id;
  if (!targetSellerId) {
    console.warn('No seller ID for loadOrders');
    return [];
  }

  try {
    const ordersRef = collection(db, 'orders');
    const constraints = [
      where('sellerId', '==', targetSellerId),
      orderBy('createdAt', 'desc')
    ];

    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    if (options.status) {
      constraints.unshift(where('status', '==', options.status));
    }

    const q = query(collection(db, 'orders'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error loading orders:', error);
    throw error;
  }
}

/**
 * Search orders by customer name
 * @param {string} customerName - Customer name to search
 * @param {string} statusFilter - Optional status filter
 * @returns {Promise<Array>} Matching orders
 */
export async function searchOrdersByCustomer(customerName, statusFilter = 'all') {
  const sellerId = window.currentSeller?.id;
  if (!sellerId || !customerName) return [];

  try {
    const orders = await loadOrders(sellerId, { limit: 200 });
    return orders.filter(order => {
      const nameMatch = (order.customerName || '').toLowerCase().includes(customerName.toLowerCase());
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;
      return nameMatch && statusMatch;
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    return [];
  }
}

/**
 * Get order by ID
 * @param {string} orderId - Order document ID
 * @returns {Promise<Object|null>} Order object or null
 */
export async function getOrderById(orderId) {
  if (!orderId) return null;
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    return orderDoc.exists() ? { id: orderDoc.id, ...orderDoc.data() } : null;
  } catch (error) {
    console.error('Error getting order:', error);
    return null;
  }
}

