/**
 * Customer Page Enhancement Functions
 * Add these functions to customer.html to enhance Firebase integration
 */

// Load sellers from Firebase in real-time
async function loadSellersFromFirebase() {
  const db = window.db;
  if (!db) {
    console.warn('Firebase not initialized');
    return;
  }

  try {
    // Dynamic import for Modular SDK
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    let sellers;
    
    try {
      // Try indexed query first (requires composite index)
      const sellersQuery = query(
        collection(db, 'sellers'),
        where('isOpen', '==', true),
        orderBy('rating', 'desc')
      );
      
      const snapshot = await getDocs(sellersQuery);
      sellers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (indexError) {
      // Fallback: query without ordering, sort client-side
      if (indexError.message && indexError.message.includes('requires an index')) {
        console.log('Firestore index missing, using fallback query');
        
        const simpleQuery = query(
          collection(db, 'sellers'),
          where('isOpen', '==', true)
        );
        
        const snapshot = await getDocs(simpleQuery);
        sellers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by rating client-side
        sellers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        throw indexError;
      }
    }

    console.log(`Loaded ${sellers.length} sellers from Firebase`);
    return sellers;
  } catch (error) {
    console.error('Error loading sellers:', error);
    return [];
  }
}

// Load products from Firebase
async function loadProductsFromFirebase(sellerId = null) {
  const db = window.db;
  if (!db) return [];

  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    let constraints = [
      where('isAvailable', '==', true),
      orderBy('createdAt', 'desc'),
      limit(100)
    ];
    
    if (sellerId) {
      constraints.push(where('sellerId', '==', sellerId));
    }

    const productsQuery = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(productsQuery);
    
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Loaded ${products.length} products`);
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

// Create order in Firebase
async function createOrder(orderData) {
  const db = window.db;
  const auth = window.auth;
  
  if (!db || !auth) {
    alert('Please login to place an order');
    return null;
  }

  const user = auth.currentUser;
  if (!user) {
    alert('Please login to place an order');
    return null;
  }

  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const order = {
      customerId: user.uid,
      customerName: user.displayName || user.email,
      customerEmail: user.email,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      deliveryAddress: orderData.deliveryAddress,
      deliveryCoords: orderData.deliveryCoords,
      paymentMethod: orderData.paymentMethod || 'cash',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    console.log('Order created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    alert('Failed to create order: ' + error.message);
    return null;
  }
}

// Track order in real-time
async function trackOrderRealtime(orderId, callback) {
  const db = window.db;
  if (!db) return null;

  try {
    const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const orderDocRef = doc(db, 'orders', orderId);
    
    return onSnapshot(orderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const order = { id: docSnap.id, ...docSnap.data() };
        callback(order);
      }
    }, error => {
      console.error('Error tracking order:', error);
    });
  } catch (error) {
    console.error('Error setting up order tracking:', error);
    return null;
  }
}

// Add to wishlist
async function addToWishlist(productId) {
  const db = window.db;
  const auth = window.auth;
  
  if (!db || !auth) {
    alert('Please login to save items');
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  try {
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const wishlistDocRef = doc(db, 'users', user.uid, 'wishlist', productId);
    
    await setDoc(wishlistDocRef, {
      productId: productId,
      addedAt: serverTimestamp()
    });
    console.log('Added to wishlist');
  } catch (error) {
    console.error('Error adding to wishlist:', error);
  }
}

// Get order history
async function getOrderHistory() {
  const db = window.db;
  const auth = window.auth;
  
  if (!db || !auth) return [];

  const user = auth.currentUser;
  if (!user) return [];

  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(ordersQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading order history:', error);
    return [];
  }
}
