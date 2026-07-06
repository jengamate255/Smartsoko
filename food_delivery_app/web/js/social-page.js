/**
 * SmartSoko Social Hub Page Logic
 * Drives social.html — feed, stories, composer, comments
 * Depends on window.SocialService
 */
(function () {
  // ── State ─────────────────────────────────────────────────────
  const state = {
    me: null,
    currentCategory: '',
    posts: [],
    likedMap: {},
    composer: {
      images: [],          // [{ file, dataUrl, uploadedUrl }]
      products: [],        // tagged product objects
    },
    story: { file: null, dataUrl: null },
    activeCommentsPost: null,
    productCache: [],
    unsubFeed: null,
    unsubComments: null,
  };

  // ── Boot ──────────────────────────────────────────────────────
  async function boot() {
    await SocialService.ready();
    state.me = SocialService.getUser();
    await SocialService.ensureSocialProfile().catch(() => {});

    renderMeAvatar();
    setupCategoryChips();
    setupAuthIntercepts();
    loadStories();
    loadFeed();
    loadUnread();

    document.getElementById('openComposer')?.addEventListener('click', () => openComposerModal('photo'));
    setInterval(loadUnread, 30_000);
  }

  function renderMeAvatar() {
    const u = state.me;
    const initial = (u?.displayName || u?.email || 'U')[0].toUpperCase();
    const html = u?.photoURL
      ? `<img src="${u.photoURL}" alt="" loading="lazy">`
      : `<span>${initial}</span>`;
    const my = document.getElementById('meAvatar');
    if (my) my.innerHTML = html;
    const ma = document.getElementById('modalAvatar');
    if (ma) ma.innerHTML = html;
    const mn = document.getElementById('modalName');
    if (mn) mn.textContent = u?.displayName || u?.email || 'You';
  }

  function setupAuthIntercepts() {
    document.querySelectorAll('[data-needs-auth]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!state.me) {
          e.preventDefault();
          window.location.href = '/login?reason=social';
        }
      });
    });
  }

  // ── Category chips ────────────────────────────────────────────
  function setupCategoryChips() {
    const chips = document.querySelectorAll('#catChips button');
    chips[0].classList.add('soc-btn-primary');
    chips[0].classList.remove('soc-btn-outline');
    chips.forEach(b => {
      b.addEventListener('click', () => {
        chips.forEach(x => { x.classList.remove('soc-btn-primary'); x.classList.add('soc-btn-outline'); });
        b.classList.add('soc-btn-primary');
        b.classList.remove('soc-btn-outline');
        state.currentCategory = b.dataset.cat || '';
        loadFeed();
      });
    });
  }

  // ── Stories rail ──────────────────────────────────────────────
  async function loadStories() {
    const rail = document.getElementById('storiesRail');
    if (!rail) return;
    const stories = await SocialService.listActiveStories(50);

    // Group by author
    const byAuthor = new Map();
    stories.forEach(s => {
      const cur = byAuthor.get(s.authorId);
      if (!cur || (s.createdAt?.toMillis?.() || 0) > (cur.createdAt?.toMillis?.() || 0)) {
        byAuthor.set(s.authorId, { ...s, _all: [...(cur?._all || []), s] });
      } else if (cur) {
        cur._all = [...(cur._all || []), s];
      }
    });

    const list = Array.from(byAuthor.values()).sort((a, b) =>
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
    );

    const meInitial = ((state.me?.displayName || state.me?.email || 'U')[0]).toUpperCase();
    rail.innerHTML = `
      <button class="soc-story" onclick="window.SocialPage.openStoryModal()" style="border:none;background:transparent;cursor:pointer;">
        <div class="soc-story-ring add">
          <div class="soc-story-inner" style="background:#064e3b;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;">
            +
          </div>
        </div>
        <span class="soc-story-name">Your Story</span>
      </button>
      ${list.map(s => {
        const viewed = (s.viewedBy || []).includes(state.me?.uid);
        const initials = ((s.authorName || 'U')[0] || 'U').toUpperCase();
        return `
        <button class="soc-story" onclick="window.SocialPage.openStory('${s.authorId}')" style="border:none;background:transparent;cursor:pointer;">
          <div class="soc-story-ring ${viewed ? 'viewed' : ''}">
            <div class="soc-story-inner">
              ${s.imageUrl
                ? `<img src="${escapeAttr(s.imageUrl)}" class="soc-story-img" alt="" loading="lazy">`
                : `<div class="soc-story-fallback">${initials}</div>`}
            </div>
          </div>
          <span class="soc-story-name">${escapeHtml(s.authorName || 'User')}</span>
        </button>
      `}).join('')}
    `;

    // Cache for viewer
    state._storiesByAuthor = byAuthor;
  }

  // ── Feed ──────────────────────────────────────────────────────
  async function loadFeed() {
    const list = document.getElementById('feedList');
    if (!list) return;

    list.innerHTML = `
      <div class="soc-post"><div class="soc-skeleton" style="height:320px;"></div></div>
      <div class="soc-post"><div class="soc-skeleton" style="height:240px;"></div></div>
    `;

    state.unsubFeed?.();
    state.unsubFeed = SocialService.subscribeFeed(
      { category: state.currentCategory, max: 50 },
      async (posts) => {
        state.posts = posts;
        if (posts.length === 0) {
          list.innerHTML = renderEmpty();
          return;
        }
        const ids = posts.map(p => p.id);
        state.likedMap = await SocialService.batchHasLiked(ids);
        list.innerHTML = posts.map(renderPost).join('');
        attachPostHandlers(list);
      }
    );
  }

  function renderEmpty() {
    return `
      <div class="soc-empty">
        <span class="material-symbols-outlined">forum</span>
        <h3>The soko is quiet</h3>
        <p>Be the first to share what you're shopping for today.</p>
        <button class="soc-btn soc-btn-primary" onclick="window.SocialPage.openComposerModal('photo')">
          <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
          Create first post
        </button>
      </div>
    `;
  }

  function renderPost(p) {
    const initial = ((p.authorName || 'U')[0]).toUpperCase();
    const liked = !!state.likedMap[p.id];
    const time = SocialService.formatRelative(p.createdAt);
    const hasMedia = p.imageUrls && p.imageUrls.length > 0;
    const hasProducts = p.taggedProducts && p.taggedProducts.length > 0;
    const isMine = state.me && p.authorId === state.me.uid;

    let mediaHtml = '';
    if (hasMedia) {
      const imgs = p.imageUrls;
      const gridClass = imgs.length === 1 ? '' : imgs.length === 2 ? 'cols-2' : imgs.length === 3 ? 'cols-3' : 'cols-many';
      if (imgs.length === 1) {
        mediaHtml = `<img src="${escapeAttr(imgs[0])}" alt="" class="soc-post-media" loading="lazy" onclick="window.SocialPage.openLightbox('${escapeAttr(imgs[0])}')">`;
      } else {
        mediaHtml = `<div class="soc-post-media-grid ${gridClass}">
          ${imgs.slice(0, 4).map(u => `<img src="${escapeAttr(u)}" alt="" loading="lazy" onclick="window.SocialPage.openLightbox('${escapeAttr(u)}')">`).join('')}
        </div>`;
      }
    }

    const productsHtml = hasProducts ? `
      <div class="soc-tagged">
        ${p.taggedProducts.map(prod => {
          const safe = encodeURIComponent(JSON.stringify(prod));
          return `
          <div class="soc-tag-card" onclick="window.SocialPage.viewProduct(${JSON.stringify(prod).replace(/"/g, '&quot;')})">
            <div class="soc-tag-img">
              ${prod.imageUrl
                ? `<img src="${escapeAttr(prod.imageUrl)}" alt="" loading="lazy">`
                : `<span class="material-symbols-outlined" style="color:#10b981;">shopping_bag</span>`}
            </div>
            <div class="soc-tag-info">
              <h4>${escapeHtml(prod.name)}</h4>
              <div class="seller">${escapeHtml(prod.sellerName || '')}</div>
              <div class="price">TZS ${Number(prod.price || 0).toLocaleString()}</div>
              <button class="soc-tag-add" onclick="event.stopPropagation();window.SocialPage.addProductToCart('${safe}')">
                <span class="material-symbols-outlined" style="font-size:12px;">add_shopping_cart</span>
                Add
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>
    ` : '';

    const stats = (p.likeCount || p.commentCount)
      ? `<div class="soc-stats">
          ${p.likeCount ? `<span><b>${p.likeCount}</b> likes</span>` : ''}
          ${p.commentCount ? `<span><b>${p.commentCount}</b> comments</span>` : ''}
        </div>`
      : '';

    return `
      <article class="soc-post" data-post-id="${p.id}">
        <div class="soc-post-head">
          <a href="/social-profile?uid=${encodeURIComponent(p.authorId)}" style="text-decoration:none;">
            <div class="soc-avatar">
              ${p.authorAvatar ? `<img src="${escapeAttr(p.authorAvatar)}" alt="" loading="lazy">` : `<span>${initial}</span>`}
            </div>
          </a>
          <div style="flex:1;min-width:0;">
            <a href="/social-profile?uid=${encodeURIComponent(p.authorId)}" class="soc-post-name">
              ${escapeHtml(p.authorName || 'SmartSoko User')}
            </a>
            <div class="soc-post-meta">
              <span>${time}</span>
              ${p.category ? `<span>·</span><span style="text-transform:capitalize;">${escapeHtml(p.category)}</span>` : ''}
              ${p.visibility === 'private' ? `<span>·</span><span class="material-symbols-outlined" style="font-size:12px;">lock</span>` : ''}
              ${p.visibility === 'followers' ? `<span>·</span><span class="material-symbols-outlined" style="font-size:12px;">group</span>` : ''}
            </div>
          </div>
          ${isMine
            ? `<button class="soc-post-menu" onclick="window.SocialPage.deletePost('${p.id}')" aria-label="Delete">
                 <span class="material-symbols-outlined">delete</span>
               </button>`
            : `<button class="soc-post-menu" onclick="window.SocialPage.dmAuthor('${p.authorId}','${escapeAttr(p.authorName || '')}','${escapeAttr(p.authorAvatar || '')}')" aria-label="Message">
                 <span class="material-symbols-outlined">chat</span>
               </button>`}
        </div>

        ${p.text ? `<div class="soc-post-text">${linkify(escapeHtml(p.text))}</div>` : ''}
        ${mediaHtml}
        ${productsHtml}
        ${stats}

        <div class="soc-actions">
          <button class="soc-action like-btn ${liked ? 'active' : ''}" data-post-id="${p.id}">
            <span class="material-symbols-outlined">${liked ? 'favorite' : 'favorite_border'}</span>
            <span>Like</span>
          </button>
          <button class="soc-action comment-btn" data-post-id="${p.id}">
            <span class="material-symbols-outlined">mode_comment</span>
            <span>Comment</span>
          </button>
          <button class="soc-action share-btn" data-post-id="${p.id}">
            <span class="material-symbols-outlined">share</span>
            <span>Share</span>
          </button>
        </div>
      </article>
    `;
  }

  function attachPostHandlers(root) {
    root.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!state.me) { window.location.href = '/login?reason=social'; return; }
        const id = btn.dataset.postId;
        try {
          btn.disabled = true;
          const liked = await SocialService.toggleLike(id);
          state.likedMap[id] = liked;
          btn.classList.toggle('active', liked);
          btn.querySelector('.material-symbols-outlined').textContent = liked ? 'favorite' : 'favorite_border';
        } catch (e) {
          SocialService.toast('Failed to like post', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    root.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => openCommentsModal(btn.dataset.postId));
    });

    root.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = state.posts.find(x => x.id === btn.dataset.postId);
        if (!p) return;
        sharePost(p);
      });
    });
  }

  function sharePost(p) {
    const url = `${location.origin}/social-profile?uid=${encodeURIComponent(p.authorId)}#post-${p.id}`;
    const text = `${p.authorName} on SmartSoko: ${(p.text || '').slice(0, 80)}...`;
    if (navigator.share) {
      navigator.share({ title: 'SmartSoko', text, url }).catch(() => {});
    } else if (window.StoreShare) {
      StoreShare.showShareModal(p.authorName || 'this post', url);
    } else {
      navigator.clipboard?.writeText(url);
      SocialService.toast('Link copied!', 'success');
    }
  }

  // ── Composer ──────────────────────────────────────────────────
  function openComposerModal(mode) {
    if (!state.me) { window.location.href = '/login?reason=social'; return; }
    document.getElementById('composerModal').style.display = 'flex';
    document.getElementById('postText').focus();
    if (mode === 'product') openProductPicker();
  }
  function closeComposerModal() {
    document.getElementById('composerModal').style.display = 'none';
    document.getElementById('postText').value = '';
    document.getElementById('categorySelect').value = '';
    document.getElementById('visibilitySelect').value = 'public';
    state.composer.images = [];
    state.composer.products = [];
    renderImagePreview();
    renderProductChips();
  }

  function handlePhotoFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 6 - state.composer.images.length);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        state.composer.images.push({ file, dataUrl: reader.result, uploadedUrl: null });
        renderImagePreview();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeImage(idx) {
    state.composer.images.splice(idx, 1);
    renderImagePreview();
  }

  function renderImagePreview() {
    const wrap = document.getElementById('imagePreview');
    if (!wrap) return;
    wrap.innerHTML = state.composer.images.map((img, i) => `
      <div class="thumb">
        <img src="${img.dataUrl}" alt="">
        <button class="remove" onclick="window.SocialPage.removeImage(${i})">×</button>
      </div>
    `).join('');
  }

  function renderProductChips() {
    const wrap = document.getElementById('productChips');
    if (!wrap) return;
    wrap.innerHTML = state.composer.products.map((p, i) => `
      <span class="soc-chip">
        <span class="material-symbols-outlined" style="font-size:14px;">shopping_bag</span>
        ${escapeHtml(p.name)}
        <button onclick="window.SocialPage.removeProduct(${i})">×</button>
      </span>
    `).join('');
  }

  function removeProduct(idx) {
    state.composer.products.splice(idx, 1);
    renderProductChips();
  }

  async function publishPost() {
    const text = document.getElementById('postText').value.trim();
    if (!text && state.composer.images.length === 0 && state.composer.products.length === 0) {
      SocialService.toast('Add some content first', 'info');
      return;
    }
    const btn = document.getElementById('publishBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Posting...';

    try {
      const imageUrls = [];
      for (const img of state.composer.images) {
        if (img.uploadedUrl) { imageUrls.push(img.uploadedUrl); continue; }
        try {
          const url = await SocialService.uploadImage(img.file, 'social/posts');
          if (url) imageUrls.push(url);
        } catch (e) {
          console.warn('Image upload failed, using data URL fallback', e);
          if (img.dataUrl && img.dataUrl.length < 900_000) imageUrls.push(img.dataUrl);
        }
      }

      await SocialService.createPost({
        text,
        imageUrls,
        taggedProducts: state.composer.products,
        category: document.getElementById('categorySelect').value,
        visibility: document.getElementById('visibilitySelect').value,
      });
      SocialService.toast('Posted to the soko! 🎉', 'success');
      closeComposerModal();
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to post', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">send</span> Post';
    }
  }

  // ── Product picker ────────────────────────────────────────────
  async function openProductPicker() {
    document.getElementById('productPickerModal').style.display = 'flex';
    document.getElementById('productSearch').focus();
    if (state.productCache.length === 0) {
      await loadProductCache();
    }
    renderProductResults(state.productCache);
    document.getElementById('productSearch').oninput = (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = term
        ? state.productCache.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.sellerName || '').toLowerCase().includes(term))
        : state.productCache;
      renderProductResults(filtered);
    };
  }

  function closeProductPicker() {
    document.getElementById('productPickerModal').style.display = 'none';
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

  function renderProductResults(products) {
    const wrap = document.getElementById('productResults');
    if (!wrap) return;
    if (products.length === 0) {
      wrap.innerHTML = `<div class="soc-empty"><span class="material-symbols-outlined">search_off</span><p>No products found</p></div>`;
      return;
    }
    wrap.innerHTML = products.slice(0, 30).map(p => `
      <div class="soc-suggest-row" style="border-bottom:1px solid var(--soc-border);" onclick="window.SocialPage.pickProduct('${p.id}')">
        <div class="soc-tag-img" style="width:48px;height:48px;">
          ${p.imageUrl ? `<img src="${escapeAttr(p.imageUrl)}" alt="" loading="lazy">` : `<span class="material-symbols-outlined" style="color:#10b981;">shopping_bag</span>`}
        </div>
        <div class="info">
          <div class="name">${escapeHtml(p.name || 'Product')}</div>
          <div class="sub">${escapeHtml(p.sellerName || '')} · TZS ${Number(p.price || 0).toLocaleString()}</div>
        </div>
        <span class="material-symbols-outlined" style="color:#10b981;">add_circle</span>
      </div>
    `).join('');
  }

  function pickProduct(id) {
    const p = state.productCache.find(x => x.id === id);
    if (!p) return;
    if (state.composer.products.find(x => x.id === id)) {
      SocialService.toast('Already tagged', 'info'); return;
    }
    if (state.composer.products.length >= 8) {
      SocialService.toast('Max 8 products', 'info'); return;
    }
    state.composer.products.push({
      id: p.id, name: p.name, price: p.price,
      imageUrl: p.imageUrl || p.image || null,
      sellerId: p.sellerId || p.merchantId || null,
      sellerName: p.sellerName || null,
    });
    renderProductChips();
    closeProductPicker();
  }

  function addProductToCart(encoded) {
    try {
      const prod = JSON.parse(decodeURIComponent(encoded));
      if (window.CartService) {
        CartService.addItem(prod);
        SocialService.toast('Added to cart 🛒', 'success');
      }
    } catch (e) { console.error(e); }
  }

  function viewProduct(prod) {
    if (prod.sellerId) {
      window.location.href = `/store?sellerId=${encodeURIComponent(prod.sellerId)}`;
    }
  }

  // ── Story modal ───────────────────────────────────────────────
  function openStoryModal() {
    if (!state.me) { window.location.href = '/login?reason=social'; return; }
    document.getElementById('storyModal').style.display = 'flex';
  }
  function closeStoryModal() {
    document.getElementById('storyModal').style.display = 'none';
    document.getElementById('storyText').value = '';
    state.story = { file: null, dataUrl: null };
    document.getElementById('storyPreview').innerHTML = `
      <div style="text-align:center;">
        <span class="material-symbols-outlined" style="font-size:56px;display:block;">add_photo_alternate</span>
        <p style="margin:6px 0 0;font-weight:700;">Tap to add photo</p>
      </div>
    `;
  }
  function handleStoryPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.story = { file, dataUrl: reader.result };
      document.getElementById('storyPreview').innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
    };
    reader.readAsDataURL(file);
  }
  async function publishStory() {
    const btn = document.getElementById('postStoryBtn');
    btn.disabled = true;
    try {
      let imageUrl = null;
      if (state.story.file) {
        try {
          imageUrl = await SocialService.uploadImage(state.story.file, 'social/stories');
        } catch (e) {
          if (state.story.dataUrl && state.story.dataUrl.length < 900_000) {
            imageUrl = state.story.dataUrl;
          }
        }
      }
      if (!imageUrl) {
        SocialService.toast('Add a photo first', 'info');
        btn.disabled = false; return;
      }
      await SocialService.postStory({
        imageUrl,
        text: document.getElementById('storyText').value.trim(),
      });
      SocialService.toast('Story shared! Lives 24 hours.', 'success');
      closeStoryModal();
      loadStories();
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to post story', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ── Story viewer ──────────────────────────────────────────────
  function openStory(authorId) {
    const group = state._storiesByAuthor?.get(authorId);
    if (!group) return;
    const stories = (group._all || [group]).sort((a, b) =>
      (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
    );
    let idx = 0;
    const viewer = document.getElementById('storyViewer');
    const content = document.getElementById('storyViewerContent');
    viewer.style.display = 'flex';

    const render = () => {
      const s = stories[idx];
      SocialService.markStoryViewed(s.id);
      content.innerHTML = `
        <div style="position:absolute;top:0;left:0;right:0;padding:14px;display:flex;gap:4px;z-index:10;">
          ${stories.map((_, i) => `<div style="flex:1;height:3px;background:rgba(255,255,255,${i < idx ? 1 : 0.3});border-radius:2px;"></div>`).join('')}
        </div>
        <div style="position:absolute;top:24px;left:14px;right:14px;display:flex;align-items:center;gap:10px;z-index:10;color:#fff;">
          <div class="soc-avatar" style="border:2px solid #fff;">
            ${s.authorAvatar ? `<img src="${escapeAttr(s.authorAvatar)}" alt="">` : `<span>${((s.authorName || 'U')[0]).toUpperCase()}</span>`}
          </div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:13px;">${escapeHtml(s.authorName)}</div>
            <div style="font-size:11px;opacity:0.8;">${SocialService.formatRelative(s.createdAt)}</div>
          </div>
          <button onclick="window.SocialPage.closeStory()" style="background:rgba(0,0,0,0.4);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        ${s.imageUrl
          ? `<img src="${escapeAttr(s.imageUrl)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;">`
          : `<div style="color:#fff;font-size:24px;padding:30px;text-align:center;">${escapeHtml(s.text || '')}</div>`}
        ${s.text && s.imageUrl ? `<div style="position:absolute;bottom:80px;left:14px;right:14px;padding:14px;background:rgba(0,0,0,0.5);color:#fff;border-radius:14px;font-size:14px;text-align:center;">${escapeHtml(s.text)}</div>` : ''}
        <div style="position:absolute;top:0;bottom:0;left:0;width:30%;cursor:pointer;" onclick="window.SocialPage.storyPrev()"></div>
        <div style="position:absolute;top:0;bottom:0;right:0;width:30%;cursor:pointer;" onclick="window.SocialPage.storyNext()"></div>
      `;
    };

    state._story = { stories, idx, render, timer: null };
    render();
    state._story.timer = setTimeout(() => storyNext(), 5000);
  }

  function storyNext() {
    if (!state._story) return;
    clearTimeout(state._story.timer);
    if (state._story.idx + 1 >= state._story.stories.length) { closeStory(); return; }
    state._story.idx++;
    state._story.render();
    state._story.timer = setTimeout(() => storyNext(), 5000);
  }

  function storyPrev() {
    if (!state._story) return;
    clearTimeout(state._story.timer);
    if (state._story.idx === 0) return;
    state._story.idx--;
    state._story.render();
    state._story.timer = setTimeout(() => storyNext(), 5000);
  }

  function closeStory() {
    if (state._story?.timer) clearTimeout(state._story.timer);
    state._story = null;
    document.getElementById('storyViewer').style.display = 'none';
  }

  // ── Comments ──────────────────────────────────────────────────
  function openCommentsModal(postId) {
    state.activeCommentsPost = postId;
    document.getElementById('commentsModal').style.display = 'flex';
    const body = document.getElementById('commentsBody');
    body.innerHTML = `<div class="soc-skeleton" style="height:60px;margin-bottom:8px;"></div><div class="soc-skeleton" style="height:60px;"></div>`;
    state.unsubComments?.();
    state.unsubComments = SocialService.subscribeComments(postId, (comments) => {
      if (comments.length === 0) {
        body.innerHTML = `<div class="soc-empty"><span class="material-symbols-outlined">mode_comment</span><p>No comments yet. Be the first!</p></div>`;
        return;
      }
      body.innerHTML = comments.map(c => {
        const initial = ((c.authorName || 'U')[0]).toUpperCase();
        return `
          <div class="soc-comment">
            <a href="/social-profile?uid=${encodeURIComponent(c.authorId)}" style="text-decoration:none;">
              <div class="soc-avatar sm">
                ${c.authorAvatar ? `<img src="${escapeAttr(c.authorAvatar)}" alt="">` : `<span>${initial}</span>`}
              </div>
            </a>
            <div style="flex:1;min-width:0;">
              <div class="soc-comment-body">
                <span class="name">${escapeHtml(c.authorName || 'User')}</span>
                <div class="text">${linkify(escapeHtml(c.text))}</div>
              </div>
              <div class="soc-comment-meta">${SocialService.formatRelative(c.createdAt)}</div>
            </div>
          </div>
        `;
      }).join('');
      body.scrollTop = body.scrollHeight;
    });
  }

  function closeCommentsModal() {
    state.unsubComments?.();
    state.activeCommentsPost = null;
    document.getElementById('commentsModal').style.display = 'none';
    document.getElementById('commentInput').value = '';
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!state.me) { window.location.href = '/login?reason=social'; return; }
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text || !state.activeCommentsPost) return;
    input.value = '';
    try {
      await SocialService.addComment(state.activeCommentsPost, text);
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to comment', 'error');
      input.value = text;
    }
  }

  // ── Post owner actions ────────────────────────────────────────
  async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    try {
      await SocialService.deletePost(postId);
      SocialService.toast('Post deleted', 'info');
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to delete', 'error');
    }
  }

  function dmAuthor(uid, name, avatar) {
    if (!state.me) { window.location.href = '/login?reason=social'; return; }
    window.location.href = `/messages?to=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;
  }

  // ── Lightbox ──────────────────────────────────────────────────
  function openLightbox(url) {
    const overlay = document.createElement('div');
    overlay.className = 'soc-modal-overlay';
    overlay.style.background = 'rgba(0,0,0,0.9)';
    overlay.style.padding = '0';
    overlay.innerHTML = `
      <img src="${escapeAttr(url)}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="">
      <button onclick="this.parentElement.remove()" style="position:absolute;top:14px;right:14px;background:rgba(0,0,0,0.5);border:none;color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── Unread badge ──────────────────────────────────────────────
  async function loadUnread() {
    if (!state.me) return;
    try {
      const convs = await SocialService.listConversations(50);
      const total = convs.reduce((sum, c) => sum + (Number(c.unread?.[state.me.uid]) || 0), 0);
      const badge = document.getElementById('unreadBadge');
      if (badge) {
        if (total > 0) {
          badge.textContent = total > 9 ? '9+' : total;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (_) {}
  }

  // ── Helpers ───────────────────────────────────────────────────
  function escapeHtml(s) { return SocialService.escapeHtml(s); }
  function escapeAttr(s) { return SocialService.escapeHtml(s); }
  function linkify(s) {
    return String(s).replace(/(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" style="color:#064e3b;text-decoration:underline;">$1</a>');
  }

  // ── Expose ────────────────────────────────────────────────────
  window.SocialPage = {
    openComposerModal, closeComposerModal, publishPost,
    handlePhotoFiles, removeImage, removeProduct,
    openProductPicker, closeProductPicker, pickProduct,
    addProductToCart, viewProduct,
    openStoryModal, closeStoryModal, handleStoryPhoto, publishStory,
    openStory, closeStory, storyNext, storyPrev,
    openCommentsModal, closeCommentsModal, submitComment,
    deletePost, dmAuthor, openLightbox,
  };

  // Bind globals expected by inline handlers in social.html
  ['openComposerModal', 'closeComposerModal', 'publishPost',
   'handlePhotoFiles', 'openProductPicker', 'closeProductPicker',
   'openStoryModal', 'closeStoryModal', 'handleStoryPhoto', 'publishStory',
   'closeCommentsModal', 'submitComment'].forEach(name => {
    if (!window[name]) window[name] = window.SocialPage[name];
  });

  // Inject spin keyframe once
  if (!document.getElementById('soc-spin')) {
    const st = document.createElement('style');
    st.id = 'soc-spin';
    st.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }

  // Boot when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
