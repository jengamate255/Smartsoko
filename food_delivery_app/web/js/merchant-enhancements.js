/**
 * Merchant Page Enhancement Functions
 * Add these functions to merchant.html to enhance Firebase integration
 */

// Initialize Firebase references for merchant
const getMerchantDb = () => window.db;
const getMerchantAuth = () => window.auth;

// Load merchant's orders in real-time
async function loadOrdersRealtime(callback) {
  const auth = getMerchantAuth();
  const db = getMerchantDb();
  
  if (!auth || !auth.currentUser) {
    console.warn('Merchant not authenticated');
    return null;
  }

  const merchantId = auth.currentUser.uid;

  try {
    const { collection, query, where, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(ordersQuery, snapshot => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(orders);
    }, error => {
      console.error('Error loading orders:', error);
    });
  } catch (error) {
    console.error('Error setting up orders listener:', error);
    return null;
  }
}

// Update order status
async function updateOrderStatus(orderId, newStatus, additionalData = {}) {
  const db = getMerchantDb();
  if (!db) return;

  try {
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

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

// Add product to inventory
async function addProduct(productData) {
  const db = getMerchantDb();
  const auth = getMerchantAuth();
  
  if (!db || !auth) {
    alert('Please login to add products');
    return null;
  }

  const merchant = auth.currentUser;
  if (!merchant) return null;

  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const product = {
      merchantId: merchant.uid,
      name: productData.name,
      description: productData.description || '',
      price: productData.price,
      category: productData.category || 'general',
      image: productData.image || '',
      isActive: true,
      stock: productData.stock || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'products'), product);
    console.log('Product added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    alert('Failed to add product: ' + error.message);
    return null;
  }
}

// Update product
async function updateProduct(productId, updateData) {
  const db = getMerchantDb();
  if (!db) return;

  try {
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    updateData.updatedAt = serverTimestamp();
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, updateData);
    console.log('Product updated');
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

// Delete product
async function deleteProduct(productId) {
  const db = getMerchantDb();
  if (!db) return;

  try {
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    console.log('Product deleted');
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Load merchant's products
async function loadMerchantProducts() {
  const db = getMerchantDb();
  const auth = getMerchantAuth();
  
  console.log('loadMerchantProducts called, db:', !!db, 'auth:', !!auth);
  
  if (!db || !auth) {
    console.warn('loadMerchantProducts: db or auth not available');
    return [];
  }

  const merchant = auth.currentUser;
  console.log('loadMerchantProducts: merchant =', merchant?.uid);
  
  if (!merchant) {
    console.warn('loadMerchantProducts: no current user');
    return [];
  }

  try {
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    console.log('loadMerchantProducts: querying with merchantId =', merchant.uid);
    const productsQuery = query(
      collection(db, 'products'),
      where('merchantId', '==', merchant.uid)
    );
    
    const snapshot = await getDocs(productsQuery);
    console.log('loadMerchantProducts: found', snapshot.size, 'products');

    // Sort client-side to avoid needing a composite Firestore index
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    console.log('loadMerchantProducts: returning', products.length, 'products');
    return products;
  } catch (error) {
    console.error('Error loading products in loadMerchantProducts:', error);
    return [];
  }
}

// Calculate sales analytics
async function getSalesAnalytics(period = 'today') {
  const db = getMerchantDb();
  const auth = getMerchantAuth();
  
  if (!db || !auth) return null;

  const merchant = auth.currentUser;
  if (!merchant) return null;

  try {
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    let startDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Use simple query with just merchantId to avoid composite index requirement
    const ordersQuery = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchant.uid)
    );
    
    const snapshot = await getDocs(ordersQuery);

    let totalSales = 0;
    let totalOrders = 0;
    const items = [];

    // Filter client-side to avoid composite index
    snapshot.docs.forEach(doc => {
      const order = doc.data();
      // Check status and date
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      if (order.status === 'completed' && orderDate >= startDate) {
        totalSales += order.totalAmount || 0;
        totalOrders++;
        if (order.items) {
          items.push(...order.items);
        }
      }
    });

    // Find top selling items
    const itemCounts = {};
    items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
    });

    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSales,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      topItems
    };
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return null;
  }
}

// Send notification to customer
async function sendCustomerNotification(customerId, message, orderId = null) {
  const db = getMerchantDb();
  const auth = getMerchantAuth();
  
  if (!db || !auth) return;

  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    await addDoc(collection(db, 'notifications'), {
      customerId: customerId,
      merchantId: auth.currentUser.uid,
      orderId: orderId,
      message: message,
      read: false,
      createdAt: serverTimestamp()
    });
    console.log('Notification sent');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Update merchant profile
async function updateMerchantProfile(profileData) {
  const db = getMerchantDb();
  const auth = getMerchantAuth();
  
  if (!db || !auth) return;

  const merchant = auth.currentUser;
  if (!merchant) return;

  try {
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const merchantRef = doc(db, 'merchants', merchant.uid);
    await updateDoc(merchantRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });

    // Also update user document
    const userRef = doc(db, 'users', merchant.uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });

    console.log('Profile updated');
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export {
  loadOrdersRealtime,
  updateOrderStatus,
  addProduct,
  updateProduct,
  deleteProduct,
  loadMerchantProducts,
  getSalesAnalytics,
  sendCustomerNotification,
  updateMerchantProfile
};
