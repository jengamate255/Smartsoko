/**
 * SmartSoko Collapsible Tabs Component
 * Makes tab content sections collapsible to save vertical space.
 * Works with existing .tab-content divs - no HTML changes needed.
 *
 * Usage: After including this script, each tab section gets a collapsible
 *        header. Click the header to expand/collapse. The active tab
 *        auto-expands.
 */
(function() {
  'use strict';

  const STYLES = `
    .tab-content { transition: max-height 0.3s ease, opacity 0.2s ease; }
    .tab-content.collapsed { max-height: 0 !important; opacity: 0; overflow: hidden; pointer-events: none; }
    .tab-content.expanded { max-height: 8000px; opacity: 1; overflow: visible; pointer-events: auto; }

    .tab-collapse-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; margin-bottom: 16px; border-radius: 12px;
      background: var(--color-surface-container, #ECFDF5); cursor: pointer;
      user-select: none; transition: all 0.2s;
    }
    .tab-collapse-bar:hover { background: var(--color-surface-container-high, #D1FAE5); }

    .tab-collapse-bar .tab-collapse-title {
      display: flex; align-items: center; gap: 8px;
    }
    .tab-collapse-bar .tab-collapse-title h2 {
      margin: 0; font-size: 16px; font-weight: 600;
    }
    .tab-collapse-bar .tab-collapse-icon {
      transition: transform 0.3s ease; font-size: 20px;
      color: var(--color-on-surface-variant, #64748B);
    }
    .tab-collapse-bar.expanded .tab-collapse-icon { transform: rotate(180deg); }

    .ss-collapse-controls {
      display: flex; justify-content: flex-end; gap: 6px; padding: 0 0 8px;
    }
    .ss-collapse-controls button {
      display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px;
      border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--color-outline-variant, #dcc1b1);
      background: var(--color-surface-container-lowest, #fff);
      color: var(--color-on-surface-variant, #64748B); transition: all 0.2s;
    }
    .ss-collapse-controls button:hover {
      border-color: var(--color-primary, #064E3B);
      color: var(--color-primary, #064E3B);
    }
  `;

  function injectStyles() {
    if (document.getElementById('ss-tab-collapse-styles')) return;
    const s = document.createElement('style');
    s.id = 'ss-tab-collapse-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  const TAB_META = {
    dashboard:   { icon: 'dashboard',             label: 'Dashboard' },
    orders:      { icon: 'shopping_bag',           label: 'Orders' },
    inventory:   { icon: 'inventory_2',            label: 'Products' },
    finance:     { icon: 'account_balance_wallet', label: 'Wallet' },
    analytics:   { icon: 'monitoring',             label: 'Analytics' },
    promotions:  { icon: 'local_offer',            label: 'Promotions' },
    reviews:     { icon: 'star',                   label: 'Reviews' },
    staff:       { icon: 'group',                  label: 'Staff' },
    branches:    { icon: 'location_on',            label: 'Branches' },
    settings:    { icon: 'settings',               label: 'Settings' }
  };

  let collapsedState = {};

  function loadState() {
    try { collapsedState = JSON.parse(localStorage.getItem('ss_tab_collapse') || '{}'); } catch { collapsedState = {}; }
  }

  function saveState() {
    try { localStorage.setItem('ss_tab_collapse', JSON.stringify(collapsedState)); } catch {}
  }

  function wrapTabContent(el) {
    const id = el.id.replace('tab-', '');
    const meta = TAB_META[id] || { icon: 'tab', label: id.charAt(0).toUpperCase() + id.slice(1) };

    const bar = document.createElement('div');
    bar.className = 'tab-collapse-bar expanded';
    bar.dataset.tab = id;
    bar.innerHTML = `
      <div class="tab-collapse-title">
        <h2 class="font-headline-sm text-headline-sm text-on-surface">${meta.label}</h2>
      </div>
      <span class="material-symbols-outlined tab-collapse-icon">expand_more</span>
    `;

    el.style.margin = '0';
    el.insertAdjacentElement('beforebegin', bar);

    bar.addEventListener('click', () => {
      toggleTab(id);
    });

    return bar;
  }

  function toggleTab(tabId) {
    const el = document.getElementById('tab-' + tabId);
    const bar = document.querySelector(`.tab-collapse-bar[data-tab="${tabId}"]`);
    if (!el || !bar) return;

    const isCollapsed = el.classList.contains('collapsed');

    if (isCollapsed) {
      expandTab(tabId);
    } else {
      collapseTab(tabId);
    }
  }

  function expandTab(tabId) {
    const el = document.getElementById('tab-' + tabId);
    const bar = document.querySelector(`.tab-collapse-bar[data-tab="${tabId}"]`);
    if (!el || !bar) return;

    el.classList.remove('collapsed');
    el.classList.add('expanded');
    bar.classList.add('expanded');
    collapsedState[tabId] = false;
    saveState();
  }

  function collapseTab(tabId) {
    const el = document.getElementById('tab-' + tabId);
    const bar = document.querySelector(`.tab-collapse-bar[data-tab="${tabId}"]`);
    if (!el || !bar) return;

    el.classList.remove('expanded');
    el.classList.add('collapsed');
    bar.classList.remove('expanded');
    collapsedState[tabId] = true;
    saveState();
  }

  function init() {
    injectStyles();
    loadState();

    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(el => {
      if (el.querySelector('.tab-collapse-bar')) return;
      wrapTabContent(el);
    });

    tabContents.forEach(el => {
      const id = el.id.replace('tab-', '');
      const isActive = el.classList.contains('active');

      if (isActive) {
        expandTab(id);
      } else if (collapsedState[id] === true) {
        collapseTab(id);
      } else {
        expandTab(id);
      }
    });

    addGlobalControls();

    if (typeof switchTab === 'function' && !window._ssTabPatched) {
      window._ssTabPatched = true;
      const origSwitch = window.switchTab;
      window.switchTab = function(tab) {
        origSwitch(tab);
        expandTab(tab);
      };
    }
  }

  function addGlobalControls() {
    const container = document.querySelector('.max-w-\\[1280px\\]');
    if (!container || document.getElementById('ss-collapse-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'ss-collapse-controls';
    controls.className = 'ss-collapse-controls';
    controls.innerHTML = `
      <button onclick="SmartSokoTabs.expandAll()"><span class="material-symbols-outlined" style="font-size:16px">unfold_more</span> Expand All</button>
      <button onclick="SmartSokoTabs.collapseAll()"><span class="material-symbols-outlined" style="font-size:16px">unfold_less</span> Collapse All</button>
    `;
    container.insertBefore(controls, container.firstChild);
  }

  window.SmartSokoTabs = {
    init,
    toggleTab,
    expandTab,
    collapseTab,
    expandAll() { Object.keys(TAB_META).forEach(id => expandTab(id)); },
    collapseAll() { Object.keys(TAB_META).forEach(id => collapseTab(id)); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();