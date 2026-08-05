/*
 * Orders Management for Merchant Page
 * Provides functions to load, filter, and manage merchant orders
 */

/**
 * Load merchant orders with real-time updates
 * @param {Function} callback - Callback function to handle orders data
 * @returns {Function} - Unsubscribe function to stop real-time updates
 */
async function loadOrdersRealtime(callback) {
  const auth = window.auth;
  const db = window.db;
  
  if (!auth || !auth.currentUser || !db) {
    console.error('Orders: Auth or DB not available');
    return null;
  }
  
  const merchantId = auth.currentUser.uid;
  
  try {
    const { collection, query, where, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc'),
      where('status', 'in', ['pending', 'accepted', 'preparing', 'ready'])
    );
    
    const unsubscribe = onSnapshot(ordersQuery, snapshot => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by createdAt (already sorted by query, but ensure)
      orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
      
      callback(orders);
    }, error => {
      console.error('Orders listener error:', error);
    });
    
    return unsubscribe;
    
  } catch (error) {
    console.error('Failed to setup orders listener:', error);
    return null;
  }
}

/**
 * Load all orders without real-time updates
 * @returns {Array} - Array of order objects
 */
async function loadOrders() {
  const auth = window.auth;
  const db = window.db;
  
  if (!auth || !auth.currentUser || !db) {
    console.error('Orders: Auth or DB not available');
    return null;
  }
  
  const merchantId = auth.currentUser.uid;
  
  try {
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(ordersQuery);
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by date
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    return orders;
    
  } catch (error) {
    console.error('Error loading orders:', error);
    return null;
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID to update
 * @param {string} newStatus - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise} - Promise that resolves when update is complete
 */
async function updateOrderStatus(orderId, newStatus, additionalData = {}) {
  const db = window.db;
  
  if (!db) {
    throw new Error('Database not available');
  }
  
  try {
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    // Add timestamps based on status
    if (newStatus === 'accepted') {
      updateData.acceptedAt = serverTimestamp();
    } else if (newStatus === 'preparing') {
      updateData.preparingAt = serverTimestamp();
    } else if (newStatus === 'ready') {
      updateData.readyAt = serverTimestamp();
    } else if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, updateData);
    
    console.log(`Order ${orderId} status updated to ${newStatus}`);
    
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Filter orders by status
 * @param {Array} orders - Array of orders to filter
 * @param {string} status - Status to filter by
 * @returns {Array} - Filtered orders
 */
function filterOrdersByStatus(orders, status) {
  if (!orders || status === 'all') {
    return orders || [];
  }
  
  return orders.filter(order => order.status === status);
}

/**
 * Format order status for display
 * @param {string} status - Order status
 * @returns {string} - Formatted status with proper capitalization
 */
function formatOrderStatus(status) {
  const statusMap = {
    'pending': 'Pending',
    'accepted': 'Accepted',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || status;
}

/**
 * Get status color for UI display
 * @param {string} status - Order status
 * @returns {string} - CSS classes for styling
 */
function getOrderStatusColor(status) {
  const colorMap = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'accepted': 'bg-green-100 text-green-800',
    'preparing': 'bg-blue-100 text-blue-800',
    'ready': 'bg-purple-100 text-purple-800',
    'completed': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export {
  loadOrdersRealtime,
  loadOrders,
  updateOrderStatus,
  filterOrdersByStatus,
  formatOrderStatus,
  getOrderStatusColor
};