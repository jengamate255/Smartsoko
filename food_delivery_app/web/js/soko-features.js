/**
 * SmartSoko — Tanzania Gen Z feature pack
 *  - WhatsApp share (product, cart, order)
 *  - Bonga Points loyalty (localStorage)
 *  - Agiza Tena (1-tap reorder from past orders)
 *  - Oda na Marafiki (group order via WhatsApp)
 *  - Lite mode toggle
 *  - Confetti on first order
 *  - Empty / edge state toasts with Swahili flavor
 *
 * Safe to load on any page. All features are opt-in / non-destructive.
 * Will NOT touch the existing CartService, PesaPal, or checkout flow.
 */
(function () {
  // ── Storage keys (all namespaced so we don't collide) ─────────────
  const K = {
    bonga:    'smartsoko_bonga',
    lite:     'smartsoko_lite_mode',
    firstOrd: 'smartsoko_first_order_done',
    orders:   'smartsoko_order_history',
  };

  // ── WhatsApp share ───────────────────────────────────────────────
  const WhatsApp = {
    buildLink(phone, text) {
      const t = encodeURIComponent(text || '');
      if (phone) {
        const clean = String(phone).replace(/[^0-9]/g, '');
        return `https://wa.me/${clean}?text=${t}`;
      }
      return `https://wa.me/?text=${t}`;
    },
    open(phone, text) {
      try {
        window.open(this.buildLink(phone, text), '_blank', 'noopener');
      } catch (_) {
        window.location.href = this.buildLink(phone, text);
      }
    },
    shareProduct(p) {
      const url = `${location.origin}/restaurant?id=${encodeURIComponent(p.id || p.sellerId || '')}`;
      const name = p.name || 'product';
      const seller = p.sellerName ? ` kutoka ${p.sellerName}` : '';
      const price = p.price != null ? ` - TZS ${Number(p.price).toLocaleString()}` : '';
      const t = `${I18N.t('feed.share')}: ${name}${seller}${price} 🛒\n${url}\n\nVia SmartSoko 🇹🇿`;
      this.open(null, t);
    },
    shareCart(items) {
      if (!items || !items.length) {
        SokoToast.show(I18N.t('cart.empty'), 'info');
        return;
      }
      const lines = items.map(i => `• ${i.name} x${i.quantity || 1} - TZS ${(i.price * (i.quantity || 1)).toLocaleString()}`).join('%0A');
      const total = items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
      const url = `${location.origin}/checkout`;
      const t = `${I18N.t('cart.shareText')} 🛒%0A${lines}%0A%0AJumla: TZS ${total.toLocaleString()}%0A${url}`;
      this.open(null, t);
    },
    shareOrder(order) {
      const url = `${location.origin}/track-order?orderId=${encodeURIComponent(order.id || '')}`;
      const t = `${I18N.t('checkout.shareText')} #${(order.id || '').slice(0, 8)}%0ATZS ${(order.total || 0).toLocaleString()}${order.status ? '%0A' + I18N.t('order.status.' + order.status) : ''}%0A${url}`;
      this.open(null, t);
    },
    inviteGroup(cartUrl) {
      const t = `${I18N.t('group.inviteText')} ${cartUrl || (location.origin + '/checkout')}`;
      this.open(null, t);
    }
  };

  // ── Bonga points ────────────────────────────────────────────────
  const Bonga = {
    get() {
      try { return JSON.parse(localStorage.getItem(K.bonga) || 'null') || { points: 0, history: [] }; }
      catch (_) { return { points: 0, history: [] }; }
    },
    set(state) {
      try { localStorage.setItem(K.bonga, JSON.stringify(state)); } catch (_) {}
      document.dispatchEvent(new CustomEvent('soko:bonga', { detail: state }));
    },
    add(amount, reason) {
      const s = this.get();
      s.points = Math.max(0, (s.points || 0) + Math.round(amount));
      s.history.unshift({ at: Date.now(), delta: Math.round(amount), reason: reason || '' });
      s.history = s.history.slice(0, 50);
      this.set(s);
      SokoToast.show(`+${Math.round(amount)} Bonga points! 🪙`, 'success');
      return s.points;
    },
    redeem(needed) {
      const s = this.get();
      if ((s.points || 0) < needed) {
        SokoToast.show(I18N.t('bonga.yourPoints') + ': ' + s.points, 'info');
        return false;
      }
      s.points -= needed;
      s.history.unshift({ at: Date.now(), delta: -needed, reason: 'redeem' });
      this.set(s);
      return true;
    },
    // Earn rule: 1 point per TZS 1,000 spent. 2x on Mama Ntilie Friday.
    earnForOrder(total, opts) {
      opts = opts || {};
      let pts = Math.floor((Number(total) || 0) / 1000);
      const friday = new Date().getDay() === 5;
      if (friday || opts.bonusFriday) pts *= 2;
      // First order bonus
      if (!localStorage.getItem(K.firstOrd)) {
        pts += 1000; // 1000 points ≈ TZS 10,000
        localStorage.setItem(K.firstOrd, '1');
        SokoToast.show(I18N.t('empty.firstOrderTitle'), 'success');
        fireConfetti();
      }
      if (pts > 0) this.add(pts, opts.reason || 'order');
      return pts;
    }
  };

  // ── Agiza Tena (reorder) ───────────────────────────────────────
  const AgizaTena = {
    /**
     * Save the current cart as a past order so we can re-fill it later.
     * The server already keeps the canonical order in Firestore; this is a
     * local quick-access cache for 1-tap reorders, even offline.
     */
    remember(order) {
      if (!order || !order.items || !order.items.length) return;
      try {
        const all = JSON.parse(localStorage.getItem(K.orders) || '[]');
        all.unshift({
          id: order.id,
          sellerId: order.sellerId || (order.items[0] && order.items[0].sellerId),
          sellerName: order.sellerName || (order.items[0] && order.items[0].sellerName),
          items: order.items,
          total: order.total,
          status: order.status,
          at: order.createdAt || Date.now()
        });
        localStorage.setItem(K.orders, JSON.stringify(all.slice(0, 20)));
      } catch (_) {}
    },
    list() {
      try { return JSON.parse(localStorage.getItem(K.orders) || '[]'); }
      catch (_) { return []; }
    },
    /**
     * Reorder: pushes the items from a past order into the active cart.
     * Works with both CartService and the legacy smartsoko_cart localStorage.
     */
    reorder(past) {
      if (!past || !past.items || !past.items.length) {
        SokoToast.show(I18N.t('cart.empty'), 'info');
        return false;
      }
      // Prefer CartService when present
      if (window.CartService && window.CartService.addItem) {
        past.items.forEach(it => {
          CartService.addItem({
            id: it.id || it.productId,
            name: it.name,
            price: it.price,
            imageUrl: it.imageUrl,
            sellerId: it.sellerId || past.sellerId,
            sellerName: it.sellerName || past.sellerName,
            quantity: it.quantity || 1
          });
        });
        SokoToast.show(I18N.t('cart.addedToCart'), 'success');
        if (typeof window.updateCartUI === 'function') window.updateCartUI();
        document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'reorder' } }));
        return true;
      }
      // Legacy fallback
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem('smartsoko_cart') || '[]'); } catch (_) {}
      past.items.forEach(it => {
        const idx = cart.findIndex(c => c.id === (it.id || it.productId));
        if (idx >= 0) cart[idx].quantity = (cart[idx].quantity || 1) + (it.quantity || 1);
        else cart.push({
          id: it.id || it.productId,
          name: it.name,
          price: it.price,
          imageUrl: it.imageUrl,
          quantity: it.quantity || 1,
          sellerId: it.sellerId || past.sellerId,
          sellerName: it.sellerName || past.sellerName
        });
      });
      try { localStorage.setItem('smartsoko_cart', JSON.stringify(cart)); } catch (_) {}
      SokoToast.show(I18N.t('cart.addedToCart'), 'success');
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'reorder' } }));
      return true;
    }
  };

  // ── Oda na Marafiki (group order) ──────────────────────────────
  const GroupOrder = {
    create(items, hostName) {
      const id = 'GO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const url = `${location.origin}/group-order/${id}`;
      try {
        sessionStorage.setItem('soko_group_' + id, JSON.stringify({
          id, host: hostName || 'Mwenyeji', items, url, at: Date.now()
        }));
      } catch (_) {}
      return { id, url };
    }
  };

  // ── Lite mode ──────────────────────────────────────────────────
  const Lite = {
    isOn() {
      try { return localStorage.getItem(K.lite) === '1'; } catch (_) { return false; }
    },
    toggle() {
      const on = !this.isOn();
      try { localStorage.setItem(K.lite, on ? '1' : '0'); } catch (_) {}
      this.apply();
      SokoToast.show((on ? 'Lite mode ON ' : 'Lite mode OFF ') + '🪶', 'info');
      return on;
    },
    apply() {
      const on = this.isOn();
      document.documentElement.classList.toggle('soko-lite', on);
    }
  };

  // ── Toast helper ──────────────────────────────────────────────
  const SokoToast = (() => {
    let root;
    function ensure() {
      if (root) return root;
      root = document.createElement('div');
      root.id = 'soko-toast-root';
      root.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(root);
      return root;
    }
    function show(msg, type) {
      ensure();
      const el = document.createElement('div');
      const palette = {
        success: 'background:#16a34a;color:#fff',
        error: 'background:#dc2626;color:#fff',
        info: 'background:#1f2937;color:#fff'
      };
      el.style.cssText = `pointer-events:auto;padding:12px 18px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.18);font-weight:600;font-size:14px;max-width:90vw;animation:sokoToastIn .3s ease;${palette[type] || palette.info}`;
      el.textContent = msg;
      root.appendChild(el);
      setTimeout(() => {
        el.style.animation = 'sokoToastOut .3s ease forwards';
        setTimeout(() => el.remove(), 300);
      }, 2400);
    }
    return { show };
  })();

  // ── Confetti (lightweight) ────────────────────────────────────
  function fireConfetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const W = c.width = innerWidth, H = c.height = innerHeight;
    const colors = ['#ff6600', '#16a34a', '#06A77D', '#F4A261', '#E63946', '#a855f7'];
    const parts = Array.from({ length: 80 }, () => ({
      x: W / 2, y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 14,
      g: 0.35,
      r: Math.random() * 5 + 3,
      c: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      max: 90 + Math.random() * 30
    }));
    let raf;
    function step() {
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.life++;
        p.x += p.vx; p.y += p.vy; p.vy += p.g;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.r, p.r);
        ctx.restore();
      });
      if (parts.some(p => p.life < p.max)) {
        raf = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(raf);
        c.remove();
      }
    }
    step();
  }

  // ── Soko mascot SVG (inline, no external) ─────────────────────
  const MASCOT_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="sokoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#E63946"/>
        <stop offset="0.5" stop-color="#ff6600"/>
        <stop offset="1" stop-color="#F4A261"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="105" r="78" fill="url(#sokoGrad)"/>
    <ellipse cx="100" cy="160" rx="60" ry="12" fill="rgba(0,0,0,0.08)"/>
    <path d="M40 90 Q60 50 100 55 Q140 50 160 90" fill="#fff"/>
    <circle cx="78" cy="100" r="9" fill="#1a1a1a"/>
    <circle cx="122" cy="100" r="9" fill="#1a1a1a"/>
    <circle cx="80" cy="97" r="3" fill="#fff"/>
    <circle cx="124" cy="97" r="3" fill="#fff"/>
    <path d="M82 128 Q100 144 118 128" stroke="#1a1a1a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M100 55 L100 35 M88 45 L100 35 L112 45" stroke="#E63946" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;

  // ── Discovery feed renderer (used by customer.html / discovery-feed.html) ──
  const DiscoveryFeed = {
    mount(target, products) {
      if (!target) return;
      const list = (products || []).slice(0, 12);
      if (!list.length) {
        target.innerHTML = `
          <div class="soko-empty">
            <div class="soko-mascot">${MASCOT_SVG}</div>
            <h3>${I18N.t('home.popularSellers')}</h3>
            <p>${I18N.t('home.exploreNow')}</p>
          </div>`;
        return;
      }
      target.classList.add('soko-feed');
      target.innerHTML = list.map((p, i) => `
        <article class="soko-feed-card" data-idx="${i}">
          <div class="soko-feed-media">
            ${p.imageUrl
              ? `<img src="${escapeAttr(p.imageUrl)}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;soko-feed-fallback&quot;><span class=&quot;material-symbols-outlined&quot;>restaurant</span></div>'">`
              : `<div class="soko-feed-fallback"><span class="material-symbols-outlined">restaurant</span></div>`}
            <div class="soko-feed-overlay-top">
              <span class="soko-chip">${I18N.t('genz.hot')}</span>
              <span class="soko-chip soko-chip-alt">${escapeAttr(p.sellerName || '')}</span>
            </div>
            <button class="soko-feed-fab soko-fab-add" aria-label="${I18N.t('cta.addToCart')}"
              onclick='SokoFeatures.addToCart(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
              <span class="material-symbols-outlined">add</span>
            </button>
            <button class="soko-feed-fab soko-fab-share" aria-label="${I18N.t('cta.share')}"
              onclick='SokoFeatures.shareProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
              <span class="material-symbols-outlined">share</span>
            </button>
            <div class="soko-feed-overlay-bottom">
              <h3>${escapeAttr(p.name || '')}</h3>
              <p>${escapeAttr(p.description || '')}</p>
              <div class="soko-feed-row">
                <span class="soko-feed-price">TZS ${Number(p.price || 0).toLocaleString()}</span>
                <button class="soko-btn soko-btn-primary soko-btn-sm" onclick='SokoFeatures.addToCart(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                  <span class="material-symbols-outlined">shopping_cart</span>
                  ${I18N.t('feed.addToCart')}
                </button>
              </div>
            </div>
          </div>
        </article>
      `).join('');
    },
    addToCart(p) {
      const item = {
        id: p.id || p.productId,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        sellerId: p.sellerId,
        sellerName: p.sellerName
      };
      if (window.CartService) CartService.addItem(item);
      SokoToast.show(I18N.t('cart.addedToCart'), 'success');
    }
  };

  // ── HTML escape helpers ─────────────────────────────────────
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ── Floating WhatsApp share button (injected for cart page) ──
  function injectCartShareFab() {
    if (document.getElementById('soko-cart-share-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'soko-cart-share-fab';
    fab.className = 'soko-fab soko-fab-wa';
    fab.title = I18N.t('cart.share');
    fab.setAttribute('aria-label', I18N.t('cart.share'));
    fab.innerHTML = '<span class="material-symbols-outlined">chat</span>';
    fab.addEventListener('click', () => {
      const items = (window.CartService ? CartService.getCart() : []);
      WhatsApp.shareCart(items);
    });
    document.body.appendChild(fab);
  }

  // ── Public API ───────────────────────────────────────────────
  window.SokoFeatures = {
    WhatsApp,
    Bonga,
    AgizaTena,
    GroupOrder,
    Lite,
    SokoToast,
    DiscoveryFeed,
    addToCart: (p) => DiscoveryFeed.addToCart(p),
    shareProduct: (p) => WhatsApp.shareProduct(p),
    shareOrder: (o) => WhatsApp.shareOrder(o),
    fireConfetti,
    MASCOT_SVG,
    injectCartShareFab,
    escapeAttr
  };

  // Apply lite mode class on load (cheap, no side effects)
  if (Lite.isOn()) document.documentElement.classList.add('soko-lite');
  document.addEventListener('DOMContentLoaded', () => {
    if (Lite.isOn()) document.documentElement.classList.add('soko-lite');
    // On any cart/checkout page, drop the floating WhatsApp share FAB
    if (/\/(checkout|cart)/i.test(location.pathname)) injectCartShareFab();
  });
})();
