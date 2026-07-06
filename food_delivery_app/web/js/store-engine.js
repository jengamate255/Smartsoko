/**
 * SmartSoko Storefront Engine
 * Renders public branded store pages with in-platform messaging only
 */

// ── State ───────────────────────────────────────────────────────────
const state = {
  store: null,
  products: [],
  filteredProducts: [],
  collections: [],
  activeCollection: 'all',
  selectedVariant: null,
  currentProduct: null
};

// ── DOM refs ────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── URL Params ────────────────────────────────────────────────────
function getStoreSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || params.get('id') || '';
}

// ── Firebase Helpers ──────────────────────────────────────────────
async function getDb() {
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
  return window.db || getFirestore(window.app);
}

async function getAuth() {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
  return window.auth || getAuth(window.app);
}

// ── Load Store ────────────────────────────────────────────────────
async function loadStore() {
  const slug = getStoreSlug();
  if (!slug) {
    showError();
    return;
  }

  try {
    const db = await getDb();
    const { collection, query, where, getDocs, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    // Try loading by slug first (new stores), fallback to id (legacy sellers)
    let storeData = null;
    let storeId = null;

    const slugQuery = query(collection(db, 'sellers'), where('slug', '==', slug));
    const slugSnap = await getDocs(slugQuery);

    if (!slugSnap.empty) {
      storeData = slugSnap.docs[0].data();
      storeId = slugSnap.docs[0].id;
    } else {
      // Fallback: try as document ID
      const docRef = doc(db, 'sellers', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        storeData = docSnap.data();
        storeId = docSnap.id;
      }
    }

    if (!storeData) {
      showError();
      return;
    }

    state.store = { id: storeId, ...storeData };
    await loadProducts(storeId);
    renderStore();
    hideLoading();

    // Update SEO meta tags
    updateMetaTags(storeData);

  } catch (err) {
    console.error('Error loading store:', err);
    showError();
  }
}

// ── Load Products ─────────────────────────────────────────────────
async function loadProducts(storeId) {
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const q = query(collection(db, 'products'), where('merchantId', '==', storeId));
    const snap = await getDocs(q);

    state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.filteredProducts = [...state.products];

    // Extract collections from products
    const collectionSet = new Set();
    state.products.forEach(p => {
      if (p.collection) collectionSet.add(p.collection);
      if (p.collections) p.collections.forEach(c => collectionSet.add(c));
    });
    state.collections = Array.from(collectionSet).filter(Boolean);

  } catch (err) {
    console.error('Error loading products:', err);
    state.products = [];
    state.filteredProducts = [];
  }
}

