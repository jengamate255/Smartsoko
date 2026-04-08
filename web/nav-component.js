/**
 * SmartSoko Shared Navigation Component
 * Single source of truth for all navigation across the app.
 * Include this script on any page and call the render functions.
 *
 * Usage:
 *   <script src="nav-component.js"></script>
 *   <script>
 *     SmartNav.init({
 *       activePage: 'home',
 *       showMegaMenu: true,
 *       showCart: true,
 *       breadcrumbs: ['Home', 'Products']
 *     });
 *   </script>
 */

const SmartNav = (() => {
  // ── Configuration ──────────────────────────────────────────────
  const NAV_ITEMS = [
    { id: 'home',      label: 'Home',      icon: 'home',           href: 'main.html' },
    { id: 'discover',  label: 'Discover',   icon: 'explore',        href: 'discovery.html' },
    { id: 'cart',      label: 'Cart',       icon: 'shopping_cart',  href: 'customer.html' },
    { id: 'profile',   label: 'Profile',    icon: 'person',         href: 'profile.html' },
  ];

  const DRIVER_NAV = [
    { id: 'home',      label: 'Home',      icon: 'home',           href: 'main.html' },
    { id: 'orders',    label: 'Orders',     icon: 'receipt_long',   href: 'driver.html' },
    { id: 'earnings',  label: 'Earnings',   icon: 'payments',       href: 'driver.html' },
    { id: 'profile',   label: 'Profile',    icon: 'person',         href: 'profile.html' },
  ];

  const MERCHANT_NAV = [
    { id: 'home',      label: 'Home',      icon: 'home',           href: 'main.html' },
    { id: 'orders',    label: 'Orders',     icon: 'receipt_long',   href: 'merchant.html' },
    { id: 'products',  label: 'Products',   icon: 'inventory_2',    href: 'merchant.html' },
    { id: 'profile',   label: 'Profile',    icon: 'person',         href: 'profile.html' },
  ];

  const ADMIN_NAV = [
    { id: 'home',      label: 'Home',      icon: 'home',           href: 'main.html' },
    { id: 'dashboard', label: 'Dashboard',  icon: 'dashboard',      href: 'supabase.html' },
    { id: 'users',     label: 'Users',      icon: 'group',          href: 'supabase.html' },
    { id: 'profile',   label: 'Profile',    icon: 'person',         href: 'profile.html' },
  ];

  const CATEGORIES = [
    { name: 'Food',      icon: 'lunch_dining',     color: '#ff6600', href: 'discovery.html?category=food' },
    { name: 'Dairy',     icon: 'local_drink',       color: '#3b82f6', href: 'discovery.html?category=dairy' },
    { name: 'Fruits',    icon: 'nutrition',         color: '#22c55e', href: 'discovery.html?category=fruits' },
    { name: 'Groceries', icon: 'shopping_basket',   color: '#a855f7', href: 'discovery.html?category=groceries' },
    { name: 'Bakery',    icon: 'bakery_dining',     color: '#f59e0b', href: 'discovery.html?category=bakery' },
  ];

  const QUICK_LINKS = [
    { label: 'Customer App',  href: 'customer.html',  icon: 'shopping_cart' },
    { label: 'Seller App',    href: 'merchant.html',  icon: 'store' },
    { label: 'Driver App',    href: 'driver.html',    icon: 'motorcycle' },
    { label: 'Admin Panel',   href: 'supabase.html',  icon: 'admin_panel_settings' },
  ];

  let config = {};
  let cartCount = 0;

  // ── Init ───────────────────────────────────────────────────────
  function init(opts = {}) {
    config = {
      activePage: opts.activePage || 'home',
      showMegaMenu: opts.showMegaMenu !== false,
      showCart: opts.showCart !== false,
      showSearch: opts.showSearch !== false,
      role: opts.role || 'customer',
      breadcrumbs: opts.breadcrumbs || null,
      title: opts.title || 'SmartSoko',
      ...opts,
    };

    cartCount = getCartCount();
    renderTopBar();
    renderBottomNav();
    initScrollBehavior();
    initKeyboardNav();
  }

  // ── Cart helpers ───────────────────────────────────────────────
  function getCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('smartsoko_cart') || '[]');
      return cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    } catch { return 0; }
  }

  function updateCartBadge() {
    cartCount = getCartCount();
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = cartCount;
      el.style.display = cartCount > 0 ? 'flex' : 'none';
    });
  }

  // ── Top Bar ────────────────────────────────────────────────────
  function renderTopBar() {
    let existing = document.getElementById('smartnav-topbar');
    if (existing) existing.remove();

    const bar = document.createElement('header');
    bar.id = 'smartnav-topbar';
    bar.innerHTML = `
      <style>
        #smartnav-topbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          transition: transform 0.3s ease;
        }
        #smartnav-topbar.hidden { transform: translateY(-100%); }
        .sn-topbar-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1.5rem; gap: 1rem;
        }
        .sn-logo {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none; color: #1a1a1a; font-weight: 800;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem;
        }
        .sn-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #ff6600, #ff8800);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.1rem;
        }
        .sn-hamburger {
          display: none; background: none; border: none; cursor: pointer;
          padding: 0.4rem; border-radius: 8px; color: #1a1a1a;
        }
        .sn-hamburger:hover { background: #f5f5f5; }
        .sn-search {
          flex: 1; max-width: 420px; position: relative;
        }
        .sn-search input {
          width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem;
          border: 1px solid #e0e0e0; border-radius: 999px;
          font-size: 0.9rem; outline: none; transition: border-color 0.2s;
          background: #fafafa;
        }
        .sn-search input:focus { border-color: #ff6600; background: #fff; }
        .sn-search .sn-search-icon {
          position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%);
          color: #999; font-size: 1.1rem; pointer-events: none;
        }
        .sn-actions { display: flex; align-items: center; gap: 0.5rem; }
        .sn-btn {
          display: flex; align-items: center; gap: 0.35rem;
          padding: 0.5rem 0.75rem; border: none; border-radius: 999px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          text-decoration: none; transition: all 0.2s;
          position: relative;
        }
        .sn-btn-ghost { background: transparent; color: #666; }
        .sn-btn-ghost:hover { background: #f5f5f5; color: #ff6600; }
        .sn-btn-primary { background: #ff6600; color: #fff; }
        .sn-btn-primary:hover { background: #e55500; }
        .sn-btn-outline { background: #fff; color: #1a1a1a; border: 1px solid #e0e0e0; }
        .sn-btn-outline:hover { border-color: #ff6600; color: #ff6600; }
        .cart-badge-count {
          position: absolute; top: -4px; right: -4px;
          min-width: 18px; height: 18px; padding: 0 4px;
          background: #dc2626; color: #fff; border-radius: 999px;
          font-size: 0.65rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .sn-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #ff6600, #ff8800);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.85rem; cursor: pointer;
        }

        /* Mega menu */
        .sn-mega-trigger { position: relative; }
        .sn-mega-dropdown {
          display: none; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%); margin-top: 0.75rem;
          background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.12);
          padding: 1.5rem; min-width: 520px; z-index: 1100;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .sn-mega-dropdown.open { display: block; animation: snFadeIn 0.2s ease; }
        @keyframes snFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .sn-mega-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
        .sn-mega-item {
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
          padding: 0.85rem 0.5rem; border-radius: 12px; text-decoration: none;
          color: #1a1a1a; transition: all 0.2s;
        }
        .sn-mega-item:hover { background: #fff7ed; transform: translateY(-2px); }
        .sn-mega-item .sn-mega-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; color: #fff;
        }
        .sn-mega-item span { font-size: 0.8rem; font-weight: 600; }

        /* Drawer */
        .sn-drawer-overlay {
          display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          z-index: 2000; opacity: 0; transition: opacity 0.3s;
        }
        .sn-drawer-overlay.open { display: block; opacity: 1; }
        .sn-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 300px;
          background: #fff; z-index: 2001; transform: translateX(-100%);
          transition: transform 0.3s ease; overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .sn-drawer.open { transform: translateX(0); }
        .sn-drawer-header {
          padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #f0f0f0;
        }
        .sn-drawer-close {
          background: none; border: none; cursor: pointer; padding: 0.4rem;
          border-radius: 8px; color: #666;
        }
        .sn-drawer-close:hover { background: #f5f5f5; }
        .sn-drawer-nav { padding: 0.75rem; flex: 1; }
        .sn-drawer-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem; border-radius: 10px; text-decoration: none;
          color: #1a1a1a; font-weight: 500; transition: all 0.15s;
        }
        .sn-drawer-link:hover { background: #fff7ed; color: #ff6600; }
        .sn-drawer-link.active { background: #ff6600; color: #fff; }
        .sn-drawer-link .material-symbols-outlined { font-size: 1.25rem; }
        .sn-drawer-divider { height: 1px; background: #f0f0f0; margin: 0.5rem 1rem; }
        .sn-drawer-section { padding: 0.5rem 1rem; font-size: 0.7rem; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Breadcrumbs */
        .sn-breadcrumbs {
          padding: 0.5rem 1.5rem; max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.8rem; color: #999;
        }
        .sn-breadcrumbs a { color: #666; text-decoration: none; }
        .sn-breadcrumbs a:hover { color: #ff6600; }
        .sn-breadcrumbs .sn-bc-sep { color: #ccc; }
        .sn-breadcrumbs .sn-bc-current { color: #1a1a1a; font-weight: 600; }

        /* Bottom nav */
        .sn-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(16px);
          border-top: 1px solid rgba(0,0,0,0.06);
          display: flex; justify-content: center; gap: 0.25rem;
          padding: 0.5rem 0.75rem 0.75rem;
        }
        .sn-bottom-item {
          display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
          padding: 0.4rem 1rem; border-radius: 12px; text-decoration: none;
          color: #666; font-size: 0.7rem; font-weight: 600; transition: all 0.2s;
          position: relative;
        }
        .sn-bottom-item:hover { color: #ff6600; background: #fff7ed; }
        .sn-bottom-item.active { color: #ff6600; }
        .sn-bottom-item .material-symbols-outlined { font-size: 1.35rem; }
        .sn-bottom-item.active .material-symbols-outlined { font-variation-settings: 'FILL' 1; }

        @media (max-width: 768px) {
          .sn-hamburger { display: flex; }
          .sn-search { display: none; }
          .sn-btn span.sn-btn-label { display: none; }
          .sn-mega-dropdown { min-width: calc(100vw - 2rem); left: 1rem; transform: none; }
          .sn-mega-dropdown.open { animation: none; }
          .sn-mega-grid { grid-template-columns: repeat(3, 1fr); }
        }
      </style>

      <div class="sn-topbar-inner">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="sn-hamburger" id="sn-hamburger-btn" aria-label="Open menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <a href="main.html" class="sn-logo">
            <div class="sn-logo-icon">
              <span class="material-symbols-outlined" style="font-size:1.1rem;font-variation-settings:'FILL' 1;">shopping_basket</span>
            </div>
            <span>SmartSoko</span>
          </a>
        </div>

        ${config.showSearch ? `
        <div class="sn-search">
          <span class="material-symbols-outlined sn-search-icon">search</span>
          <input type="text" id="sn-search-input" placeholder="Search products, sellers..." aria-label="Search">
        </div>` : ''}

        <div class="sn-actions">

          ${config.showCart ? `
          <a href="customer.html" class="sn-btn sn-btn-ghost" style="position:relative;">
            <span class="material-symbols-outlined" style="font-size:1.15rem;">shopping_cart</span>
            <span class="sn-btn-label">Cart</span>
            <span class="cart-badge-count" style="display:${cartCount > 0 ? 'flex' : 'none'};">${cartCount}</span>
          </a>` : ''}

          <a href="profile.html" class="sn-avatar" aria-label="Profile">
            <span class="material-symbols-outlined" style="font-size:1rem;">person</span>
          </a>
        </div>
      </div>
    `;

    document.body.prepend(bar);

    // Event listeners
    const megaBtn = document.getElementById('sn-mega-btn');
    const megaMenu = document.getElementById('sn-mega-menu');
    if (megaBtn && megaMenu) {
      megaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        megaMenu.classList.toggle('open');
      });
      document.addEventListener('click', () => megaMenu.classList.remove('open'));
    }

    const searchInput = document.getElementById('sn-search-input');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          window.location.href = `discovery.html?search=${encodeURIComponent(searchInput.value.trim())}`;
        }
      });
    }

    // Drawer
    renderDrawer();
    document.getElementById('sn-hamburger-btn')?.addEventListener('click', openDrawer);
    document.getElementById('sn-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('sn-drawer-overlay')?.addEventListener('click', closeDrawer);
  }

  // ── Drawer ─────────────────────────────────────────────────────
  function renderDrawer() {
    let existing = document.getElementById('sn-drawer-overlay');
    if (existing) existing.remove();

    const roleNav = getRoleNav();

    const overlay = document.createElement('div');
    overlay.id = 'sn-drawer-overlay';
    overlay.className = 'sn-drawer-overlay';
    overlay.innerHTML = `
      <div class="sn-drawer" id="sn-drawer">
        <div class="sn-drawer-header">
          <a href="main.html" class="sn-logo" style="font-size:1.1rem;">
            <div class="sn-logo-icon" style="width:32px;height:32px;border-radius:8px;">
              <span class="material-symbols-outlined" style="font-size:1rem;">shopping_basket</span>
            </div>
            SmartSoko
          </a>
          <button class="sn-drawer-close" id="sn-drawer-close" aria-label="Close menu">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="sn-drawer-nav">
          <div class="sn-drawer-section">Main Menu</div>
          ${roleNav.map(item => `
            <a href="${item.href}" class="sn-drawer-link ${item.id === config.activePage ? 'active' : ''}">
              <span class="material-symbols-outlined">${item.icon}</span>
              ${item.label}
            </a>
          `).join('')}
          <div class="sn-drawer-divider"></div>
          <div class="sn-drawer-section">Quick Links</div>
          ${QUICK_LINKS.map(link => `
            <a href="${link.href}" class="sn-drawer-link">
              <span class="material-symbols-outlined">${link.icon}</span>
              ${link.label}
            </a>
          `).join('')}
          <div class="sn-drawer-divider"></div>
          <div class="sn-drawer-section">Categories</div>
          ${CATEGORIES.map(cat => `
            <a href="${cat.href}" class="sn-drawer-link">
              <span class="material-symbols-outlined" style="color:${cat.color}">${cat.icon}</span>
              ${cat.name}
            </a>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function openDrawer() {
    document.getElementById('sn-drawer-overlay')?.classList.add('open');
    document.getElementById('sn-drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    document.getElementById('sn-drawer-overlay')?.classList.remove('open');
    document.getElementById('sn-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function getRoleNav() {
    switch (config.role) {
      case 'driver': return DRIVER_NAV;
      case 'merchant': return MERCHANT_NAV;
      case 'admin': return ADMIN_NAV;
      default: return NAV_ITEMS;
    }
  }

  // ── Bottom Nav ─────────────────────────────────────────────────
  function renderBottomNav() {
    let existing = document.getElementById('smartnav-bottom');
    if (existing) existing.remove();

    const items = getRoleNav();
    const nav = document.createElement('nav');
    nav.id = 'smartnav-bottom';
    nav.className = 'sn-bottom-nav';
    nav.innerHTML = items.map(item => `
      <a href="${item.href}" class="sn-bottom-item ${item.id === config.activePage ? 'active' : ''}">
        <span class="material-symbols-outlined">${item.icon}</span>
        ${item.label}
      </a>
    `).join('');

    document.body.appendChild(nav);
  }

  // ── Breadcrumbs ────────────────────────────────────────────────
  function renderBreadcrumbs() {
    let existing = document.getElementById('smartnav-breadcrumbs');
    if (existing) existing.remove();
    if (!config.breadcrumbs || config.breadcrumbs.length === 0) return;

    const bc = document.createElement('div');
    bc.id = 'smartnav-breadcrumbs';
    bc.className = 'sn-breadcrumbs';

    const crumbs = config.breadcrumbs;
    bc.innerHTML = `
      <a href="main.html">Home</a>
      ${crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return `<span class="sn-bc-sep">/</span>${isLast
          ? `<span class="sn-bc-current">${crumb}</span>`
          : `<a href="#">${crumb}</a>`
        }`;
      }).join('')}
    `;

    // Insert after topbar
    const topbar = document.getElementById('smartnav-topbar');
    if (topbar) {
      topbar.insertAdjacentElement('afterend', bc);
    } else {
      document.body.prepend(bc);
    }
  }

  // ── Scroll behavior ────────────────────────────────────────────
  function initScrollBehavior() {
    let lastScroll = 0;
    const topbar = document.getElementById('smartnav-topbar');
    if (!topbar) return;

    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      if (current > lastScroll && current > 80) {
        topbar.classList.add('hidden');
      } else {
        topbar.classList.remove('hidden');
      }
      lastScroll = current;
    }, { passive: true });
  }

  // ── Keyboard navigation ────────────────────────────────────────
  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const input = document.getElementById('sn-search-input');
        if (input) { e.preventDefault(); input.focus(); }
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────
  return { init, updateCartBadge, openDrawer, closeDrawer };
})();
