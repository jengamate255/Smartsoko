/**
 * Shopify-Style Features Dashboard Integration
 * Adds: Coupons, Collections, Bundles, Inventory Management, Deals
 */

const ShopifyDashboard = (() => {
  const state = {
    merchantId: null,
    coupons: [],
    collections: [],
    bundles: [],
    deals: [],
    inventory: null
  };

  // ═══════════════════════════════════════════════════════════════
  // COUPONS
  // ═══════════════════════════════════════════════════════════════

  async function loadCoupons() {
    if (!state.merchantId) return;
    const result = await ShopifyFeatures.getCoupons(state.merchantId);
    if (result.success) {
      state.coupons = result.coupons;
      renderCoupons();
    }
  }

  function renderCoupons() {
    const container = document.getElementById('activePromosList');
    if (!container) return;

    if (state.coupons.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">You currently have no active promotions.</p>';
      return;
    }

    container.innerHTML = state.coupons.map(coupon => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p class="font-medium text-gray-800">${coupon.code}</p>
          <p class="text-xs text-gray-500">
            ${coupon.type === 'percentage' ? coupon.value + '% off' : 'TSh ' + coupon.value + ' off'}
            ${coupon.minPurchase > 0 ? ` (Min TSh ${coupon.minPurchase})` : ''}
            ${coupon.uses ? ` • ${coupon.uses}/${coupon.maxUses || '∞'} used` : ''}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
            ${coupon.isActive ? 'Active' : 'Inactive'}
          </span>
          <button onclick="ShopifyDashboard.deleteCoupon('${coupon.id}')" class="text-red-500 hover:text-red-700">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  async function createCoupon(couponData) {
    couponData.merchantId = state.merchantId;
    const result = await ShopifyFeatures.createCoupon(couponData);
    if (result.success) {
      showNotification('Coupon created successfully!', 'success');
      loadCoupons();
    } else {
      showNotification(result.error || 'Failed to create coupon', 'error');
    }
  }

  async function deleteCoupon(couponId) {
    if (!confirm('Delete this coupon?')) return;
    const result = await ShopifyFeatures.deleteCoupon(couponId);
    if (result.success) {
      showNotification('Coupon deleted', 'success');
      loadCoupons();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COLLECTIONS
  // ═══════════════════════════════════════════════════════════════

  async function loadCollections() {
    if (!state.merchantId) return;
    const result = await ShopifyFeatures.getCollections(state.merchantId);
    if (result.success) {
      state.collections = result.collections;
      renderCollections();
    }
  }

  function renderCollections() {
    const container = document.getElementById('collectionsList');
    if (!container) return;

    if (state.collections.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No collections yet. Create one to group products.</p>';
      return;
    }

    container.innerHTML = state.collections.map(col => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center gap-3">
          ${col.imageUrl ? `<img src="${col.imageUrl}" class="w-10 h-10 rounded-lg object-cover">` : '<div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><span class="material-symbols-outlined text-purple-500">folder</span></div>'}
          <div>
            <p class="font-medium text-gray-800">${col.name}</p>
            <p class="text-xs text-gray-500">${col.productIds?.length || 0} products</p>
          </div>
        </div>
        <button onclick="ShopifyDashboard.deleteCollection('${col.id}')" class="text-red-500 hover:text-red-700">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    `).join('');
  }

  async function createCollection(collectionData) {
    collectionData.merchantId = state.merchantId;
    const result = await ShopifyFeatures.createCollection(collectionData);
    if (result.success) {
      showNotification('Collection created!', 'success');
      loadCollections();
    } else {
      showNotification(result.error || 'Failed to create collection', 'error');
    }
  }

  async function deleteCollection(collectionId) {
    if (!confirm('Delete this collection?')) return;
    const result = await ShopifyFeatures.deleteCollection(collectionId);
    if (result.success) {
      showNotification('Collection deleted', 'success');
      loadCollections();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BUNDLES
  // ═══════════════════════════════════════════════════════════════

  async function loadBundles() {
    if (!state.merchantId) return;
    const result = await ShopifyFeatures.getBundles(state.merchantId);
    if (result.success) {
      state.bundles = result.bundles;
      renderBundles();
    }
  }

  function renderBundles() {
    const container = document.getElementById('bundlesList');
    if (!container) return;

    if (state.bundles.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No bundles yet. Create product bundles for combo deals.</p>';
      return;
    }

    container.innerHTML = state.bundles.map(bundle => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p class="font-medium text-gray-800">${bundle.name}</p>
          <p class="text-xs text-gray-500">
            TSh ${bundle.originalPrice} → TSh ${bundle.bundlePrice} 
            <span class="text-green-600">(-${bundle.discountPercent}%)</span>
          </p>
        </div>
        <button onclick="ShopifyDashboard.deleteBundle('${bundle.id}')" class="text-red-500 hover:text-red-700">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    `).join('');
  }

  async function createBundle(bundleData) {
    bundleData.merchantId = state.merchantId;
    const result = await ShopifyFeatures.createBundle(bundleData);
    if (result.success) {
      showNotification('Bundle created!', 'success');
      loadBundles();
    } else {
      showNotification(result.error || 'Failed to create bundle', 'error');
    }
  }

  async function deleteBundle(bundleId) {
    if (!confirm('Delete this bundle?')) return;
    const result = await ShopifyFeatures.deleteBundle(bundleId);
    if (result.success) {
      showNotification('Bundle deleted', 'success');
      loadBundles();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════════

  async function loadInventory() {
    if (!state.merchantId) return;
    const result = await ShopifyFeatures.getInventory(state.merchantId);
    if (result.success) {
      state.inventory = result.inventory;
      renderInventory();
    }
  }

  function renderInventory() {
    if (!state.inventory) return;

    // Update inventory stats in dashboard
    const outOfStockEl = document.getElementById('inventoryOutOfStock');
    const lowStockEl = document.getElementById('inventoryLowStock');
    const inStockEl = document.getElementById('inventoryInStock');

    if (outOfStockEl) outOfStockEl.textContent = state.inventory.outOfStock;
    if (lowStockEl) lowStockEl.textContent = state.inventory.lowStock;
    if (inStockEl) inStockEl.textContent = state.inventory.inStock;

    // Render low stock items
    const container = document.getElementById('lowStockItems');
    if (!container) return;

    const items = [...state.inventory.lowStockItems, ...state.inventory.outOfStockItems].slice(0, 10);
    
    if (items.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">All products are well stocked!</p>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="flex items-center justify-between p-2 border-b border-gray-100">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-800">${item.name || 'Unknown Product'}</p>
          <p class="text-xs text-gray-500">SKU: ${item.sku || 'N/A'}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold ${item.stock === 0 ? 'text-red-600' : 'text-yellow-600'}">${item.stock} left</p>
          <button onclick="ShopifyDashboard.quickRestock('${item.id}', '${item.type || 'product'}')" class="text-xs text-blue-600 hover:underline">Restock</button>
        </div>
      </div>
    `).join('');
  }

  async function updateStock(type, id, newStock) {
    const result = await ShopifyFeatures.updateStock(type, id, { stock: parseInt(newStock) });
    if (result.success) {
      showNotification('Stock updated!', 'success');
      loadInventory();
    }
  }

  async function quickRestock(id, type = 'product') {
    const current = prompt('Enter new stock quantity:');
    if (current && !isNaN(current)) {
      await updateStock(type, id, parseInt(current));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FLASH DEALS
  // ═══════════════════════════════════════════════════════════════

  async function loadDeals() {
    if (!state.merchantId) return;
    const result = await ShopifyFeatures.getDeals(state.merchantId, false);
    if (result.success) {
      state.deals = result.deals;
      renderDeals();
    }
  }

  function renderDeals() {
    const container = document.getElementById('dealsList');
    if (!container) return;

    if (state.deals.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No active deals.</p>';
      return;
    }

    container.innerHTML = state.deals.map(deal => `
      <div class="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
        <div>
          <p class="font-medium text-gray-800">${deal.name}</p>
          <p class="text-xs text-orange-600">
            TSh ${deal.dealPrice} (-${deal.discountPercent}%)
            ${deal.endDate ? ` • Ends ${new Date(deal.endDate).toLocaleDateString()}` : ''}
          </p>
        </div>
        <span class="px-2 py-1 text-xs rounded ${deal.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}">
          ${deal.isActive ? 'Active' : 'Ended'}
        </span>
      </div>
    `).join('');
  }

  async function createDeal(dealData) {
    dealData.merchantId = state.merchantId;
    const result = await ShopifyFeatures.createDeal(dealData);
    if (result.success) {
      showNotification('Deal created!', 'success');
      loadDeals();
    } else {
      showNotification(result.error || 'Failed to create deal', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  function showNotification(message, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
    const n = document.createElement('div');
    n.className = `fixed bottom-6 right-6 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2`;
    n.innerHTML = `<span class="font-medium">${message}</span>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════

  async function init(merchantId) {
    state.merchantId = merchantId;
    // Load all data in parallel
    await Promise.all([
      loadCoupons(),
      loadCollections(),
      loadBundles(),
      loadInventory(),
      loadDeals()
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  return {
    init,
    loadCoupons,
    loadCollections,
    loadBundles,
    loadInventory,
    loadDeals,
    createCoupon,
    createCollection,
    createBundle,
    createDeal,
    deleteCoupon,
    deleteCollection,
    deleteBundle,
    updateStock,
    quickRestock
  };
})();

window.ShopifyDashboard = ShopifyDashboard;