// ── Render Store ──────────────────────────────────────────────────
function renderStore() {
  const s = state.store;
  if (!s) return;

  // Banner
  const banner = $('storeBanner');
  if (s.bannerUrl) {
    banner.style.backgroundImage = `url('${escapeHtml(s.bannerUrl)}')`;
  } else {
    banner.style.background = s.brandColors?.primary
      ? `linear-gradient(135deg, ${s.brandColors.primary} 0%, ${s.brandColors.secondary || '#064e3b'} 100%)`
      : 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
  }

  // Logo
  const logoEl = $('storeLogo');
  if (s.logoUrl) {
    logoEl.innerHTML = `<img src="${escapeHtml(s.logoUrl)}" alt="" class="w-full h-full object-cover">`;
  }

  // Text
  $('storeName').textContent = s.name || 'Unnamed Store';
  $('storeCategory').textContent = s.category ? s.category.charAt(0).toUpperCase() + s.category.slice(1) : 'Store';
  $('storeDescription').textContent = s.description || 'No description yet.';

  // Status
  const statusEl = $('storeStatus');
  if (s.isOpen !== false) {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500"></span> Open`;
  } else {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> Closed`;
  }

  // Product count
  $('productCount').innerHTML = `<span class="material-symbols-outlined text-sm">inventory_2</span> ${state.products.length} products`;

  // Collections
  renderCollections();

  // Products
  renderProducts();
}

function renderCollections() {
  const container = $('collectionsList');
  let html = `<button onclick="filterByCollection('all')" class="collection-chip px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${state.activeCollection === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">All Products</button>`;

  state.collections.forEach(col => {
    const active = state.activeCollection === col;
    html += `<button onclick="filterByCollection('${escapeHtml(col)}')" class="collection-chip px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${active ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">${escapeHtml(col)}</button>`;
  });

  container.innerHTML = html;
}

function renderProducts() {
  const container = $('productsGrid');
  const items = state.filteredProducts;

  if (items.length === 0) {
    container.innerHTML = '';
    $('noProducts').classList.remove('hidden');
    return;
  }

  $('noProducts').classList.add('hidden');

  container.innerHTML = items.map(p => {
    const img = p.imageUrl || p.image || 'images/default-product.png';
    const price = p.price || 0;
    const hasVariants = p.variants && p.variants.length > 0;
    const stockDisplay = getStockDisplay(p);

    return `
      <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer" onclick="openProductModal('${p.id}')">
        <div class="relative h-40 bg-gray-100">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='images/default-product.png'">
          ${stockDisplay.badge}
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-gray-900 text-sm mb-1 truncate">${escapeHtml(p.name)}</h3>
          <p class="text-lg font-bold text-green-600">TSh ${price.toLocaleString()}</p>
          ${hasVariants ? `<p class="text-xs text-gray-500 mt-1">${p.variants.length} options</p>` : ''}
          ${stockDisplay.text}
        </div>
      </div>
    `;
  }).join('');
}

function getStockDisplay(product) {
  const stock = product.stockQuantity !== undefined ? product.stockQuantity : product.stock;
  if (stock === undefined || stock < 0) return { badge: '', text: '' };
  if (stock === 0) {
    return {
      badge: `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">Out of Stock</div>`,
      text: `<p class="text-xs text-red-500 mt-1">Out of stock</p>`
    };
  }
  if (stock <= (product.lowStockThreshold || 5)) {
    return {
      badge: `<div class="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full">Low Stock</div>`,
      text: `<p class="text-xs text-yellow-600 mt-1">Only ${stock} left</p>`
    };
  }
  return { badge: '', text: `<p class="text-xs text-green-600 mt-1">In stock</p>` };
}

// ── Filtering & Sorting ───────────────────────────────────────────
window.filterByCollection = function(collection) {
  state.activeCollection = collection;
  if (collection === 'all') {
    state.filteredProducts = [...state.products];
  } else {
    state.filteredProducts = state.products.filter(p =>
      p.collection === collection || (p.collections && p.collections.includes(collection))
    );
  }
  renderCollections();
  renderProducts();
};

window.sortProducts = function() {
  const sort = $('sortProducts').value;
  switch (sort) {
    case 'price-low':
      state.filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-high':
      state.filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'name':
      state.filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    default:
      // Keep original order
      break;
  }
  renderProducts();
};

// ── Product Modal ─────────────────────────────────────────────────
window.openProductModal = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.currentProduct = product;
  state.selectedVariant = null;

  const img = product.imageUrl || product.image || 'images/default-product.png';
  $('modalProductImage').src = img;
  $('modalProductImage').alt = product.name || '';
  $('modalProductName').textContent = product.name || 'Unnamed Product';
  $('modalProductPrice').textContent = `TSh ${(product.price || 0).toLocaleString()}`;
  $('modalProductDesc').textContent = product.description || 'No description available.';

  // Variants
  const variantsEl = $('modalVariants');
  if (product.variants && product.variants.length > 0) {
    variantsEl.classList.remove('hidden');
    $('modalVariantOptions').innerHTML = product.variants.map((v, i) => `
      <button onclick="selectVariant(${i})" class="variant-btn px-3 py-2 rounded-lg border border-gray-200 text-sm hover:border-green-500 hover:bg-green-50 transition-colors ${i === 0 ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : ''}" data-index="${i}">
        <span class="font-medium">${escapeHtml(v.option || v.name || 'Default')}</span>
        ${v.priceModifier ? `<span class="text-gray-500 text-xs">+TSh ${v.priceModifier}</span>` : ''}
      </button>
    `).join('');
    selectVariant(0);
  } else {
    variantsEl.classList.add('hidden');
  }

  // Stock
  const stock = product.stockQuantity !== undefined ? product.stockQuantity : product.stock;
  if (stock !== undefined && stock >= 0) {
    $('modalStockInfo').classList.remove('hidden');
    if (stock === 0) $('modalStockText').textContent = 'Out of stock';
    else if (stock <= (product.lowStockThreshold || 5)) $('modalStockText').textContent = `Only ${stock} left`;
    else $('modalStockText').textContent = `${stock} in stock`;
  } else {
    $('modalStockInfo').classList.add('hidden');
  }

  $('productModal').classList.remove('hidden');
  $('productModal').classList.add('flex');
};

