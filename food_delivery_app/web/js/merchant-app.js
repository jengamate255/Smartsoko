/**
 * SmartSoko Merchant Dashboard - Modular JavaScript
 * Clean, organized, maintainable code structure
 */

const MerchantApp = (() => {
  // ── State Management ─────────────────────────────────────────────────
  const state = {
    currentSeller: null,
    allOrders: [],
    products: [],
    allReviews: [],
    selectedOrderId: null,
    initialLoadComplete: false,
    ordersUnsubscribe: null
  };

  // ── DOM Cache ────────────────────────────────────────────────────────
  const elements = {};

  function cacheElements() {
    const ids = [
      'ordersList', 'reviewsList', 'productsList', 'popularItems', 'peakHours',
      'categorySales', 'orderDetailsPanel', 'chatMessages', 'activePromosList',
      'restaurantRating', 'pendingOrders', 'totalReviews', 'availableItems',
      'salesTrend', 'todayRevenue', 'weeklyOrders', 'averageOrderValue',
      'ratingStars', 'ratingBreakdown', 'totalReviewCount', 'averageRating',
      'storeName', 'storeLogo', 'storeDescription', 'storeCategory', 'isOpen',
      'darkModeToggle', 'addMenuModal', 'menuModalTitle', 'menuModalSubmitBtn',
      'menuItemId', 'menuItemName', 'menuItemPrice', 'menuItemDesc',
      'menuItemImage', 'menuItemStock', 'menuItemCategory', 'menuItemVariations',
      'menuItemImageFile', 'imagePreview', 'imagePreviewContainer',
      'driverModal', 'chatModal', 'chatCustomerName', 'chatInput',
      'menuFilter', 'categoryOptions', 'promoSection'
    ];
    
    ids.forEach(id => {
      elements[id] = document.getElementById(id);
    });
  }

  // ── Utilities ───────────────────────────────────────────────────────
  const utils = {
    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    formatCurrency(amount) {
      return `TSh ${(amount || 0).toLocaleString()}`;
    },

    formatDate(dateValue) {
      if (!dateValue) return 'N/A';
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return date.toLocaleString();
    },

    truncateId(id) {
      return id ? id.slice(-8) : 'N/A';
    },

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

  // ── Templates ─────────────────────────────────────────────────────
  const templates = {
    orderItem(order, isSelected) {
      const safeId = utils.escapeHtml(order.id);
      const safeCustomer = utils.escapeHtml(order.customerName) || 'Customer';
      const safeStatus = utils.escapeHtml(order.status) || 'pending';
      const total = order.total || 0;
      const itemCount = order.items?.length || 0;
      
      return `
        <div onclick="MerchantApp.selectOrder('${safeId}')" 
             class="hover-lift border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-5 cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary shadow-md' : ''}">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-sm text-gray-500">#${utils.truncateId(order.id)}</p>
              <h4 class="font-semibold">${safeCustomer}</h4>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium ${templates.statusBadge(order.status)}">
              ${safeStatus}
            </span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500">${itemCount} items</span>
            <span class="font-bold text-green-600">${utils.formatCurrency(total)}</span>
          </div>
        </div>
      `;
    },

    statusBadge(status) {
      const badges = {
        pending: 'bg-yellow-100 text-yellow-800',
        preparing: 'bg-blue-100 text-blue-800',
        ready_for_delivery: 'bg-indigo-100 text-indigo-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
      };
      return badges[status] || 'bg-gray-100 text-gray-800';
    },

    productItem(item) {
      const isUnlimited = item.stock === undefined || item.stock < 0;
      const stockDisplay = isUnlimited ? 'Unlimited' : `${item.stock} left`;
      
      return `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col h-full relative group">
          <div class="absolute top-3 left-3 z-10 bg-white rounded flex items-center justify-center shadow-sm">
            <input type="checkbox" class="product-select-cb w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
                   value="${item.id}" onchange="MerchantApp.updateBulkActionUI()">
          </div>
          <div class="w-full h-32 rounded-md mb-3 overflow-hidden bg-gray-100 relative">
            <img src="${item.imageUrl || 'images/default-product.png'}" 
                 alt="${utils.escapeHtml(item.name)}" 
                 class="w-full h-full object-cover" 
                 onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="absolute inset-0 flex items-center justify-center hidden">
              <div class="text-center">
                <span class="material-symbols-outlined text-4xl text-gray-400">image</span>
                <p class="text-xs text-gray-500 mt-1">${utils.escapeHtml(item.name)}</p>
              </div>
            </div>
          </div>
          <div class="flex justify-between items-start mb-1">
            <div>
              <h4 class="font-semibold">${utils.escapeHtml(item.name)}</h4>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${utils.escapeHtml(item.category) || 'General'}</span>
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1 font-medium shadow-sm border border-blue-100">📦 ${stockDisplay}</span>
            </div>
            <span class="text-lg font-bold text-green-600 whitespace-nowrap ml-2">${utils.formatCurrency(item.price)}</span>
          </div>
          <p class="text-gray-600 text-sm my-3 flex-grow">${utils.escapeHtml(item.description) || 'No description'}</p>
          <div class="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
            <span class="px-2 py-1 ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs rounded-full font-medium">
              ${item.isAvailable ? '● Available' : '● Unavailable'}
            </span>
            <div class="flex space-x-1">
              <button onclick="MerchantApp.toggleProductAvailability('${item.id}')" 
                      class="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Toggle Availability">
                <span class="material-symbols-outlined text-sm">power_settings_new</span>
              </button>
              <button onclick="MerchantApp.openEditMenuItem('${item.id}')" 
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Item">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
              <button onclick="MerchantApp.deleteProduct('${item.id}')" 
                      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Item">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    reviewItem(review) {
      const safeCustomer = utils.escapeHtml(review.customerName) || 'Anonymous';
      const safeComment = utils.escapeHtml(review.comment) || 'No comment';
      const orderIdShort = review.orderId ? review.orderId.slice(-8) : '';
      const date = review.createdAt ? new Date(review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt).toLocaleDateString() : '';
      
      return `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-primary">person</span>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold">${safeCustomer}</h4>
                  <div class="flex items-center gap-1 mt-0.5">
                    ${templates.ratingStars(review.rating)}
                    <span class="text-xs text-gray-500 ml-2">${date}</span>
                  </div>
                </div>
                ${orderIdShort ? `<span class="text-xs text-gray-400">Order #${orderIdShort}</span>` : ''}
              </div>
              <p class="text-gray-600 text-sm mt-2">${safeComment}</p>
              ${review.reply ? `<div class="mt-3 bg-gray-50 p-3 rounded-lg"><p class="text-sm text-gray-700"><span class="font-semibold">Your reply:</span> ${utils.escapeHtml(review.reply)}</p></div>` : ''}
            </div>
          </div>
        </div>
      `;
    },

    ratingStars(rating) {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        stars.push(`<span class="material-symbols-outlined text-sm ${i <= rating ? 'text-yellow-500' : 'text-gray-300'}">star</span>`);
      }
      return stars.join('');
    }
  };

  // ── API Service ─────────────────────────────────────────────────────
  const api = {
    async getSeller(uid) {
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const q = query(collection(db, 'sellers'), where('ownerId', '==', uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
        // Fallback for demo
        const fallbackId = (uid === 'merchant@smartsoko.com' || uid === 'demo-merchant') ? 'demo-seller' : uid;
        return { id: fallbackId, ownerId: uid, name: 'Demo Restaurant', category: 'food', isOpen: true, rating: '4.5' };
      } catch (error) {
        console.error('Error loading seller:', error);
        return null;
      }
    },

    async getOrders(sellerId) {
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const q = query(collection(db, 'orders'), where('sellerId', '==', sellerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error loading orders:', error);
        return [];
      }
    },

    // Real-time order subscription - NEW ORDERS APPEAR INSTANTLY
    subscribeToOrders(sellerId, onUpdate) {
      try {
        const db = window.db;
        if (!db) {
          console.error('Firestore not initialized');
          return () => {};
        }
        
        // Dynamic import for onSnapshot
        import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')
          .then(({ collection, query, where, orderBy, onSnapshot }) => {
            const q = query(
              collection(db, 'orders'),
              where('sellerId', '==', sellerId),
              orderBy('createdAt', 'desc')
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              onUpdate(orders);
              
              // Show notification for new orders
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  const order = change.doc.data();
                  if (order.status === 'pending') {
                    console.log('🔔 New order received:', change.doc.id);
                    // Dispatch event for UI notification
                    window.dispatchEvent(new CustomEvent('newOrderReceived', {
                      detail: { orderId: change.doc.id, order: order }
                    }));
                  }
                }
              });
            }, (error) => {
              console.error('Error in orders subscription:', error);
              // Fallback to query without ordering if index missing
              if (error.code === 'failed-precondition') {
                console.log('⚠️ Firestore index missing, using fallback query');
                const fallbackQ = query(collection(db, 'orders'), where('sellerId', '==', sellerId));
                onSnapshot(fallbackQ, (snapshot) => {
                  const orders = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => {
                      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                      return dateB - dateA;
                    });
                  onUpdate(orders);
                });
              }
            });
            
            // Store unsubscribe function
            state.ordersUnsubscribe = unsubscribe;
          });
        
        return () => state.ordersUnsubscribe?.();
      } catch (error) {
        console.error('Error setting up orders subscription:', error);
        return () => {};
      }
    },

    async getProducts(sellerId) {
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error loading products:', error);
        return [];
      }
    },

    async getReviews(sellerId) {
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        let snapshot;
        try {
          const q = query(collection(db, 'reviews'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'), limit(50));
          snapshot = await getDocs(q);
        } catch (indexError) {
          // Fallback without ordering
          const { collection, query, where, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
          const q = query(collection(db, 'reviews'), where('sellerId', '==', sellerId), limit(50));
          snapshot = await getDocs(q);
          // Sort client-side
          return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
              const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
              return dateB - dateA;
            });
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error loading reviews:', error);
        return [];
      }
    }
  };

  // ── UI Actions ──────────────────────────────────────────────────────
  const actions = {
    async selectOrder(orderId) {
      state.selectedOrderId = orderId;
      actions.renderOrders();
      
      const order = state.allOrders.find(o => o.id === orderId);
      if (!order || !elements.orderDetailsPanel) return;

      const items = order.items || [];
      elements.orderDetailsPanel.innerHTML = `
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-lg">Order #${utils.truncateId(order.id)}</h4>
              <p class="text-sm text-gray-500">${utils.formatDate(order.createdAt)}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium ${templates.statusBadge(order.status)}">
              ${utils.escapeHtml(order.status)}
            </span>
          </div>
          <div class="border-t border-b border-gray-200 py-3">
            ${items.map(item => `
              <div class="flex justify-between items-center py-2">
                <span>${item.quantity}x ${utils.escapeHtml(item.name)}</span>
                <span class="font-medium">${utils.formatCurrency(item.price * item.quantity)}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span class="text-green-600">${utils.formatCurrency(order.total)}</span>
          </div>
          <div class="border-t border-gray-200 pt-3 flex justify-between items-center">
            <div>
              <p class="text-sm text-gray-500 mb-2">Customer Communications</p>
              <button onclick="MerchantApp.openCustomerChat('${utils.escapeHtml(order.id)}', '${utils.escapeHtml(order.customerName || 'Customer')}')" 
                      class="text-primary font-medium hover:underline flex items-center gap-1 text-sm">
                <span class="material-symbols-outlined text-sm">chat</span> Message Customer
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderOrders() {
      if (!elements.ordersList) return;
      
      if (state.allOrders.length === 0) {
        elements.ordersList.innerHTML = '<p class="text-center text-gray-500 py-8">No orders found</p>';
        return;
      }
      
      elements.ordersList.innerHTML = state.allOrders.map(order => 
        templates.orderItem(order, state.selectedOrderId === order.id)
      ).join('');
    },

    renderProducts(items) {
      if (!elements.productsList) return;
      
      if (items.length === 0) {
        elements.productsList.innerHTML = '<p class="text-center text-gray-500 py-8">No products found</p>';
        return;
      }
      
      elements.productsList.innerHTML = items.map(item => templates.productItem(item)).join('');
    },

    renderReviews(reviews) {
      if (!elements.reviewsList) return;
      
      if (reviews.length === 0) {
        elements.reviewsList.innerHTML = '<p class="text-center text-gray-500 py-8">No reviews yet</p>';
        return;
      }
      
      elements.reviewsList.innerHTML = reviews.map(review => templates.reviewItem(review)).join('');
    },

    updateBulkActionUI() {
      // Implementation for bulk actions
      const selected = document.querySelectorAll('.product-select-cb:checked');
      const bulkMenu = document.getElementById('bulkActionsMenu');
      const countEl = document.getElementById('selectedCount');
      
      if (bulkMenu && countEl) {
        if (selected.length > 0) {
          bulkMenu.classList.remove('hidden');
          bulkMenu.classList.add('flex');
          countEl.textContent = selected.length;
        } else {
          bulkMenu.classList.add('hidden');
          bulkMenu.classList.remove('flex');
        }
      }
    },

    async toggleProductAvailability(productId) {
      const product = state.products.find(p => p.id === productId);
      if (!product) return;
      
      const newStatus = !product.isAvailable;
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        await updateDoc(doc(db, 'products', productId), { isAvailable: newStatus });
        product.isAvailable = newStatus;
        actions.renderProducts(state.products);
        actions.showNotification(`Product ${newStatus ? 'enabled' : 'disabled'}`, 'success');
      } catch (error) {
        console.error('Error updating product:', error);
        actions.showNotification('Failed to update product', 'error');
      }
    },

    async deleteProduct(productId) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        await deleteDoc(doc(db, 'products', productId));
        state.products = state.products.filter(p => p.id !== productId);
        actions.renderProducts(state.products);
        actions.showNotification('Product deleted', 'success');
      } catch (error) {
        console.error('Error deleting product:', error);
        actions.showNotification('Failed to delete product', 'error');
      }
    },

    openEditMenuItem(productId) {
      const product = state.products.find(p => p.id === productId);
      if (!product || !elements.addMenuModal) return;

      elements.menuModalTitle.textContent = 'Edit Menu Item';
      elements.menuModalSubmitBtn.textContent = 'Save Changes';
      elements.menuItemId.value = product.id;
      elements.menuItemName.value = product.name || '';
      elements.menuItemPrice.value = product.price || '';
      elements.menuItemDesc.value = product.description || '';
      elements.menuItemImage.value = product.imageUrl || '';
      elements.menuItemStock.value = product.stock !== undefined ? product.stock : -1;
      elements.menuItemCategory.value = product.category || '';
      elements.menuItemVariations.value = product.variations || '';

      actions.updateImagePreview(product.imageUrl || '');
      
      elements.addMenuModal.classList.remove('hidden');
      elements.addMenuModal.classList.add('flex');
    },

    openAddMenuItem() {
      if (!elements.addMenuModal) return;
      
      elements.menuModalTitle.textContent = 'Add Menu Item';
      elements.menuModalSubmitBtn.textContent = 'Add Item';
      elements.menuItemId.value = '';
      document.querySelector('#addMenuModal form')?.reset();
      
      elements.addMenuModal.classList.remove('hidden');
      elements.addMenuModal.classList.add('flex');
    },

    closeAddMenuItem() {
      if (!elements.addMenuModal) return;
      elements.addMenuModal.classList.add('hidden');
      elements.addMenuModal.classList.remove('flex');
      elements.menuItemId.value = '';
      document.querySelector('#addMenuModal form')?.reset();
      elements.imagePreviewContainer?.classList.add('hidden');
      if (elements.imagePreview) elements.imagePreview.src = '';
    },

    updateImagePreview(path) {
      if (!elements.imagePreview || !elements.imagePreviewContainer) return;
      
      if (!path || path.trim() === '') {
        elements.imagePreview.src = 'images/default-product.png';
      } else {
        elements.imagePreview.src = path;
      }
      elements.imagePreviewContainer.classList.remove('hidden');
      elements.imagePreview.onerror = function() {
        this.src = 'images/default-product.png';
      };
    },

    async submitAddMenuItem(e) {
      e.preventDefault();
      
      const id = elements.menuItemId?.value;
      const name = elements.menuItemName?.value;
      const price = parseFloat(elements.menuItemPrice?.value) || 0;
      const description = elements.menuItemDesc?.value;
      const imageUrl = elements.menuItemImage?.value;
      const stock = parseInt(elements.menuItemStock?.value, 10);
      const category = elements.menuItemCategory?.value || 'General';
      const variations = elements.menuItemVariations?.value;

      if (!name || price <= 0) {
        actions.showNotification('Please fill in all required fields', 'error');
        return;
      }

      const productData = {
        name, price, description, imageUrl, stock, category,
        sellerId: state.currentSeller?.id,
        isAvailable: true,
        updatedAt: new Date().toISOString()
      };

      if (variations) productData.variations = variations;

      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { doc, updateDoc, addDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        
        if (id) {
          await updateDoc(doc(db, 'products', id), productData);
        } else {
          await addDoc(collection(db, 'products'), { ...productData, createdAt: new Date().toISOString() });
        }
        
        actions.closeAddMenuItem();
        actions.loadProducts();
        actions.showNotification(id ? 'Product updated' : 'Product added', 'success');
      } catch (error) {
        console.error('Error saving product:', error);
        actions.showNotification('Failed to save product', 'error');
      }
    },

    showNotification(message, type = 'info') {
      const colors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500'
      };
      
      const notification = document.createElement('div');
      notification.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-[300]`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 3000);
    },

    logout() {
      localStorage.removeItem('smartsoko_cart');
      
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut()
          .then(() => window.location.href = '/login')
          .catch(() => window.location.href = '/login');
      } else {
        window.location.href = '/login';
      }
    },

    // Modal handlers
    openCustomerChat(orderId, customerName) {
      if (elements.chatCustomerName) elements.chatCustomerName.textContent = customerName;
      if (elements.chatMessages) {
        elements.chatMessages.innerHTML = `<div class="text-center text-xs text-gray-400 my-2">Chat started with ${utils.escapeHtml(customerName)}</div>`;
      }
      if (elements.chatModal) {
        elements.chatModal.classList.remove('hidden');
        elements.chatModal.classList.add('flex');
      }
    },

    closeChatModal() {
      if (elements.chatModal) {
        elements.chatModal.classList.add('hidden');
        elements.chatModal.classList.remove('flex');
      }
    },

    sendChatMessage() {
      const msg = elements.chatInput?.value?.trim();
      if (!msg || !elements.chatMessages) return;
      
      elements.chatMessages.innerHTML += `
        <div class="self-end bg-primary text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
          <p class="text-sm">${utils.escapeHtml(msg)}</p>
        </div>
      `;
      elements.chatInput.value = '';
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },

    // Data loading
    async loadData() {
      if (!state.currentSeller) return;
      
      await Promise.all([
        actions.loadOrders(),
        actions.loadProducts(),
        actions.loadReviews(),
        actions.loadStats()
      ]);
    },

    async loadOrders() {
      // Set up real-time subscription instead of one-time fetch
      api.subscribeToOrders(state.currentSeller.id, (orders) => {
        state.allOrders = orders;
        actions.renderOrders();
        actions.updateOrderStats();
      });
    },

    async loadProducts() {
      state.products = await api.getProducts(state.currentSeller.id);
      actions.renderProducts(state.products);
      actions.updateProductStats();
    },

    async loadReviews() {
      state.allReviews = await api.getReviews(state.currentSeller.id);
      actions.renderReviews(state.allReviews);
      actions.updateRatingSummary(state.allReviews);
    },

    updateOrderStats() {
      // Update dashboard stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = state.allOrders.filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return orderDate >= today;
      });
      
      const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const pending = state.allOrders.filter(o => o.status === 'pending').length;
      
      if (elements.todayRevenue) elements.todayRevenue.textContent = utils.formatCurrency(revenue);
      if (elements.pendingOrders) elements.pendingOrders.textContent = `${pending} pending`;
    },

    updateProductStats() {
      const available = state.products.filter(p => p.isAvailable).length;
      if (elements.availableItems) elements.availableItems.textContent = `${available} available`;
    },

    updateRatingSummary(reviews) {
      if (reviews.length === 0) {
        if (elements.averageRating) elements.averageRating.textContent = '0.0';
        if (elements.totalReviewCount) elements.totalReviewCount.textContent = '0';
        if (elements.ratingStars) elements.ratingStars.innerHTML = '';
        return;
      }
      
      const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      if (elements.averageRating) elements.averageRating.textContent = avgRating.toFixed(1);
      if (elements.totalReviewCount) elements.totalReviewCount.textContent = reviews.length;
      if (elements.totalReviews) elements.totalReviews.textContent = `${reviews.length} reviews`;
      if (elements.ratingStars) {
        elements.ratingStars.innerHTML = Array(5).fill(0).map((_, i) => 
          `<span class="material-symbols-outlined text-lg ${i < Math.round(avgRating) ? 'text-yellow-500' : 'text-gray-300'}">star</span>`
        ).join('');
      }
    },

    async loadStats() {
      // Comprehensive stats loading
      actions.updateOrderStats();
      actions.updateProductStats();
    }
  };

  // ── Initialization ──────────────────────────────────────────────────
  async function init() {
    cacheElements();
    
    // Firebase auth
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(async user => {
        if (user) {
          state.currentSeller = await api.getSeller(user.uid);
          if (state.currentSeller) {
            await actions.loadData();
            setupEventListeners();
          }
        } else {
          window.location.href = '/login';
        }
      });
    }
  }

  function setupEventListeners() {
    // Listen for new orders from real-time subscription
    window.addEventListener('newOrderReceived', (e) => {
      const { orderId, order } = e.detail;
      actions.showNotification(`🔔 New order #${utils.truncateId(orderId)} - TSh ${(order.total || 0).toLocaleString()}`, 'success');
    });
    
    // Form submissions
    document.getElementById('storeInfoForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.currentSeller) return;
      
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not initialized');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        await updateDoc(doc(db, 'sellers', state.currentSeller.id), {
          name: elements.storeName?.value,
          logoUrl: elements.storeLogo?.value,
          description: elements.storeDescription?.value,
          category: elements.storeCategory?.value,
          isOpen: elements.isOpen?.checked,
          updatedAt: new Date().toISOString()
        });
        actions.showNotification('Settings saved', 'success');
      } catch (error) {
        console.error('Error saving settings:', error);
        actions.showNotification('Failed to save settings', 'error');
      }
    });

    // Chat form
    document.getElementById('chatForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      actions.sendChatMessage();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    init,
    // Expose actions for HTML onclick handlers
    selectOrder: actions.selectOrder,
    updateBulkActionUI: actions.updateBulkActionUI,
    toggleProductAvailability: actions.toggleProductAvailability,
    deleteProduct: actions.deleteProduct,
    openEditMenuItem: actions.openEditMenuItem,
    openAddMenuItem: actions.openAddMenuItem,
    closeAddMenuItem: actions.closeAddMenuItem,
    submitAddMenuItem: actions.submitAddMenuItem,
    updateImagePreview: actions.updateImagePreview,
    logout: actions.logout,
    openCustomerChat: actions.openCustomerChat,
    closeChatModal: actions.closeChatModal,
    sendChatMessage: actions.sendChatMessage
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', MerchantApp.init);
