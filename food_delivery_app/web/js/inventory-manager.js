/**
 * SmartSoko Inventory Manager
 * Handles product variants, stock tracking, low-stock alerts, and CSV bulk upload
 */

const InventoryManager = (() => {
  // ── State ───────────────────────────────────────────────────────
  const state = {
    currentSeller: null,
    products: [],
    categories: [],
    lowStockThreshold: 5,
    csvPreview: []
  };

  // ── Utilities ───────────────────────────────────────────────────
  const utils = {
    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    formatCurrency(amount) {
      return `TSh ${(amount || 0).toLocaleString()}`;
    }
  };

  // ── Firebase Helpers ──────────────────────────────────────────
  async function getDb() {
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    return window.db || getFirestore(window.app);
  }

  // ── Product CRUD with Variants ─────────────────────────────────
  async function saveProduct(productData, productId = null) {
    const db = await getDb();
    const { collection, doc, setDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const data = {
      ...productData,
      merchantId: state.currentSeller?.id,
      updatedAt: serverTimestamp()
    };

    if (!productId) {
      data.createdAt = serverTimestamp();
      const ref = doc(collection(db, 'products'));
      await setDoc(ref, data);
      return ref.id;
    } else {
      await updateDoc(doc(db, 'products', productId), data);
      return productId;
    }
  }

  async function deleteProduct(productId) {
    const db = await getDb();
    const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'products', productId));
  }

  // ── Variant Builder UI ──────────────────────────────────────────
  function buildVariantForm(existingVariants = []) {
    const container = document.getElementById('variantsContainer');
    if (!container) return;

    const variants = existingVariants.length > 0 ? existingVariants : [{ option: '', priceModifier: 0, stock: -1, sku: '' }];

    container.innerHTML = variants.map((v, i) => `
      <div class="variant-row bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200" data-index="${i}">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
          <input type="text" placeholder="Option (e.g. Large)" value="${utils.escapeHtml(v.option || v.name || '')}" class="variant-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" required>
          <input type="number" placeholder="Price modifier" value="${v.priceModifier || 0}" class="variant-price w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
          <input type="number" placeholder="Stock (-1=unlimited)" value="${v.stock !== undefined ? v.stock : -1}" class="variant-stock w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
          <input type="text" placeholder="SKU (optional)" value="${utils.escapeHtml(v.sku || '')}" class="variant-sku w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
        </div>
        <div class="flex justify-end">
          <button type="button" onclick="InventoryManager.removeVariantRow(this)" class="text-red-500 text-xs hover:text-red-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">delete</span> Remove
          </button>
        </div>
      </div>
    `).join('');

    if (variants.length === 0) addVariantRow();
  }

  function addVariantRow() {
    const container = document.getElementById('variantsContainer');
    const index = container.querySelectorAll('.variant-row').length;
    const div = document.createElement('div');
    div.className = 'variant-row bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200';
    div.dataset.index = index;
    div.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
        <input type="text" placeholder="Option (e.g. Large)" class="variant-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" required>
        <input type="number" placeholder="Price modifier" value="0" class="variant-price w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
        <input type="number" placeholder="Stock (-1=unlimited)" value="-1" class="variant-stock w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
        <input type="text" placeholder="SKU (optional)" class="variant-sku w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
      </div>
      <div class="flex justify-end">
        <button type="button" onclick="InventoryManager.removeVariantRow(this)" class="text-red-500 text-xs hover:text-red-700 flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">delete</span> Remove
        </button>
      </div>
    `;
    container.appendChild(div);
  }

  function removeVariantRow(btn) {
    const row = btn.closest('.variant-row');
    const container = document.getElementById('variantsContainer');
    if (container.querySelectorAll('.variant-row').length > 1) {
      row.remove();
    } else {
      // Clear inputs instead of removing last row
      row.querySelectorAll('input').forEach(input => input.value = input.type === 'number' ? (input.classList.contains('variant-price') ? '0' : '-1') : '');
    }
  }

  function collectVariants() {
    const rows = document.querySelectorAll('.variant-row');
    const variants = [];
    rows.forEach(row => {
      const option = row.querySelector('.variant-option').value.trim();
      if (!option) return;
      variants.push({
        option,
        priceModifier: parseInt(row.querySelector('.variant-price').value) || 0,
        stock: parseInt(row.querySelector('.variant-stock').value) || -1,
        sku: row.querySelector('.variant-sku').value.trim()
      });
    });
    return variants;
  }

  // ── Stock Management ────────────────────────────────────────────
  async function updateStock(productId, newStock, reason = '') {
    const db = await getDb();
    const { doc, updateDoc, getDoc, setDoc, serverTimestamp, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error('Product not found');

    const oldStock = productSnap.data().stockQuantity !== undefined ? productSnap.data().stockQuantity : productSnap.data().stock;

    await updateDoc(productRef, {
      stockQuantity: newStock,
      updatedAt: serverTimestamp()
    });

    // Log inventory change
    await setDoc(doc(collection(db, 'inventory_logs')), {
      productId,
      merchantId: state.currentSeller?.id,
      oldStock: oldStock !== undefined ? oldStock : -1,
      newStock,
      change: newStock - (oldStock || 0),
      reason,
      timestamp: serverTimestamp()
    });

    return true;
  }

  async function incrementStock(productId, amount, reason = 'restock') {
    const db = await getDb();
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error('Product not found');

    const currentStock = productSnap.data().stockQuantity !== undefined ? productSnap.data().stockQuantity : (productSnap.data().stock || 0);
    const newStock = currentStock < 0 ? amount : currentStock + amount;

    await updateDoc(productRef, {
      stockQuantity: newStock,
      updatedAt: serverTimestamp()
    });

    // Log
    const { setDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await setDoc(doc(collection(db, 'inventory_logs')), {
      productId,
      merchantId: state.currentSeller?.id,
      oldStock: currentStock,
      newStock,
      change: amount,
      reason,
      timestamp: serverTimestamp()
    });

    return newStock;
  }

  // ── Low Stock Alerts ────────────────────────────────────────────
  function getLowStockProducts() {
    return state.products.filter(p => {
      const stock = p.stockQuantity !== undefined ? p.stockQuantity : p.stock;
      return stock !== undefined && stock >= 0 && stock <= (p.lowStockThreshold || state.lowStockThreshold);
    });
  }

  function renderLowStockAlerts() {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;

    const lowStock = getLowStockProducts();
    if (lowStock.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No low stock alerts</p>';
      return;
    }

    container.innerHTML = lowStock.map(p => {
      const stock = p.stockQuantity !== undefined ? p.stockQuantity : p.stock;
      const isOut = stock === 0;
      return `
        <div class="flex items-center justify-between p-3 ${isOut ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} rounded-lg border mb-2">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined ${isOut ? 'text-red-500' : 'text-yellow-600'}">${isOut ? 'error' : 'warning'}</span>
            <div>
              <p class="font-medium text-sm">${utils.escapeHtml(p.name)}</p>
              <p class="text-xs ${isOut ? 'text-red-600' : 'text-yellow-700'}">${isOut ? 'Out of stock' : `Only ${stock} left`}</p>
            </div>
          </div>
          <button onclick="InventoryManager.quickRestock('${p.id}', 10)" class="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
            +10
          </button>
        </div>
      `;
    }).join('');
  }

  async function quickRestock(productId, amount) {
    try {
      await incrementStock(productId, amount, 'quick restock');
      showNotification(`Restocked +${amount} units`, 'success');
      await loadProducts();
      renderLowStockAlerts();
    } catch (err) {
      console.error('Restock error:', err);
      showNotification('Failed to restock', 'error');
    }
  }

  // ── CSV Bulk Upload ─────────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue; // Skip empty lines

      const product = {};
      headers.forEach((header, index) => {
        product[header] = values[index] || '';
      });

      // Map common CSV headers to our schema
      const mapped = {
        name: product.name || product.product_name || product.title || '',
        description: product.description || product.desc || '',
        price: parseInt(product.price || product.unit_price || 0) || 0,
        stockQuantity: parseInt(product.stock || product.quantity || product.inventory || -1) || -1,
        category: product.category || product.product_category || 'General',
        collection: product.collection || product.tag || '',
        imageUrl: product.image || product.image_url || product.photo || '',
        lowStockThreshold: parseInt(product.low_stock_threshold || product.reorder_point || 5) || 5,
        isAvailable: (product.available || product.is_available || 'true').toString().toLowerCase() !== 'false'
      };

      // Parse variants if provided (format: "Size:Small=0,Large=1500|Color:Red=0,Blue=500")
      if (product.variants) {
        mapped.variants = parseVariantsString(product.variants);
      }

      if (mapped.name) products.push(mapped);
    }

    return products;
  }

  function parseVariantsString(str) {
    // Simple format: "Small=0,Large=1500"
    return str.split(',').map(part => {
      const [option, priceMod] = part.split('=');
      return {
        option: option.trim(),
        priceModifier: parseInt(priceMod) || 0,
        stock: -1,
        sku: ''
      };
    }).filter(v => v.option);
  }

  function handleCSVUpload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const products = parseCSV(e.target.result);
          resolve(products);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function bulkUploadProducts(products) {
    const db = await getDb();
    const { collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const results = { success: 0, failed: 0, errors: [] };

    for (const product of products) {
      try {
        const data = {
          ...product,
          merchantId: state.currentSeller?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const ref = doc(collection(db, 'products'));
        await setDoc(ref, data);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ product: product.name, error: err.message });
      }
    }

    return results;
  }

  // ── Product Loader ──────────────────────────────────────────────
  async function loadProducts() {
    if (!state.currentSeller?.id) return;

    try {
      const db = await getDb();
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

      const q = query(collection(db, 'products'), where('merchantId', '==', state.currentSeller.id));
      const snap = await getDocs(q);

      state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Extract categories
      const catSet = new Set();
      state.products.forEach(p => { if (p.category) catSet.add(p.category); });
      state.categories = Array.from(catSet);

    } catch (err) {
      console.error('Error loading products:', err);
    }
  }

  // ── Collection Manager ──────────────────────────────────────────
  async function createCollection(name) {
    const db = await getDb();
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    await setDoc(doc(db, 'product_collections', `${state.currentSeller.id}_${name}`), {
      name,
      merchantId: state.currentSeller.id,
      createdAt: serverTimestamp()
    });
  }

  // ── Notifications ───────────────────────────────────────────────
  function showNotification(message, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
    const icons = { success: 'check_circle', error: 'error', info: 'info' };

    const n = document.createElement('div');
    n.className = `fixed bottom-6 right-6 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2`;
    n.innerHTML = `<span class="material-symbols-outlined text-sm">${icons[type]}</span><span class="font-medium">${message}</span>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  // ── Public API ──────────────────────────────────────────────────
  return {
    init(seller) {
      state.currentSeller = seller;
      loadProducts();
    },

    // Variant builder
    buildVariantForm,
    addVariantRow,
    removeVariantRow,
    collectVariants,

    // Stock
    updateStock,
    incrementStock,
    quickRestock,
    getLowStockProducts,
    renderLowStockAlerts,

    // CSV
    parseCSV,
    handleCSVUpload,
    bulkUploadProducts,

    // Products
    loadProducts,
    getProducts: () => state.products,
    getCategories: () => state.categories,

    // Collections
    createCollection,

    // Notifications
    showNotification
  };
})();

// Make available globally for inline handlers
window.InventoryManager = InventoryManager;