window.selectVariant = function(index) {
  const product = state.currentProduct;
  if (!product || !product.variants) return;

  state.selectedVariant = product.variants[index];

  // Update UI
  document.querySelectorAll('.variant-btn').forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('border-green-500', 'bg-green-50', 'ring-1', 'ring-green-500');
    } else {
      btn.classList.remove('border-green-500', 'bg-green-50', 'ring-1', 'ring-green-500');
    }
  });

  // Update price
  const basePrice = product.price || 0;
  const modifier = state.selectedVariant.priceModifier || 0;
  $('modalProductPrice').textContent = `TSh ${(basePrice + modifier).toLocaleString()}`;
};

window.closeProductModal = function() {
  $('productModal').classList.add('hidden');
  $('productModal').classList.remove('flex');
  state.currentProduct = null;
  state.selectedVariant = null;
};

window.addToCartFromModal = function() {
  // Placeholder - integrates with existing cart system
  showNotification('Added to cart!', 'success');
  closeProductModal();
};

// ── Chat (In-Platform Only) ───────────────────────────────────────
window.openStoreChat = function() {
  if (!state.store) return;
  const storeId = state.store.id;
  const storeName = state.store.name || 'Store';
  // Navigate to chat with store context - no phone numbers exposed
  window.location.href = `/chat?storeId=${encodeURIComponent(storeId)}&storeName=${encodeURIComponent(storeName)}&type=store`;
};

window.toggleFollowStore = function() {
  const btn = $('followStoreBtn');
  const isFollowing = btn.classList.contains('bg-red-50');

  if (isFollowing) {
    btn.classList.remove('bg-red-50', 'text-red-600', 'border-red-200');
    btn.classList.add('border-gray-300', 'text-gray-700');
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">favorite_border</span> Follow`;
    showNotification('Unfollowed store', 'info');
  } else {
    btn.classList.remove('border-gray-300', 'text-gray-700');
    btn.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">favorite</span> Following`;
    showNotification('Following store!', 'success');
  }
};

// ── Meta Tags ───────────────────────────────────────────────────────
function updateMetaTags(storeData) {
  document.title = `${storeData.name || 'Store'} | SmartSoko`;
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = storeData.seoDescription || storeData.description || `Shop at ${storeData.name} on SmartSoko`;
}

// ── UI Helpers ────────────────────────────────────────────────────
function showError() {
  $('loadingState').classList.add('hidden');
  $('errorState').classList.remove('hidden');
}

function hideLoading() {
  $('loadingState').classList.add('hidden');
  $('storeContent').classList.remove('hidden');
}

function showNotification(message, type = 'info') {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
  const icons = { success: 'check_circle', error: 'error', info: 'info' };

  const n = document.createElement('div');
  n.className = `fixed bottom-6 right-6 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2`;
  n.innerHTML = `<span class="material-symbols-outlined text-sm">${icons[type]}</span><span class="font-medium">${message}</span>`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Initialize ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready
  if (window.db) {
    loadStore();
  } else {
    document.addEventListener('firebase-initialized', () => loadStore(), { once: true });
  }
});
