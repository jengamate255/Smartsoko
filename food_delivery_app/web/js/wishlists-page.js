/**
 * SmartSoko Wishlists/Collections Page Logic
 */
(function () {
  const state = {
    me: null,
    activeTab: 'mine',
    activeWl: null,
    productCache: [],
  };

  async function boot() {
    await SocialService.ready();
    state.me = SocialService.getUser();

    setupTabs();

    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      await openDetail(id);
    } else {
      loadList();
    }
  }

  function setupTabs() {
    document.querySelectorAll('#wlTabs .soc-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#wlTabs .soc-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        state.activeTab = t.dataset.tab;
        loadList();
      });
    });
  }

  // ── List view ─────────────────────────────────────────────────
  async function loadList() {
    document.getElementById('listView').style.display = '';
    document.getElementById('detailView').style.display = 'none';
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('pageTitle').textContent = 'Collections';
    history.replaceState(null, '', '/wishlists');

    const grid = document.getElementById('wlGrid');
    grid.innerHTML = `
      <div class="soc-skeleton" style="height:240px;"></div>
      <div class="soc-skeleton" style="height:240px;"></div>
      <div class="soc-skeleton" style="height:240px;"></div>
    `;

    let lists;
    if (state.activeTab === 'mine') {
      if (!state.me) {
        grid.innerHTML = `<div class="soc-empty" style="grid-column:1/-1;">
          <span class="material-symbols-outlined">login</span>
          <h3>Sign in to see your collections</h3>
          <a href="/login?reason=collections" class="soc-btn soc-btn-primary">Sign in</a>
        </div>`;
        return;
      }
      lists = await SocialService.listMyWishlists(50);
    } else {
      lists = await SocialService.listPublicWishlists(50);
    }

    if (lists.length === 0) {
      grid.innerHTML = `<div class="soc-empty" style="grid-column:1/-1;">
        <span class="material-symbols-outlined">collections_bookmark</span>
        <h3>${state.activeTab === 'mine' ? 'No collections yet' : 'Nothing here yet'}</h3>
        <p>${state.activeTab === 'mine' ? 'Group your favourite products into shoppable boards.' : 'Be the first to share a collection!'}</p>
        ${state.activeTab === 'mine' ? '<button class="soc-btn soc-btn-primary" onclick="window.WishlistsPage.openCreate()">Create collection</button>' : ''}
      </div>`;
      return;
    }

    grid.innerHTML = lists.map(w => {
      const cover = w.coverImage || (w.items?.[0]?.imageUrl) || null;
      return `
        <div class="soc-wl-card" onclick="window.WishlistsPage.openDetail('${w.id}')">
          <div class="soc-wl-cover">
            ${cover ? `<img src="${esc(cover)}" alt="">` : `<span class="material-symbols-outlined" style="font-size:48px;">collections_bookmark</span>`}
            <span class="count"><span class="material-symbols-outlined" style="font-size:12px;">shopping_bag</span> ${w.itemCount || 0}</span>
          </div>
          <div class="soc-wl-card-body">
            <h3>${escHtml(w.title)}</h3>
            ${w.description ? `<p>${escHtml(w.description.slice(0, 80))}</p>` : ''}
            <div class="soc-wl-card-meta">
              <a href="/social-profile?uid=${encodeURIComponent(w.ownerId)}" style="color:inherit;text-decoration:none;" onclick="event.stopPropagation()">${escHtml(w.ownerName || 'User')}</a>
              · ${w.isPublic ? '🌍' : '🔒'} · ${w.followerCount || 0} followers
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Detail view ───────────────────────────────────────────────
  async function openDetail(id) {
    const wl = await SocialService.getWishlist(id);
    if (!wl) {
      SocialService.toast('Collection not found', 'error');
      loadList();
      return;
    }
    state.activeWl = wl;
    history.replaceState(null, '', `/wishlists?id=${encodeURIComponent(id)}`);

    document.getElementById('listView').style.display = 'none';
    document.getElementById('detailView').style.display = '';
    document.getElementById('backBtn').style.display = 'inline-flex';
    document.getElementById('backBtn').onclick = (e) => { e.preventDefault(); loadList(); };
    document.getElementById('pageTitle').textContent = 'Collection';

    const isOwner = state.me && state.me.uid === wl.ownerId;
    const head = document.getElementById('detailHead');
    const cover = wl.coverImage || (wl.items?.[0]?.imageUrl);
    head.innerHTML = `
      <div style="height:180px;background:var(--soko-grad);position:relative;overflow:hidden;">
        ${cover ? `<img src="${esc(cover)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : ''}
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.7) 100%);"></div>
        <div style="position:absolute;bottom:14px;left:18px;right:18px;color:#fff;">
          <div style="font-size:11px;font-weight:700;opacity:0.9;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">
            ${wl.isPublic ? '🌍 PUBLIC' : '🔒 PRIVATE'} COLLECTION · ${wl.itemCount || 0} ITEMS
          </div>
          <h2 style="font-size:24px;font-weight:800;margin:0 0 4px;">${escHtml(wl.title)}</h2>
          ${wl.description ? `<p style="font-size:13px;opacity:0.95;margin:0;">${escHtml(wl.description)}</p>` : ''}
        </div>
      </div>
      <div style="padding:14px 16px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--soc-border);">
        <a href="/social-profile?uid=${encodeURIComponent(wl.ownerId)}" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;flex:1;">
          <div class="soc-avatar sm">
            ${wl.ownerAvatar ? `<img src="${esc(wl.ownerAvatar)}" alt="">` : `<span>${((wl.ownerName || 'U')[0]).toUpperCase()}</span>`}
          </div>
          <div>
            <div style="font-size:13px;font-weight:700;">${escHtml(wl.ownerName || 'User')}</div>
            <div style="font-size:11px;color:var(--soc-text-dim);">${wl.followerCount || 0} followers</div>
          </div>
        </a>
        ${isOwner ? `
          <button class="soc-btn soc-btn-primary" onclick="window.WishlistsPage.openAddProduct()">
            <span class="material-symbols-outlined" style="font-size:16px;">add</span>
            Add product
          </button>
          <button class="soc-btn soc-btn-outline" onclick="window.WishlistsPage.deleteWl()" style="color:#dc2626;">
            <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
          </button>
        ` : `
          <button class="soc-btn soc-btn-outline" onclick="window.WishlistsPage.shareWl()">
            <span class="material-symbols-outlined" style="font-size:16px;">share</span>
            Share
          </button>
        `}
      </div>
    `;

    const items = wl.items || [];
    const itemsEl = document.getElementById('detailItems');
    if (items.length === 0) {
      itemsEl.innerHTML = `<div class="soc-empty">
        <span class="material-symbols-outlined">shopping_basket</span>
        <h3>No products yet</h3>
        ${isOwner ? '<button class="soc-btn soc-btn-primary" onclick="window.WishlistsPage.openAddProduct()">Add first product</button>' : ''}
      </div>`;
      return;
    }

    itemsEl.innerHTML = `<div class="soc-wl-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-top:18px;">
      ${items.map(it => `
        <div class="soc-wl-card" style="cursor:default;">
          <div class="soc-wl-cover" style="aspect-ratio:1/1;background:#f8faf6;">
            ${it.imageUrl ? `<img src="${esc(it.imageUrl)}" alt="">` : `<span class="material-symbols-outlined" style="font-size:40px;color:#10b981;">shopping_bag</span>`}
            ${isOwner ? `<button onclick="window.WishlistsPage.removeItem('${esc(it.id)}')" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;">close</span></button>` : ''}
          </div>
          <div class="soc-wl-card-body">
            <h3 style="font-size:13px;">${escHtml(it.name)}</h3>
            <p style="font-weight:800;color:#064e3b;font-size:14px;margin:4px 0;">TZS ${Number(it.price || 0).toLocaleString()}</p>
            <p style="font-size:11px;">${escHtml(it.sellerName || '')}</p>
            <button class="soc-btn soc-btn-primary" style="width:100%;margin-top:8px;justify-content:center;font-size:12px;padding:8px;" onclick="window.WishlistsPage.addToCart('${esc(it.id)}')">
              <span class="material-symbols-outlined" style="font-size:14px;">add_shopping_cart</span>
              Add to cart
            </button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  // ── Create ────────────────────────────────────────────────────
  function openCreate() {
    if (!state.me) { window.location.href = '/login?reason=collections'; return; }
    document.getElementById('newTitle').value = '';
    document.getElementById('newDesc').value = '';
    document.getElementById('newPublic').checked = true;
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('newTitle').focus();
  }

  async function create() {
    const title = document.getElementById('newTitle').value.trim();
    if (!title) { SocialService.toast('Add a title', 'info'); return; }
    try {
      const wl = await SocialService.createWishlist({
        title,
        description: document.getElementById('newDesc').value.trim(),
        isPublic: document.getElementById('newPublic').checked,
      });
      document.getElementById('createModal').style.display = 'none';
      SocialService.toast('Collection created', 'success');
      await openDetail(wl.id);
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to create', 'error');
    }
  }

  // ── Add product to current ────────────────────────────────────
  async function openAddProduct() {
    document.getElementById('addToModal').style.display = 'flex';
    document.getElementById('addSearch').value = '';
    document.getElementById('addSearch').focus();
    if (state.productCache.length === 0) await loadProductCache();
    renderAddResults(state.productCache);
    document.getElementById('addSearch').oninput = (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = term
        ? state.productCache.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.sellerName || '').toLowerCase().includes(term))
        : state.productCache;
      renderAddResults(filtered);
    };
  }

  async function loadProductCache() {
    try {
      const fs = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const snap = await fs.getDocs(fs.query(fs.collection(window.db, 'products'), fs.limit(80)));
      state.productCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('product cache failed', e);
      state.productCache = [];
    }
  }

  function renderAddResults(products) {
    const wrap = document.getElementById('addResults');
    if (products.length === 0) {
      wrap.innerHTML = `<div class="soc-empty"><span class="material-symbols-outlined">search_off</span><p>No products found</p></div>`;
      return;
    }
    wrap.innerHTML = products.slice(0, 30).map(p => `
      <div class="soc-suggest-row" style="border-bottom:1px solid var(--soc-border);" onclick="window.WishlistsPage.addProduct('${p.id}')">
        <div class="soc-tag-img" style="width:48px;height:48px;">
          ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="" loading="lazy">` : `<span class="material-symbols-outlined" style="color:#10b981;">shopping_bag</span>`}
        </div>
        <div class="info">
          <div class="name">${escHtml(p.name || 'Product')}</div>
          <div class="sub">${escHtml(p.sellerName || '')} · TZS ${Number(p.price || 0).toLocaleString()}</div>
        </div>
        <span class="material-symbols-outlined" style="color:#10b981;">add_circle</span>
      </div>
    `).join('');
  }

  async function addProduct(id) {
    if (!state.activeWl) return;
    const p = state.productCache.find(x => x.id === id);
    if (!p) return;
    try {
      await SocialService.addToWishlist(state.activeWl.id, {
        id: p.id, name: p.name, price: p.price,
        imageUrl: p.imageUrl || p.image, sellerId: p.sellerId || p.merchantId,
        sellerName: p.sellerName,
      });
      SocialService.toast('Added!', 'success');
      document.getElementById('addToModal').style.display = 'none';
      await openDetail(state.activeWl.id);
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed', 'error');
    }
  }

  async function removeItem(productId) {
    if (!state.activeWl) return;
    if (!confirm('Remove from collection?')) return;
    try {
      await SocialService.removeFromWishlist(state.activeWl.id, productId);
      await openDetail(state.activeWl.id);
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to remove', 'error');
    }
  }

  async function deleteWl() {
    if (!state.activeWl) return;
    if (!confirm(`Delete "${state.activeWl.title}"? This cannot be undone.`)) return;
    try {
      await SocialService.deleteWishlist(state.activeWl.id);
      SocialService.toast('Collection deleted', 'info');
      loadList();
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to delete', 'error');
    }
  }

  function shareWl() {
    if (!state.activeWl) return;
    const url = `${location.origin}/wishlists?id=${encodeURIComponent(state.activeWl.id)}`;
    if (window.StoreShare) {
      StoreShare.showShareModal(state.activeWl.title, url);
    } else if (navigator.share) {
      navigator.share({ title: state.activeWl.title, url });
    } else {
      navigator.clipboard?.writeText(url);
      SocialService.toast('Link copied!', 'success');
    }
  }

  function addToCart(productId) {
    if (!state.activeWl) return;
    const item = (state.activeWl.items || []).find(x => x.id === productId);
    if (!item || !window.CartService) return;
    CartService.addItem(item);
    SocialService.toast('Added to cart 🛒', 'success');
  }

  function escHtml(s) { return SocialService.escapeHtml(s); }
  function esc(s) { return SocialService.escapeHtml(s); }

  window.WishlistsPage = {
    openCreate, create, openAddProduct, addProduct,
    openDetail, removeItem, deleteWl, shareWl, addToCart,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
