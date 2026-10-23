import {
    loadMerchantProducts,
    getSalesAnalytics,
    updateOrderStatus,
} from './merchant-enhancements.js';
import { loadAnalytics } from './analytics.js';
import { loadOrders } from './orders.js';
import { Gamification, initGamification, getGamification } from './gamification.js';

// merchant.html owns the live page controls. Keep its state and API-backed
// actions intact; this module supplies helpers for controls it doesn't define.
const pageSwitchTab = window.switchTab;

let currentTab = 'orders';

// XSS Protection: Secure HTML sanitization function
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/`/g, '&#96;');
}

function secureHTML(html) {
    // If input is not a string, convert to string
    if (html === null || html === undefined) return '';

    // Use DOMParser to safely parse HTML and extract text content
    // This prevents XSS by only allowing whitelisted safe HTML tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove all script tags and event handlers
    const unsafeTags = ['script', 'style', 'link', 'meta', 'iframe', 'object', 'embed'];
    unsafeTags.forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Remove event handler attributes (on* attributes)
    const unsafeAttrs = [
        'onclick',
        'onerror',
        'onload',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
        'onsubmit',
        'onreset',
        'onselect',
        'onchange',
        'onkeydown',
        'onkeyup',
        'onkeypress',
        'ondblclick',
        'onmousedown',
        'onmouseup',
        'onmousemove',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
        'onload',
    ];

    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
        unsafeAttrs.forEach(attr => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
        });

        // Remove style attributes that could contain JavaScript
        if (el.hasAttribute('style')) {
            const styleValue = el.getAttribute('style');
            if (styleValue && styleValue.toLowerCase().includes('javascript:')) {
                el.removeAttribute('style');
            }
        }
    });

    // Return sanitized HTML
    return doc.body.innerHTML;
}

// Active Firestore orders-listener unsubscribe handle (module-scoped so it
// stays a callable function â€” dataset storage stringifies it).
let module_unsubscribeOrders = null;

function showToast(message, type = 'success') {
    const el = document.createElement('div');
    el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

const showNotification = showToast;

function createSkeletonCard() {
    return `
    <div class="skeleton stitch-card" style="height: 80px;"></div>
  `;
}

function navigateTo(tabName) {
    // Metric-to-tab mapping for dashboard KPI cards
    const mapping = {
        sales: 'analytics',
        orders: 'orders',
        pending: 'orders',
        aov: 'analytics',
        products: 'menu',
        inventory: 'inventory',
        customers: 'customers',
        wallet: 'finance',
        notifications: 'notifications',
    };

    const targetTab = mapping[tabName] || tabName;

    switchTab(targetTab);
}

function merchantSearch(query) {
    query = (query || '').trim().toLowerCase();
    const activeTab = currentTab;

    if (activeTab === 'orders') {
        // Filter orders by customer name or order ID (rendered classes: ms-order-customer / ms-order-id)
        const orderElements = document.querySelectorAll('#ordersList .ms-order');
        orderElements.forEach(el => {
            const customerName = (
                el.querySelector('.ms-order-customer')?.textContent || ''
            ).toLowerCase();
            const orderId = (el.querySelector('.ms-order-id')?.textContent || '').toLowerCase();
            const matches = !query || customerName.includes(query) || orderId.includes(query);
            el.style.display = matches ? '' : 'none';
        });
    } else if (activeTab === 'menu') {
        // Filter menu items by name (rendered class: ms-menu-name)
        const menuItems = document.querySelectorAll('#menuItemsList .ms-menu-item');
        menuItems.forEach(item => {
            const name = (
                (item.querySelector('.ms-menu-name') || item.querySelector('h3'))?.textContent || ''
            ).toLowerCase();
            const matches = !query || name.includes(query);
            item.style.display = matches ? '' : 'none';
        });
    }
}

function updateBreadcrumb(targetTab) {
    // Only update a real breadcrumb container â€” never the first arbitrary .mb-4
    // (that used to overwrite the first KPI card header on every tab switch).
    const breadcrumb =
        document.querySelector('[aria-label="Breadcrumb"]') ||
        document.querySelector('.breadcrumb');
    if (!breadcrumb) return;
    const tabName = targetTab
        ? targetTab.charAt(0).toUpperCase() + targetTab.slice(1)
        : 'Dashboard';
    breadcrumb.innerHTML = `
    <ol class="inline-flex items-center space-x-1 md:space-x-2">
      <li class="inline-flex items-center">
        <a href="/merchant" class="hover:text-gray-700">Dashboard</a>
      </li>
      <li>
        <div class="flex items-center">
          <span class="mx-2">/</span>
          <span class="text-gray-900 font-medium">${escapeHtml(tabName)}</span>
        </div>
      </li>
    </ol>
  `;
}

async function loadKPIs() {
    const kpiContainer = document.querySelector('.ms-kpi-grid');
    if (!kpiContainer) return;

    kpiContainer.setAttribute('aria-busy', 'true');

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const setDelta = (id, current, previous) => {
        const el = document.getElementById(id);
        if (!el) return;
        let icon = 'trending_flat',
            text = '0%',
            cls = 'ms-kpi-delta';
        if (previous > 0) {
            const pct = Math.round(((current - previous) / previous) * 1000) / 10;
            if (pct > 0) {
                icon = 'trending_up';
                text = `+${pct}%`;
            } else if (pct < 0) {
                icon = 'trending_down';
                text = `${pct}%`;
                cls += ' ms-kpi-delta--down';
            }
        } else if (current > 0) {
            icon = 'trending_up';
            text = 'New';
        }
        el.className = cls;
        el.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">${icon}</span>${text}`;
    };

    try {
        {
            const { apiGetOrders } = await import('./merchant-enhancements.js');
            const orders = await apiGetOrders(500);

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfToday.getDate() - 1);

            let todaySales = 0,
                todayOrders = 0,
                pendingCount = 0;
            let yestSales = 0,
                yestOrders = 0;

            orders.forEach(o => {
                const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
                const amount = o.totalAmount || o.total || 0;
                if (o.status === 'completed' || o.status === 'delivered') {
                    if (d >= startOfToday) {
                        todaySales += amount;
                        todayOrders++;
                    } else if (d >= startOfYesterday) {
                        yestSales += amount;
                        yestOrders++;
                    }
                }
                if (
                    o.status &&
                    o.status !== 'completed' &&
                    o.status !== 'delivered' &&
                    o.status !== 'cancelled'
                )
                    pendingCount++;
            });

            const avgToday = todayOrders > 0 ? Math.round(todaySales / todayOrders) : 0;
            const avgYesterday = yestOrders > 0 ? yestSales / yestOrders : 0;

            setText('todaySales', formatTSh(todaySales));
            setText('orderCount', todayOrders);
            setText('avgOrderValue', formatTSh(avgToday));
            setText(
                'pendingOrders',
                `${pendingCount} pending order${pendingCount === 1 ? '' : 's'}`
            );
            setText('salesLastPeriod', `vs ${formatTSh(yestSales)} yesterday`);
            setDelta('salesDeltaBadge', todaySales, yestSales);
            setDelta('ordersDeltaBadge', todayOrders, yestOrders);
            setDelta('aovDeltaBadge', avgToday, avgYesterday);
        }
        // Keep the dashboard useful when the data service is unavailable.
        document.getElementById('todaySales').textContent ||= 'TSh 0';
        document.getElementById('orderCount').textContent ||= '0';
        document.getElementById('avgOrderValue').textContent ||= 'TSh 0';
        document.getElementById('pendingOrders').textContent ||= 'No pending orders';
        kpiContainer.removeAttribute('aria-busy');
    } catch (error) {
        document.getElementById('todaySales').textContent = 'TSh 0';
        document.getElementById('orderCount').textContent = '0';
        document.getElementById('avgOrderValue').textContent = 'TSh 0';
        document.getElementById('pendingOrders').textContent = 'No pending orders';
        kpiContainer.removeAttribute('aria-busy');
        showToast('Failed to load KPIs', 'error');
        console.error('KPIs Error:', error);
    }
}

function switchTab(tabName, clickedBtn = null) {
    if (pageSwitchTab) return pageSwitchTab(tabName, clickedBtn);
    const tabs = document.querySelectorAll('.ms-tab');
    const tabContents = document.querySelectorAll('[id$="Tab"]');

    tabs.forEach(tab => {
        if (tab === clickedBtn) {
            tab.classList.add('active');
            tab.setAttribute('aria-pressed', 'true');
        } else {
            tab.classList.remove('active');
            tab.setAttribute('aria-pressed', 'false');
        }
    });

    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) activeTab.classList.remove('hidden');

    currentTab = tabName;
    updateBreadcrumb();

    if (tabName === 'orders') loadOrdersTab();
    else if (tabName === 'menu') loadMenuTab();
    else if (tabName === 'analytics') loadAnalyticsTab();
    else if (tabName === 'finance') {
        loadFinance();
        loadPayoutHistory();
    } else if (tabName === 'promotions') {
        if (typeof window.loadPromotions === 'function') window.loadPromotions();
    } else if (tabName === 'reviews') {
        if (typeof window.loadReviews === 'function') window.loadReviews();
    } else if (tabName === 'inventory') {
        loadInventoryTab();
        renderInventoryListLocal();
    } else if (tabName === 'delivery') loadDeliveryTab();
    else if (tabName === 'staff') loadStaffTab();
}

async function loadOrdersTab() {
    const ordersList = document.getElementById('ordersList');
    const detailsPanel =
        document.getElementById('orderDetailsPanel') || document.getElementById('orderDetails');

    ordersList.innerHTML =
        '<div class="text-center py-8"><span class="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><p class="text-gray-500 mt-2">Loading orders...</p></div>';
    if (detailsPanel)
        detailsPanel.innerHTML =
            '<p class="text-gray-500 text-sm text-center py-8">Select an order to view details</p>';

    const { loadOrdersRealtime } = await import('./merchant-enhancements.js');

    // Unsubscribe any previous snapshot listener before re-subscribing
    // (dataset storage stringifies the function, so keep it in a module var).
    if (typeof module_unsubscribeOrders === 'function') {
        try {
            module_unsubscribeOrders();
        } catch (_) {}
        module_unsubscribeOrders = null;
    }
    const unsubscribe = await loadOrdersRealtime(orders => {
        renderOrders(orders);
    });

    if (unsubscribe) {
        module_unsubscribeOrders = unsubscribe;
    } else if (!window.auth || !window.auth.currentUser) {
        ordersList.innerHTML = `
      <div class="empty-state py-12">
        <span class="material-symbols-outlined empty-state-icon">storefront</span>
        <div class="empty-state-title">Complete your business setup</div>
        <div class="empty-state-message">Create your seller profile to start receiving and managing orders.</div>
        <a href="login.html?role=merchant" class="mt-4 inline-block bg-green-700 text-white px-6 py-3 rounded-xl font-semibold no-underline">Complete Setup</a>
      </div>`;
    } else {
        ordersList.innerHTML = `
      <div class="empty-state py-12">
        <span class="material-symbols-outlined empty-state-icon">receipt_long</span>
        <div class="empty-state-title">No orders yet</div>
        <div class="empty-state-message">New customer orders will appear here when they come in.</div>
      </div>`;
    }
}

async function loadAnalyticsTab() {
    const analyticsTab = document.getElementById('analyticsTab');
    if (!analyticsTab) return;

    // ./analytics.js is an ES module: initAnalytics / loadAnalytics /
    // renderDashboardAnalytics are only reachable through its namespace. The
    // legacy window.initAnalytics / window.renderRevenueChart globals live in
    // public/analytics.js, which this page never loads.
    const analytics = await import('./analytics.js');
    const renderAnalyticsCharts = async () => {
        if (
            typeof analytics.loadAnalytics !== 'function' ||
            typeof analytics.renderDashboardAnalytics !== 'function'
        )
            return;
        analytics.renderDashboardAnalytics(await analytics.loadAnalytics('30'));
    };

    // Check if analytics is already loaded
    if (analyticsTab.dataset.moduleLoaded === 'true') {
        // If already loaded, just re-render the charts
        await renderAnalyticsCharts();
        return;
    }

    // Show loading state
    const loadingEl = document.getElementById('analyticsLoading');
    const skeletonEl = document.getElementById('analyticsSkeleton');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (skeletonEl) skeletonEl.classList.remove('hidden');

    try {
        // Initialize the analytics module namespace imported at the top of this
        // function; the namespace itself is used below.

        // Initialize analytics
        if (typeof analytics.initAnalytics === 'function') {
            await analytics.initAnalytics();

            // Mark as loaded
            analyticsTab.dataset.moduleLoaded = 'true';

            await renderAnalyticsCharts();

            // Hide loading state
            if (loadingEl) loadingEl.classList.add('hidden');
            if (skeletonEl) skeletonEl.classList.add('hidden');

            showToast('Analytics loaded successfully', 'success');
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);

        // Hide loading state
        if (loadingEl) loadingEl.classList.add('hidden');
        if (skeletonEl) skeletonEl.classList.add('hidden');

        // Show error state
        const errorEl = document.getElementById('analyticsError');
        const errorMsg = document.getElementById('analyticsErrorMessage');

        if (errorEl) errorEl.classList.remove('hidden');
        if (errorMsg)
            errorMsg.textContent = error.message || 'Failed to load analytics. Please try again.';
    }
}

function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    const detailsPanel =
        document.getElementById('orderDetailsPanel') || document.getElementById('orderDetails');

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p class="text-gray-500 text-center py-8">No orders found</p>';
        return;
    }

    ordersList.innerHTML = orders
        .map(order => {
            const customerName = order.customerName || order.customer_name || 'Customer';
            const initials =
                customerName
                    .split(' ')
                    .map(w => (w && w[0] ? w[0] : ''))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'CU';
            return `
    <div class="ms-order" data-order-status="${escapeHtml(order.status || '')}" onclick="selectOrder('${escapeHtml(order.id)}', this)">
      <div class="flex items-center gap-3">
        <div class="ms-order-avatar">${escapeHtml(initials)}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="ms-order-customer truncate">${escapeHtml(customerName)}</p>
            <span class="ms-order-id">#${escapeHtml(String(order.id).slice(-6))}</span>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5">
            <span class="ms-badge ${escapeHtml(getOrderStatusColor(order.status))}">${escapeHtml(order.status)}</span>
            <span class="ms-order-amount">TSh ${(order.totalAmount ?? order.total ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>`;
        })
        .join('');
}

function selectOrder(orderId, element) {
    if (element) {
        document.querySelectorAll('#ordersList > div').forEach(el => {
            el.classList.remove('ring-2', 'ring-primary');
        });
        element.classList.add('ring-2', 'ring-primary');
    }

    const detailsPanel =
        document.getElementById('orderDetailsPanel') || document.getElementById('orderDetails');
    if (!detailsPanel) return;

    detailsPanel.innerHTML = `
    <div class="animate-pulse">
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
      <div class="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  `;

    loadOrderDetails(orderId, detailsPanel);
}

async function loadOrderDetails(orderId, container) {
    try {
        // GET /orders/:id answers { success, data, allowedNextStatuses }. apiFetch
        // keeps the whole body; apiGet() would unwrap `data` and drop the sibling
        // allowedNextStatuses array, which is why no status buttons were rendered.
        const { apiFetch } = await import('./merchant-enhancements.js');
        const body = await apiFetch('/orders/' + encodeURIComponent(orderId)).catch(() => null);
        const order = body && body.data;
        if (!order) {
            container.innerHTML = '<p class="text-red-500 text-center py-4">Order not found</p>';
            return;
        }
        const items = order.items || order.orderItems || [];
        const total = order.total || order.totalAmount || 0;
        const status = order.status || 'unknown';
        const customer = order.customerName || order.customer?.name || 'Customer';
        const address = order.deliveryAddress || order.delivery_address || '';
        const phone = order.customerPhone || order.customer_phone || '';

        const nextStatuses = ((body && body.allowedNextStatuses) || []).filter(
            s => s !== 'cancelled'
        );
        const STATUS_LABELS = {
            accepted: 'Accept Order',
            preparing: 'Start Preparing',
            ready_for_delivery: 'Ready for Delivery',
            assigned: 'Assign Driver',
            picked_up: 'Picked Up',
            delivered: 'Mark Delivered',
            completed: 'Complete',
        };
        const STATUS_COLORS = {
            accepted: 'bg-green-600 hover:bg-green-700',
            preparing: 'bg-blue-600 hover:bg-blue-700',
            ready_for_delivery: 'bg-orange-500 hover:bg-orange-600',
            assigned: 'bg-purple-600 hover:bg-purple-700',
            delivered: 'bg-emerald-600 hover:bg-emerald-700',
            completed: 'bg-gray-600 hover:bg-gray-700',
        };

        let actionsHtml = '';
        if (nextStatuses.length > 0) {
            actionsHtml =
                '<div class="flex flex-wrap gap-2 pt-2 border-t border-gray-100">' +
                nextStatuses
                    .map(
                        s =>
                            '<button onclick="updateOrderStatusFromDetail(\'' +
                            escapeHtml(orderId) +
                            "','" +
                            escapeHtml(s) +
                            '\')" ' +
                            'class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ' +
                            escapeHtml(STATUS_COLORS[s] || 'bg-green-600 hover:bg-green-700') +
                            '">' +
                            escapeHtml(STATUS_LABELS[s] || 'Mark ' + s.replace(/_/g, ' ')) +
                            '</button>'
                    )
                    .join('') +
                '<button onclick="updateOrderStatusFromDetail(\'' +
                escapeHtml(orderId) +
                "','cancelled')\" " +
                'class="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Cancel Order</button>' +
                '</div>';
        }

        container.innerHTML =
            '<div class="space-y-3">' +
            '<div class="flex justify-between items-center"><span class="font-medium">Order #' +
            escapeHtml(String(orderId).slice(-8)) +
            '</span>' +
            '<span class="px-2 py-1 text-xs rounded-full ' +
            escapeHtml(getOrderStatusColor(status)) +
            '">' +
            escapeHtml(status) +
            '</span></div>' +
            '<div class="text-sm text-gray-600">Customer: ' +
            escapeHtml(customer) +
            '</div>' +
            (phone
                ? '<div class="text-sm text-gray-600">Phone: ' + escapeHtml(phone) + '</div>'
                : '') +
            (address
                ? '<div class="text-sm text-gray-600">Delivery: ' + escapeHtml(address) + '</div>'
                : '') +
            '<div class="text-sm text-gray-600">Total: TSh ' +
            Number(total).toLocaleString() +
            '</div>' +
            (items.length
                ? '<div class="text-sm text-gray-600">Items: ' + items.length + '</div>'
                : '') +
            actionsHtml +
            '</div>';
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center py-4">Error loading order</p>';
        console.error('Load order details error:', error);
    }
}

function updateOrderStatusFromDetail(orderId, newStatus) {
    updateOrderStatus(orderId, newStatus)
        .then(() => {
            showToast(`Order ${orderId} status updated to ${newStatus}`, 'success');
            loadOrdersTab();
        })
        .catch(error => {
            showToast(`Failed to update order: ${error.message}`, 'error');
            console.error('Update Error:', error);
        });
}

function filterOrdersByStatus(status) {
    // data-order-status is set by renderOrders; fall back to the status badge.
    const elements = document.querySelectorAll('#ordersList .ms-order');
    elements.forEach(el => {
        const badge = el.querySelector('.ms-badge');
        const orderStatus = (el.dataset.orderStatus || (badge ? badge.textContent : '') || '')
            .trim()
            .toLowerCase();
        const matches = status === 'all' || orderStatus === String(status).toLowerCase();
        el.style.display = matches ? '' : 'none';
    });
}

async function loadMenuTab() {
    const menuItemsList = document.getElementById('menuItemsList');
    if (!menuItemsList) return;

    menuItemsList.innerHTML =
        '<div class="text-center py-8"><span class="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><p class="text-gray-500 mt-2">Loading menu...</p></div>';

    try {
        const products = await loadMerchantProducts();
        renderMenuItems(products);
    } catch (error) {
        showToast('Failed to load menu', 'error');
        console.error('Menu Error:', error);
    }
}

function bulkDelete() {
    const selectedItems = document.querySelectorAll('#menuItemsList .menu-item-checkbox:checked');
    if (selectedItems.length === 0) {
        showToast('No items selected', 'warning');
        return;
    }

    if (!confirm(`Delete ${selectedItems.length} product${selectedItems.length !== 1 ? 's' : ''}?`))
        return;

    selectedItems.forEach(checkbox => {
        const productId = checkbox.dataset.productId;
        if (productId) deleteMenuItem(productId);
    });

    loadMenuTab();
    showToast(
        `${selectedItems.length} product${selectedItems.length !== 1 ? 's' : ''} deleted`,
        'success'
    );
}

function bulkToggleAvailability() {
    const selectedItems = document.querySelectorAll('#menuItemsList .menu-item-checkbox:checked');
    if (selectedItems.length === 0) {
        showToast('No items selected', 'warning');
        return;
    }

    selectedItems.forEach(checkbox => {
        const productId = checkbox.dataset.productId;
        if (productId) {
            const currentStatus = checkbox.dataset.currentStatus === 'true';
            toggleMenuItemAvailability(productId, !currentStatus);
        }
    });

    loadMenuTab();
    showToast(
        `${selectedItems.length} product${selectedItems.length !== 1 ? 's' : ''} availability toggled`,
        'success'
    );
}

function updateCheckboxStates() {
    const checkboxes = document.querySelectorAll('#menuItemsList .menu-item-checkbox');
    const selectedCount = document.getElementById('selectedCount');
    const bulkActions = document.getElementById('bulkActionsMenu');

    if (!selectedCount || !bulkActions) return;

    const checked = document.querySelectorAll('#menuItemsList .menu-item-checkbox:checked');
    selectedCount.textContent = checked.length;

    if (checked.length > 0) {
        bulkActions.classList.remove('hidden');
    } else {
        bulkActions.classList.add('hidden');
    }
}

function renderMenuItemCheckbox(product) {
    return `
    <div class="flex items-start gap-3">
      <input type="checkbox" class="menu-item-checkbox" data-product-id="${escapeHtml(product.id)}" data-current-status="${product.isActive ? 'true' : 'false'}" onclick="updateCheckboxStates()" ${product.isActive ? 'checked' : ''}>
      <div class="flex-1">
        <p class="font-medium text-gray-800">${escapeHtml(product.name)}</p>
        <p class="text-xs text-gray-500">${escapeHtml(product.description || 'No description')}</p>
      </div>
    </div>
  `;
}

function renderMenuItems(products) {
    const menuItemsList = document.getElementById('menuItemsList');
    if (!products || products.length === 0) {
        menuItemsList.innerHTML =
            '<p class="text-gray-500 text-center py-8">No menu items found</p>';
        return;
    }

    menuItemsList.innerHTML = products
        .map(
            product => `
    <div class="ms-menu-card ms-menu-item" data-category="${escapeHtml(product.category || '')}">
      <div class="ms-menu-body">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <input type="checkbox" class="menu-item-checkbox" data-product-id="${escapeHtml(product.id)}" data-current-status="${product.isActive ? 'true' : 'false'}" onclick="updateCheckboxStates()" ${product.isActive ? 'checked' : ''}>
          </div>
          <div class="flex-1">
            <h3 class="ms-menu-name">${escapeHtml(product.name)}</h3>
            <p class="text-sm text-gray-600 mb-2">${escapeHtml(product.description || 'No description')}</p>
            <div class="flex justify-between items-center">
              <span class="ms-menu-price">TSh ${escapeHtml(product.price)}</span>
              <span class="text-xs ${product.isActive ? 'text-green-600' : 'text-red-600'} font-medium">${escapeHtml(product.isActive ? 'Available' : 'Unavailable')}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">Stock: ${product.stockQuantity ?? product.stock ?? 0}</div>
          </div>
          <div class="ms-menu-actions">
            <button onclick="toggleMenuItemAvailability('${escapeHtml(product.id)}', ${!product.isActive})" class="ms-btn ms-btn-outline" style="font-size:12px;padding:6px 12px;">${escapeHtml(product.isActive ? 'Deactivate' : 'Activate')}</button>
            <button onclick="deleteMenuItem('${escapeHtml(product.id)}')" class="ms-btn ms-btn-danger" style="font-size:12px;padding:6px 12px;">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `
        )
        .join('');
}

async function toggleMenuItemAvailability(productId, newStatus) {
    try {
        const { toggleMenuItemAvailability: apiToggle } =
            await import('./merchant-enhancements.js');
        await apiToggle(productId, newStatus);
        showToast(`Product ${newStatus ? 'activated' : 'deactivated'}`, 'success');
        loadMenuTab();
    } catch (error) {
        showToast('Failed to update product', 'error');
        console.error('Toggle Error:', error);
    }
}

async function deleteMenuItem(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const { deleteMenuItem: apiDelete } = await import('./merchant-enhancements.js');
        await apiDelete(productId);
        showToast('Product deleted successfully', 'success');
        loadMenuTab();
    } catch (error) {
        showToast('Failed to delete product', 'error');
        console.error('Delete Error:', error);
    }
}

function getOrderStatusColor(status) {
    const colors = {
        pending: 'ms-badge-pending',
        accepted: 'ms-badge-preparing',
        preparing: 'ms-badge-preparing',
        ready: 'ms-badge-ready',
        completed: 'ms-badge-delivered',
        delivered: 'ms-badge-delivered',
        cancelled: 'ms-badge-cancelled',
    };
    return colors[status] || 'ms-badge-info';
}

function formatTSh(amount) {
    return 'TSh ' + Math.round(amount || 0).toLocaleString();
}

function emptyRow(message, colspan) {
    return `<tr><td colspan="${colspan || 6}" class="py-4 text-sm text-gray-500">${message}</td></tr>`;
}

async function loadCustomerInsights() {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const cohortEl = document.getElementById('cohortRetentionTable');
    const segmentationEl = document.getElementById('segmentationContent');
    const regionalEl = document.getElementById('regionalBreakdown');
    const bestItemsEl = document.getElementById('bestItemsTable');

    try {
        const { apiGet, apiGetOrders } = await import('./merchant-enhancements.js');
        const [customers, orders] = await Promise.all([
            apiGet('/customers').catch(() => []),
            apiGetOrders(500).catch(() => []),
        ]);

        const validOrders = orders.filter(o => o.status && o.status !== 'cancelled');

        setText('totalCustomers', String(customers.length));
        setText(
            'newCustomers',
            String(
                customers.filter(c => {
                    const d = c.firstOrder || c.createdAt;
                    return d && Date.now() - new Date(d).getTime() < 30 * 86400000;
                }).length
            )
        );

        // Repeat rate = customers with >1 order
        const orderCountByCustomer = {};
        validOrders.forEach(o => {
            const cid = o.customerId || o.customer_id;
            if (cid) orderCountByCustomer[cid] = (orderCountByCustomer[cid] || 0) + 1;
        });
        const repeaters = Object.values(orderCountByCustomer).filter(n => n > 1).length;
        const uniqueCustomers = Object.keys(orderCountByCustomer).length;
        setText(
            'repeatRate',
            uniqueCustomers ? Math.round((repeaters / uniqueCustomers) * 100) + '%' : '0%'
        );

        // Avg LTV
        const totalRevenue = validOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        setText(
            'avgLtv',
            uniqueCustomers ? formatTSh(Math.round(totalRevenue / uniqueCustomers)) : formatTSh(0)
        );

        if (cohortEl) cohortEl.innerHTML = emptyRow('Cohort analytics coming soon.');
        if (segmentationEl)
            segmentationEl.innerHTML =
                '<p class="text-sm text-gray-500">' + customers.length + ' customers tracked.</p>';
        if (regionalEl)
            regionalEl.innerHTML =
                '<p class="text-sm text-gray-500">Regional breakdown coming soon.</p>';
        if (bestItemsEl) bestItemsEl.innerHTML = emptyRow('Product analytics coming soon.', 5);
    } catch (error) {
        console.error('Customer insights error:', error);
        setText('totalCustomers', '0');
        setText('repeatRate', '0%');
        setText('avgLtv', formatTSh(0));
        setText('newCustomers', '0');
    }
}

function renderDashboardChart() {
    loadCustomerInsights();
}

function filterReviews(rating) {
    const reviews = document.querySelectorAll('#reviewsList > div');
    if (!reviews) return;

    reviews.forEach(review => {
        const reviewRating = review.dataset.rating;
        if (rating === 'all' || (reviewRating && parseInt(reviewRating) >= parseInt(rating))) {
            review.style.display = 'block';
        } else {
            review.style.display = 'none';
        }
    });
}

async function loadStaffTab() {
    const listEl = document.getElementById('staffList');
    if (!listEl) return;

    listEl.innerHTML = '<p class="text-sm text-gray-500">Loading staff...</p>';

    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        const data = await apiGet('/staff');
        const staff = Array.isArray(data) ? data : [];

        if (staff.length === 0) {
            listEl.innerHTML =
                '<p class="text-sm text-gray-500">No staff added yet. Add your first team member below.</p>';
            return;
        }

        const roleColors = {
            manager: 'bg-purple-100 text-purple-800',
            cashier: 'bg-blue-100 text-blue-800',
            kitchen: 'bg-orange-100 text-orange-800',
            waiter: 'bg-green-100 text-green-800',
            delivery: 'bg-red-100 text-red-800',
        };

        listEl.innerHTML = staff
            .map(member => {
                const status = member.status || (member.userId ? 'active' : 'invited');
                const inviteBtn = member.inviteCode
                    ? `<button onclick="copyStaffInvite('${escapeHtml(member.inviteCode)}')" class="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs" title="Copy invite link">Copy invite</button>`
                    : '';
                return `
      <div class="flex items-center justify-between py-3 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-gray-600 text-sm">person</span>
          </div>
          <div>
            <span class="font-medium text-sm">${escapeHtml(member.name || 'Unnamed')}</span>
            <p class="text-xs text-gray-500">${escapeHtml(member.email || '')}</p>
            <p class="text-xs ${status === 'active' ? 'text-green-600' : 'text-amber-600'}">${escapeHtml(status)}${member.inviteCode ? ' Â· ' + escapeHtml(member.inviteCode) : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded ${escapeHtml(roleColors[member.role] || 'bg-gray-100 text-gray-800')}">${escapeHtml(member.role || 'staff')}</span>
          <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">${escapeHtml(member.shift || 'full')}</span>
          ${inviteBtn}
          <button onclick="removeStaff('${escapeHtml(member.id)}')" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>`;
            })
            .join('');
    } catch (error) {
        listEl.innerHTML = '<p class="text-sm text-red-600">Error loading staff.</p>';
        console.error('Staff Error:', error);
    }
}

function generateInviteCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'STF-';
    for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return code;
}

async function addStaff() {
    const name = document.getElementById('staffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const role = document.getElementById('staffRole').value;
    const shift = document.getElementById('staffShift').value;
    const posAccess = document.getElementById('staffPosAccess').checked;

    if (!name || !email) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const { apiPost } = await import('./merchant-enhancements.js');
        const capabilities = posAccess ? ['pos.access'] : [];
        // apiPost resolves to the unwrapped `data` payload ({ id, ...doc }), so the
        // invite code is a top-level field - there is no res.success / res.data here.
        const res = await apiPost('/staff', { name, email, role, capabilities });
        const inviteCode = res && res.inviteCode;
        const inviteLink = `${window.location.origin}/signup?staffInvite=${encodeURIComponent(inviteCode || '')}`;

        if (inviteCode && navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(inviteLink);
            } catch (_) {
                /* ignore */
            }
        }

        showToast(`Invite created for ${name}${inviteCode ? '. Link copied.' : ''}`, 'success');
        if (inviteCode)
            alert(
                `Staff invite for ${name}\n\nRole: ${role}\nInvite code: ${inviteCode}\n\nShare this link:\n${inviteLink}`
            );
    } catch (error) {
        console.error('Add staff error:', error);
        showToast('Failed to add staff member', 'error');
        return;
    }

    document.getElementById('staffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffRole').value = 'cashier';
    document.getElementById('staffShift').value = 'morning';
    document.getElementById('staffPosAccess').checked = false;

    loadStaffTab();
}

async function removeStaff(staffId) {
    if (!confirm('Remove this staff member?')) return;

    try {
        const { apiDelete } = await import('./merchant-enhancements.js');
        await apiDelete('/staff/' + staffId);
        showToast('Staff member removed', 'success');
        loadStaffTab();
    } catch (error) {
        console.error('Remove staff error:', error);
        showToast('Failed to remove staff member', 'error');
    }
}

// ── Inventory Tab ─────────────────────────────────────────────
// Ã¢â€â‚¬Ã¢â€â‚¬ Inventory Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function loadInventoryTab() {
    const lowStockItems = document.getElementById('lowStockItems');
    const totalItemsEl = document.getElementById('inventoryTotalItems');
    const totalStockEl = document.getElementById('inventoryTotalStock');
    const categoriesEl = document.getElementById('inventoryCategories');
    const outOfStockEl = document.getElementById('inventoryOutOfStock');

    if (lowStockItems)
        lowStockItems.innerHTML = '<p class="text-sm text-gray-500">Loading inventory...</p>';

    try {
        const { loadMerchantProducts } = await import('./merchant-enhancements.js');
        const products = await loadMerchantProducts();

        let lowStock = [];
        let outOfStock = 0;
        let totalStock = 0;
        const categories = new Set();

        products.forEach(p => {
            const stock = p.stockQuantity !== undefined ? p.stockQuantity : p.stock || 0;
            if (stock === 0) outOfStock++;
            // The API sends `minStock` - `lowStockThreshold` never existed on it.
            if (stock > 0 && stock <= (p.minStock ?? p.lowStockThreshold ?? 5))
                lowStock.push({ ...p, currentStock: stock });
            if (stock > 0) totalStock += stock;
            if (p.category) categories.add(p.category);
        });

        if (lowStockItems) {
            if (lowStock.length === 0) {
                lowStockItems.innerHTML =
                    '<p class="text-sm text-green-600">All products are well stocked!</p>';
            } else {
                lowStockItems.innerHTML = lowStock
                    .map(
                        p => `
          <div class="ms-stat" style="padding:8px 12px;">
            <div>
              <p class="text-sm font-medium">${escapeHtml(p.name)}</p>
              <p class="text-xs text-yellow-600">Only ${p.currentStock} left</p>
            </div>
            <button onclick="quickAddStockForItem('${escapeHtml(p.id)}', 10)" class="ms-btn ms-btn-outline" style="font-size:11px;padding:4px 8px;">+10</button>
          </div>
        `
                    )
                    .join('');
            }
        }

        if (totalItemsEl) totalItemsEl.textContent = products.length;
        if (totalStockEl) totalStockEl.textContent = totalStock;
        if (categoriesEl) categoriesEl.textContent = categories.size;
        if (outOfStockEl) outOfStockEl.textContent = outOfStock;
    } catch (error) {
        console.error('Inventory load error:', error);
        if (lowStockItems)
            lowStockItems.innerHTML =
                '<p class="text-sm text-gray-500">No inventory data available</p>';
        if (totalItemsEl) totalItemsEl.textContent = '0';
        if (totalStockEl) totalStockEl.textContent = '0';
        if (categoriesEl) categoriesEl.textContent = '0';
        if (outOfStockEl) outOfStockEl.textContent = '0';
    }
}

async function updateProductStock(productId, newStock) {
    // PUT /products/:id silently ignores stockQuantity - stock only moves through
    // the inventory ledger, so send the difference as an adjustment.
    const { loadMerchantProducts, apiPost } = await import('./merchant-enhancements.js');
    const products = await loadMerchantProducts();
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    const current =
        product.stockQuantity !== undefined ? product.stockQuantity : product.stock || 0;
    const target = Number(newStock);
    if (!Number.isFinite(target)) throw new Error('Invalid stock quantity');
    const delta = target - current;
    if (delta === 0) {
        showToast(`Stock is already ${target}`, 'info');
        return;
    }
    const res = await apiPost('/inventory/adjust', {
        productId,
        delta,
        type: 'adjustment',
        reason: 'Stock correction',
    });
    const newQty = res && res.newStock != null ? res.newStock : target;
    showToast(`Stock updated to ${newQty}`, 'success');
}

async function quickAddStockForItem(productId, qty) {
    try {
        const { loadMerchantProducts, apiPost } = await import('./merchant-enhancements.js');
        const products = await loadMerchantProducts();
        const product = products.find(p => p.id === productId);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }
        const current =
            product.stockQuantity !== undefined ? product.stockQuantity : product.stock || 0;
        // -1 means "unlimited": restocking sets the count instead of adding to it.
        const target = current < 0 ? qty : current + qty;
        const delta = target - current;
        if (!delta) {
            showToast('Enter a valid quantity', 'warning');
            return;
        }
        const res = await apiPost('/inventory/adjust', {
            productId,
            delta,
            type: 'adjustment',
            reason: `Quick restock +${qty}`,
        });
        const newStock = res && res.newStock != null ? res.newStock : target;
        showToast(`Restocked +${qty} units (now ${newStock})`, 'success');
        loadInventoryTab();
    } catch (error) {
        console.error('Quick restock error:', error);
        showToast('Failed to restock', 'error');
    }
}

async function quickAddStock() {
    const nameInput = document.getElementById('supplierProductName');
    const qtyInput = document.getElementById('supplierQuantity');
    const unitInput = document.getElementById('supplierUnit');
    const name = nameInput?.value?.trim();
    const qty = parseInt(qtyInput?.value) || 0;

    if (!name || qty <= 0) {
        showToast('Enter a product name and valid quantity', 'warning');
        return;
    }

    try {
        const { loadMerchantProducts, apiPost } = await import('./merchant-enhancements.js');
        const products = await loadMerchantProducts();
        const product = products.find(p => (p.name || '').toLowerCase() === name.toLowerCase());

        if (!product) {
            showToast('Product not found â€” check the name', 'warning');
            return;
        }

        const current =
            product.stockQuantity !== undefined ? product.stockQuantity : product.stock || 0;
        const target = current < 0 ? qty : current + qty;
        const delta = target - current;
        const res = await apiPost('/inventory/adjust', {
            productId: product.id,
            delta,
            type: 'adjustment',
            reason: `Supplier delivery +${qty} ${unitInput?.value || 'units'}`,
        });
        const newStock = res && res.newStock != null ? res.newStock : target;
        showToast(
            `+${qty} ${unitInput?.value || 'units'} added to ${name} (now ${newStock})`,
            'success'
        );
        loadInventoryTab();
    } catch (error) {
        console.error('Quick add stock error:', error);
        showToast('Failed to add stock', 'error');
    }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Delivery Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function loadDeliveryTab() {
    await Promise.all([loadAvailableDrivers(), loadAssignableOrders(), loadActiveDeliveries()]);
}

function isDriverOnline(d) {
    if (!d) return false;
    if (d.available === false && !d.isOnline && d.status !== 'online') return false;
    return (
        d.isOnline === true ||
        d.available === true ||
        d.isActive === true ||
        d.status === 'online' ||
        d.status === 'active'
    );
}

async function loadAvailableDrivers() {
    const container = document.getElementById('availableDrivers');
    if (container) container.innerHTML = '<p class="text-sm text-gray-500">Loading drivers...</p>';

    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        // apiGet already unwrapped `data`, so the payload itself is the driver array.
        const res = await apiGet('/drivers');
        const drivers = (Array.isArray(res) ? res : (res && res.data) || []).filter(
            d => !d.currentOrderId && !d.current_order_id
        );
        renderAvailableDrivers(drivers);
    } catch (error) {
        console.error('Load drivers error:', error);
        if (container)
            container.innerHTML = '<p class="text-sm text-gray-500">No drivers available</p>';
    }
}

function renderAvailableDrivers(drivers) {
    const container = document.getElementById('availableDrivers');
    const driverSelect = document.getElementById('driverSelect');

    if (container) {
        if (!drivers || drivers.length === 0) {
            container.innerHTML =
                '<p class="text-sm text-gray-500">No drivers currently online</p>';
        } else {
            container.innerHTML = drivers
                .map(
                    d => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <div>
              <p class="text-sm font-medium">${escapeHtml(d.name || d.displayName || 'Driver')}</p>
              <p class="text-xs text-gray-500">${escapeHtml(d.vehicleType || d.phone || '')}</p>
            </div>
          </div>
          <span class="text-xs text-green-600 font-medium">Online</span>
        </div>
      `
                )
                .join('');
        }
    }

    if (driverSelect) {
        driverSelect.innerHTML =
            '<option value="">Select Driver</option>' +
            (drivers || [])
                .map(
                    d =>
                        `<option value="${escapeHtml(d.id)}" data-name="${escapeHtml(d.name || d.displayName || '')}">${escapeHtml(d.name || d.displayName || d.id)}</option>`
                )
                .join('');
    }
}

async function loadAssignableOrders() {
    const orderInput = document.getElementById('orderIdInput');
    if (!orderInput) return;

    try {
        const { apiGetOrders } = await import('./merchant-enhancements.js');
        const orders = await apiGetOrders(100);
        const assignable = orders.filter(o => {
            const s = String(o.status || '').toLowerCase();
            return (
                [
                    'ready',
                    'ready_for_delivery',
                    'preparing',
                    'confirmed',
                    'accepted',
                    'pending',
                ].includes(s) &&
                !o.driverId &&
                !o.driver_id
            );
        });

        // Upgrade free-text input to a select for easier assignment
        if (orderInput.tagName === 'INPUT') {
            const select = document.createElement('select');
            select.id = 'orderIdInput';
            select.className = orderInput.className;
            orderInput.replaceWith(select);
        }
        const orderSelect = document.getElementById('orderIdInput');
        if (orderSelect) {
            orderSelect.innerHTML =
                '<option value="">Select order to assign</option>' +
                assignable
                    .map(
                        o =>
                            `<option value="${escapeHtml(o.id)}">#${escapeHtml(String(o.id).slice(-8))} Â· TSh ${Number(o.total || 0).toLocaleString()} Â· ${escapeHtml(o.customerName || 'Customer')}</option>`
                    )
                    .join('');
        }
    } catch (error) {
        console.error('Load assignable orders error:', error);
    }
}

async function loadActiveDeliveries() {
    try {
        const { apiGetOrders } = await import('./merchant-enhancements.js');
        const orders = await apiGetOrders(500).catch(() => []);
        const delivering = orders.filter(o => {
            const s = String(o.status || '').toLowerCase();
            return [
                'assigned',
                'picked_up',
                'on_the_way',
                'delivering',
                'out_for_delivery',
                'dispatched',
            ].includes(s);
        }).length;

        const activeEl = document.getElementById('activeDeliveries');
        if (activeEl) activeEl.textContent = String(delivering);
        const etaEl = document.getElementById('deliveryEta');
        if (etaEl) etaEl.textContent = delivering > 0 ? '~30 min' : '00:00';
    } catch (error) {
        console.error('Load active deliveries error:', error);
        const activeEl = document.getElementById('activeDeliveries');
        if (activeEl) activeEl.textContent = '0';
    }
}

async function assignDriver() {
    const orderIdInput = document.getElementById('orderIdInput');
    const driverSelect = document.getElementById('driverSelect');
    const orderId = orderIdInput?.value?.trim();
    const driverId = driverSelect?.value;
    const driverName =
        driverSelect?.selectedOptions?.[0]?.dataset?.name ||
        driverSelect?.selectedOptions?.[0]?.textContent ||
        '';

    if (!orderId || !driverId) {
        showToast('Select an Order and a Driver', 'warning');
        return;
    }

    await assignDriverToOrder(orderId, driverId, driverName);
    if (orderIdInput) orderIdInput.value = '';
}

async function assignDriverToOrder(orderId, driverId, driverName = '') {
    try {
        const { apiPost } = await import('./merchant-enhancements.js');
        await apiPost('/orders/' + orderId + '/assign-driver', { driverId, driverName });
        showToast('Driver assigned to order', 'success');
        loadDeliveryTab();
    } catch (error) {
        console.error('Assign driver error:', error);
        showToast('Failed to assign driver', 'error');
    }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Finance Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

let financeOrders = [];

async function loadFinance() {
    const finance = await import('./merchant-finance.js');
    return finance.loadFinance();
}

async function requestPayout() {
    return loadFinance();
}

// Promotions and Reviews tabs are implemented by global functions in
// merchant.html's inline script (loadPromotions/loadReviews/etc.);
// the module must NOT shadow them with local stubs.

window.updateOrderStatus ||= updateOrderStatus;
window.loadKPIs = loadKPIs;
window.selectOrder ||= selectOrder;
window.filterOrdersByStatus ||= filterOrdersByStatus;
window.updateOrderStatusFromDetail = updateOrderStatusFromDetail;
window.toggleMenuItemAvailability = toggleMenuItemAvailability;
window.deleteMenuItem ||= deleteMenuItem;
window.switchTab ||= switchTab;
window.navigateTo = navigateTo;
window.merchantSearch = merchantSearch;
window.loadOrdersTab = loadOrdersTab;
window.loadMenuTab = loadMenuTab;
window.loadAnalyticsTab = loadAnalyticsTab;
window.loadCustomerInsights = loadCustomerInsights;
window.loadInventoryTab = loadInventoryTab;
window.loadDeliveryTab = loadDeliveryTab;
window.loadStaffTab = loadStaffTab;
window.quickAddStock = quickAddStock;
window.quickAddStockForItem = quickAddStockForItem;
window.assignDriver = assignDriver;
window.assignDriverToOrder = assignDriverToOrder;
window.addStaff = addStaff;
window.removeStaff = removeStaff;
window.loadFinance = loadFinance;
window.requestPayout ||= requestPayout;
window.copyStaffInvite = function (code) {
    const link = `${window.location.origin}/signup?staffInvite=${encodeURIComponent(code)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(link)
            .then(() => showToast('Invite link copied', 'success'))
            .catch(() => alert(link));
    } else {
        alert(link);
    }
};

// Gamification Integration
let gamificationInstance = null;

// Initialize gamification
function initGamificationIntegration() {
    // window.currentSeller / window.currentUser are populated asynchronously
    // (auth-check.js + seller resolution). Retry briefly instead of warning
    // on the very first tick when they are not yet available.
    const tryInit = attemptsLeft => {
        const hasUser = !!(window.currentSeller?.id || window.currentUser?.uid);
        if (hasUser) {
            gamificationInstance = initGamification();
            if (gamificationInstance) {
                // Real Gamification API: loadProgress / checkAllBadges
                gamificationInstance.loadProgress?.();
                gamificationInstance.checkAllBadges?.();
            }
            return;
        }
        if (attemptsLeft > 0) {
            setTimeout(() => tryInit(attemptsLeft - 1), 1000);
        }
        // Silently give up after retries — gamification is optional; a console
        // warning here just polluted the dashboard logs for logged-out viewers.
    };
    tryInit(10);
}

// Update badge display
function updateBadgeDisplay() {
    if (!gamificationInstance) return;

    // Update sidebar badge count
    const earnedBadges = gamificationInstance.getEarnedBadges?.() || [];
    const badgeCount = earnedBadges.length;
    const totalBadges = gamificationInstance.getAllBadges?.().length || 0;
    if (badgeCount === 0 || totalBadges === 0) return;

    // Update badge progress for each badge (calculateBadgeProgress → 0..1 fraction)
    gamificationInstance.getAllBadges().forEach(badge => {
        const progress = gamificationInstance.calculateBadgeProgress?.(badge) || 0;
        if (progress > 0) {
            console.log(`Badge ${badge.title}: ${Math.round(progress * 100)}%`);
        }
    });
}

// Get average rating from reviews
async function getAverageRating() {
    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        const res = await apiGet('/reviews');
        const reviews = Array.isArray(res) ? res : [];
        if (reviews.length === 0) return 0;
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        return (totalRating / reviews.length).toFixed(2);
    } catch (error) {
        console.error('Error getting average rating:', error);
        return 0;
    }
}

// Record order completion with gamification
async function recordOrderCompletion(order) {
    if (!gamificationInstance) return;

    // Real Gamification API: recordOrderCompletion(order)
    gamificationInstance.recordOrderCompletion?.(order);

    // Update badge display
    updateBadgeDisplay();
}

// Record rating completion
async function recordRatingCompletion(rating) {
    if (!gamificationInstance) return;

    // Record rating
    gamificationInstance.recordRating?.(rating);

    // Update badge display
    updateBadgeDisplay();
}

// Open badge modal
function openBadgeModal() {
    const modal = document.getElementById('badgeModal');
    if (!modal) return;

    // Get earned badges (real API: getAllBadges + earned filter — no
    // getUnearnedBadges/getStreakInfo on the Gamification class)
    const earnedBadges = gamificationInstance.getEarnedBadges?.() || [];
    const unearnedBadges = (gamificationInstance.getAllBadges?.() || []).filter(b => !b.achieved);
    const streakInfo = gamificationInstance.getStreakInfo?.() || {
        currentStreak: 0,
        longestStreak: 0,
    };

    // Generate badge list HTML
    let html = `
    <div class="space-y-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg">Your Badges</h3>
        <span class="text-sm text-gray-500">${earnedBadges.length}/${gamificationInstance.getAllBadges().length} earned</span>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
  `;

    gamificationInstance.getAllBadges().forEach(badge => {
        const earned = badge.achieved;
        const progress = gamificationInstance.calculateBadgeProgress?.(badge) || 0;

        html += `
      <div class="p-4 rounded-xl border ${earned ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-lg ${badge.color} flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-white text-2xl">${badge.icon}</span>
          </div>
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">${badge.title}</h4>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2">${badge.description}</p>
            ${
                earned
                    ? `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mt-2">Earned</span>`
                    : `<div class="mt-2">
                     <div class="flex justify-between text-xs mb-1">
                       <span class="text-gray-500">Progress</span>
                       <span class="font-medium text-primary">${Math.round(progress * 100)}%</span>
                     </div>
                     <div class="w-full bg-gray-200 rounded-full h-1.5">
                       <div class="${badge.color} h-1.5 rounded-full" style="width: ${Math.round(progress * 100)}%"></div>
                     </div>
                   </div>`
            }
          </div>
        </div>
      </div>
    `;
    });

    const unearnedBadgesHtml =
        unearnedBadges.length > 0
            ? `
      <div class="mt-4 pt-4 border-t border-gray-200">
        <h3 class="font-medium mb-2">Unearned Badges</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          ${unearnedBadges
              .map(
                  badge => `
            <div class="ms-card" style="padding:12px;opacity:0.75;">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-gray-400">${badge.icon}</span>
                <span class="text-sm font-medium text-gray-700">${badge.title}</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">${badge.description}</p>
            </div>
          `
              )
              .join('')}
        </div>
      </div>`
            : '';

    html += `
      </div>
      
      ${unearnedBadgesHtml}
      
      <div class="mt-6 pt-4 border-t border-gray-200">
        <h3 class="font-bold text-lg mb-3">Streak Progress</h3>
        <div class="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
          <div class="flex items-center gap-3 mb-2">
            <span class="material-symbols-outlined text-2xl">fire</span>
            <div>
              <p class="font-bold text-xl">${streakInfo.currentStreak} Day Streak</p>
              <p class="text-sm text-orange-100">Current</p>
            </div>
            <div class="ml-auto">
              <p class="text-sm text-orange-100">Longest: ${streakInfo.longestStreak} days</p>
            </div>
          </div>
          <div class="w-full bg-white/30 rounded-full h-2">
            <div class="bg-white h-2 rounded-full" style="width: ${(Math.min(streakInfo.currentStreak, 30) / 30) * 100}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;

    document.querySelector('#badgeModal .p-6').innerHTML = html;
    modal.classList.remove('hidden');
}

// Close badge modal
function closeBadgeModal() {
    const modal = document.getElementById('badgeModal');
    if (modal) modal.classList.add('hidden');
}

// Initialize gamification when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initGamificationIntegration();
});

// ============================================================
// PROMO CODE API CONSUMER
// ============================================================

/**
 * Load all active promotions for the merchant
 * (delegates to the merchant-OS API: GET /api/merchant/promos)
 */
async function loadPromotionsFromApi() {
    try {
        const { loadPromotions } = await import('./merchant-enhancements.js');
        const promos = await loadPromotions();
        renderPromotionsList(promos);
        return promos;
    } catch (error) {
        console.error('Load promotions error:', error);
        showToast('Failed to load promotions', 'error');
        return [];
    }
}

/**
 * Validate a promo code against the backend
 * @param {string} code - The promo code to validate
 * @param {number} orderAmount - The order total amount
 * @returns {Promise<{valid: boolean, discount: number, message: string}>}
 */
async function validatePromoCode(code, orderAmount) {
    try {
        const { getAuthToken } = await import('./merchant-enhancements.js');
        const response = await fetch(
            `/api/promotions/${encodeURIComponent(code)}?amount=${orderAmount}`,
            {
                headers: { Authorization: `Bearer ${(await getAuthToken()) || ''}` },
            }
        );
        if (!response.ok) {
            if (response.status === 404)
                return { valid: false, discount: 0, message: 'Promo code not found' };
            throw new Error('Failed to validate promo');
        }
        const result = await response.json();
        return {
            valid: result.valid,
            discount: result.discount || 0,
            message: result.message || '',
        };
    } catch (error) {
        console.error('Validate promo error:', error);
        return { valid: false, discount: 0, message: 'Validation error' };
    }
}

/**
 * Render promotions list in the UI
 * @param {Array} promotions - Promotion data from API
 */
function renderPromotionsList(promotions) {
    const promoList = document.getElementById('activePromosList');
    if (!promoList) return;

    if (!promotions || promotions.length === 0) {
        promoList.innerHTML =
            '<p class="text-sm text-gray-500">You currently have no active promotions.</p>';
        return;
    }

    promoList.innerHTML = promotions
        .map(promo => {
            // GET /promos maps to { id, code, discount, maxUses, minOrder, expiresAt,
            // isActive, createdAt }: it carries no discountType and no usage counter,
            // so derive the label from the amount (anything above 100 is a TZS amount).
            const discount = Number(promo.discount ?? promo.discountValue ?? 0);
            const discountLabel =
                discount > 100 ? 'TSh ' + discount.toLocaleString() : discount + '%';
            const maxUses = promo.maxUses ?? promo.maxUsages ?? null;
            const minOrder = Number(promo.minOrder ?? promo.minOrderValue ?? 0);
            return `
    <div class="ms-card" style="padding:12px 16px;">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-green-600">star</span>
          <div>
            <p class="font-medium">${escapeHtml(promo.code || promo.promoCode || 'PROMO')}</p>
            <p class="text-xs text-gray-500">${escapeHtml(discountLabel)}${minOrder > 0 ? ' (min order TSh ' + escapeHtml(minOrder.toLocaleString()) + ')' : ''}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-500">${maxUses != null ? escapeHtml(maxUses) + ' max uses' : ''}</p>
          <p class="text-xs ${(promo.isActive ?? promo.is_active) ? 'text-green-600' : 'text-gray-500'}">
            ${(promo.isActive ?? promo.is_active) ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
    </div>
  `;
        })
        .join('');
}

/**
 * Create a new promo code
 * @param {Object} promoData - {code, discount, discountType, maxUses, minOrder, expiresAt, isActive}
 */
async function createPromoCode(promoData) {
    try {
        const { createPromoCode: apiCreate } = await import('./merchant-enhancements.js');
        const id = await apiCreate({
            code: promoData.code || promoData.promoCode,
            discount: promoData.discount ?? promoData.discountValue,
            discountType: promoData.discountType,
            maxUses: promoData.maxUses ?? promoData.maxUsages,
            minOrder: promoData.minOrder ?? promoData.minOrderValue,
            expiresAt: promoData.expiresAt ?? promoData.endDate,
            isActive: promoData.isActive !== false,
        });
        showToast('Promo code created successfully', 'success');
        loadPromotionsFromApi(); // Refresh list
        return id;
    } catch (error) {
        console.error('Create promo error:', error);
        showToast('Failed to create promo code', 'error');
        throw error;
    }
}

/**
 * Update an existing promo code
 * @param {string} promoId - The promo document ID to update
 * @param {Object} updates - Partial promo data to update
 */
async function updatePromoCode(promoId, updates) {
    try {
        const { updatePromoCode: apiUpdate } = await import('./merchant-enhancements.js');
        await apiUpdate(promoId, updates);
        showToast('Promo code updated successfully', 'success');
        loadPromotionsFromApi(); // Refresh list
    } catch (error) {
        console.error('Update promo error:', error);
        showToast('Failed to update promo code', 'error');
        throw error;
    }
}

/**
 * Delete a promo code
 * @param {string} promoId - The promo document ID to delete
 */
async function deletePromoCode(promoId) {
    if (!confirm('Delete this promo code?')) return;
    try {
        const { deletePromoCode: apiDelete } = await import('./merchant-enhancements.js');
        await apiDelete(promoId);
        showToast('Promo code deleted', 'success');
        loadPromotionsFromApi(); // Refresh list
    } catch (error) {
        console.error('Delete promo error:', error);
        showToast('Failed to delete promo code', 'error');
    }
}

// ============================================================
// PAYOUT REQUEST API CONSUMER
// ============================================================

/**
 * Fetch the merchant's available balance
 */
async function fetchAvailableBalance() {
    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        const data = await apiGet('/balance').catch(() => null);
        return (data && (data.availableBalance ?? 0)) || 0;
    } catch (error) {
        console.error('Fetch balance error:', error);
        return 0;
    }
}

/**
 * Load payout history for the merchant
 */
async function loadPayoutHistory() {
    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        // apiGet unwraps the `data` payload already — the result IS the array.
        const rows = await apiGet('/payouts');
        const payouts = Array.isArray(rows)
            ? rows
            : rows && Array.isArray(rows.data)
              ? rows.data
              : [];
        renderPayoutHistory(payouts);
        return payouts;
    } catch (error) {
        console.error('Load payout history error:', error);
        renderPayoutHistory([]);
        return [];
    }
}

/**
 * Render payout history in UI
 * @param {Array} payouts - Payout request data
 */
function renderPayoutHistory(payouts) {
    // Dedicated payout history container; fall back to the legacy
    // pendingMMOrders slot when the new card is absent.
    const historyContainer =
        document.getElementById('payoutHistory') || document.getElementById('pendingMMOrders');
    if (!historyContainer) return;

    if (payouts.length === 0) {
        historyContainer.innerHTML =
            '<p class="text-sm text-gray-500 text-center py-4">No payout requests yet</p>';
        return;
    }

    historyContainer.innerHTML = payouts
        .map(p => {
            const status = String(p.status || 'pending').toLowerCase();
            const statusColor =
                status === 'pending'
                    ? 'text-yellow-600'
                    : status === 'paid' || status === 'approved' || status === 'completed'
                      ? 'text-green-600'
                      : 'text-red-600';
            return `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-blue-600">request_payment</span>
        <div>
          <p class="font-medium">TSh ${(Number(p.amount) || 0).toLocaleString()}</p>
          <p class="text-xs text-gray-500">${escapeHtml(status.toUpperCase())}${p.createdAt ? ' · ' + new Date(p.createdAt).toLocaleDateString() : ''}</p>
        </div>
      </div>
      <span class="text-sm ${statusColor}">
        ${escapeHtml(status)}
      </span>
    </div>
  `;
        })
        .join('');
}

// ============================================================
// CUSTOMER MANAGEMENT API CONSUMER
// ============================================================

/**
 * Load all customers for the merchant
 */
async function loadCustomersFromApi() {
    try {
        const response = await fetch('/api/customers', {
            headers: { Authorization: `Bearer ${window.auth?.currentUser?.uid || ''}` },
        });
        if (!response.ok) throw new Error('Failed to load customers');
        const customers = await response.json();
        renderCustomersList(customers);
        return customers;
    } catch (error) {
        console.error('Load customers error:', error);
        showToast('Failed to load customers', 'error');
        return [];
    }
}

/**
 * Get a specific customer profile
 * @param {string} userId - Firebase user ID
 */
async function getCustomerProfile(userId) {
    try {
        const response = await fetch(`/api/customers/${userId}`, {
            headers: { Authorization: `Bearer ${window.auth?.currentUser?.uid || ''}` },
        });
        if (!response.ok) throw new Error('Failed to get customer');
        return await response.json();
    } catch (error) {
        console.error('Get customer profile error:', error);
        return null;
    }
}

/**
 * Search customers by name or email
 * @param {string} query - Search query
 */
async function searchCustomers(query) {
    try {
        const response = await fetch(`/api/customers/search?query=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${window.auth?.currentUser?.uid || ''}` },
        });
        if (!response.ok) throw new Error('Failed to search customers');
        return await response.json();
    } catch (error) {
        console.error('Search customers error:', error);
        return [];
    }
}

/**
 * Render customers list in UI
 * @param {Array} customers - Customer data from API
 */
function renderCustomersList(customers) {
    const customerList = document.getElementById('customerList');
    if (!customerList) return;

    if (customers.length === 0) {
        customerList.innerHTML = '<p class="text-sm text-gray-500">No customers found</p>';
        return;
    }

    customerList.innerHTML = customers
        .map(
            c => `
    <div class="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined">person</span>
          <div>
            <p class="font-medium">${escapeHtml(c.name || 'Unknown')}</p>
            <p class="text-xs text-gray-500">${escapeHtml(c.email || '')}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold">${formatTSh(c.lifetimeSpend || 0)}</p>
          <p class="text-xs text-gray-500">Lifetime Spend</p>
        </div>
      </div>
    </div>
  `
        )
        .join('');
}

/**
 * Open customer detail view
 * @param {string} userId - Firebase user ID
 */
async function openCustomerDetail(userId) {
    const customer = await getCustomerProfile(userId);
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }

    // Show in a modal or navigate to detail page
    const modalHtml = `
    <div class="ms-modal" style="max-width:480px;">
      <div class="ms-modal-header">
        <h3 class="ms-modal-title">${escapeHtml(customer.name || 'Customer Details')}</h3>
        <button onclick="this.closest('.ms-modal').remove()" class="ds-icon-btn" style="width:32px;height:32px;" aria-label="Close"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
      </div>
      <div class="ms-modal-body">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p class="text-gray-500">Customer ID:</p><p class="font-medium">${escapeHtml(customer.userId || 'N/A')}</p></div>
          <div><p class="text-gray-500">Email:</p><p class="font-medium">${escapeHtml(customer.email || 'N/A')}</p></div>
          <div><p class="text-gray-500">Phone:</p><p class="font-medium">${escapeHtml(customer.phone || 'N/A')}</p></div>
          <div><p class="text-gray-500">Address:</p><p class="font-medium">${escapeHtml(customer.address || 'N/A')}</p></div>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-gray-500">Order History:</p>
          <p class="font-medium">${customer.totalOrders} orders</p>
          <p class="text-gray-500">Lifetime Spend: ${formatTSh(customer.lifetimeSpend || 0)}</p>
          <p class="text-gray-500">Tier: ${customer.tier || 'NEW'}</p>
        </div>
        <div class="ms-modal-footer">
          <button onclick="this.closest('.ms-modal').remove()" class="ms-btn ms-btn-primary" style="width:100%;justify-content:center;">Close</button>
        </div>
      </div>
    </div>
  `;

    // Show in alert or insert into page
    showToast(`Customer detail loaded`, 'info');
    // Could also navigate to a customer detail page
}

// ============================================================
// REAL-TIME DRIVER TRACKING API CONSUMER
// ============================================================

/**
 * Initialize WebSocket connection for real-time driver tracking
 */
function initDriverWebSocket() {
    if (!window.WebSocket) {
        console.warn('WebSocket not supported');
        return null;
    }

    const ws = new WebSocket(`ws://${location.host}/ws`);

    ws.onopen = () => {
        console.log('WebSocket connected for driver tracking');
    };

    ws.onmessage = event => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'location' && data.riderId && data.latitude && data.longitude) {
                updateDriverLocation(data.riderId, data.latitude, data.longitude);
            } else if (data.type === 'status') {
                updateDriverStatus(data.riderId, data.status, data.onlineSince);
            } else if (data.type === 'activeOrders') {
                updateActiveOrdersCount(data.count);
            }
        } catch (e) {
            console.error('WebSocket message parse error:', e);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected for driver tracking');
        // Attempt reconnection after 3 seconds
        setTimeout(initDriverWebSocket, 3000);
    };

    ws.onerror = error => {
        console.error('WebSocket error for driver tracking:', error);
    };

    return ws;
}

/**
 * Update driver location on the UI
 * @param {string} riderId - The rider driver ID
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 */
function updateDriverLocation(riderId, latitude, longitude) {
    // Update the driver in the available drivers list
    const driverItem = document.querySelector(`[data-rider-id="${riderId}"]`);
    if (driverItem) {
        const locationSpan = driverItem.querySelector('.driver-location');
        if (locationSpan) {
            locationSpan.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        }
    }

    // Update active deliveries count
    const activeDeliveriesEl = document.getElementById('activeDeliveries');
    if (activeDeliveriesEl) {
        activeDeliveriesEl.textContent = parseInt(activeDeliveriesEl.textContent) + 1;
    }

    // Update ETA (simulated)
    const deliveryEtaEl = document.getElementById('deliveryEta');
    if (deliveryEtaEl) {
        const minutes = Math.floor(
            Math.sqrt(Math.pow(latitude - 20.7984, 2) + Math.pow(longitude - 31.1656, 2)) * 2
        );
        deliveryEtaEl.textContent = `${minutes}m`;
    }
}

/**
 * Update driver status on the UI
 * @param {string} riderId - The rider driver ID
 * @param {string} status - 'ONLINE' | 'OFFLINE' | 'BUSY'
 * @param {string} onlineSince - Timestamp string
 */
function updateDriverStatus(riderId, status, onlineSince) {
    const driverItem = document.querySelector(`[data-rider-id="${riderId}"]`);
    if (!driverItem) return;

    // Update status badge
    const statusBadge = driverItem.querySelector('.driver-status');
    if (statusBadge) {
        const statusColors = {
            ONLINE: 'bg-green-600',
            OFFLINE: 'bg-gray-500',
            BUSY: 'bg-yellow-500',
        };
        statusBadge.style.background = statusColors[status] || 'gray';
        statusBadge.textContent = status;
    }

    // Update online since time
    const sinceEl = driverItem.querySelector('.driver-since');
    if (sinceEl && onlineSince) {
        sinceEl.textContent = onlineSince ? new Date(onlineSince).toLocaleTimeString() : 'Unknown';
    }
}

/**
 * Update active orders count
 * @param {number} count - Number of active deliveries
 */
function updateActiveOrdersCount(count) {
    const activeDeliveriesEl = document.getElementById('activeDeliveries');
    if (activeDeliveriesEl) {
        activeDeliveriesEl.textContent = count;
    }
}

// ============================================================
// ADVANCED ANALYTICS EXPORT API CONSUMER
// ============================================================

/**
 * Export analytics data as CSV
 * @param {string} period - '7', '30', or '90' days
 */
async function exportAnalyticsCSV(period = '30', type = 'orders') {
    try {
        const { getAuthToken } = await import('./merchant-enhancements.js');
        const token = await getAuthToken();
        const response = await fetch(
            `/api/merchant/analytics/export?range=${period}&type=${type}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (!response.ok) throw new Error('Failed to export analytics');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartsoko_${type}_${period}days.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast(`Analytics (${type}) exported for ${period} days`, 'success');
    } catch (error) {
        console.error('Export analytics CSV error:', error);
        showToast('Failed to export analytics', 'error');
    }
}

/**
 * Export analytics data as PDF report — server has no PDF renderer, so
 * open a printable window from the live dashboard data instead.
 */
async function exportAnalyticsPDF() {
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error('Popup blocked');
        printWindow.document.write(`
      <html><head><title>Smartsoko Analytics Report</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; } table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .kpi { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
               padding: 12px 18px; margin: 4px; }
        .kpi b { display: block; font-size: 18px; margin-top: 2px; }
      </style></head><body>
      <h1>Smartsoko Analytics Report</h1>
      <p>Generated ${new Date().toLocaleString()}</p>
      <div id="kpis"></div>
      <table id="rows"></table>
      <script>
        // Parent window exposes the current analytics state before printing.
        window.addEventListener('DOMContentLoaded', () => {
          const d = window.opener && window.opener.__analyticsSnapshot;
          if (!d) { document.getElementById('kpis').innerHTML = '<p>No analytics data available.</p>'; return; }
          document.getElementById('kpis').innerHTML =
            '<div class="kpi">Revenue<b>TSh ' + (d.revenue||0).toLocaleString() + '</b></div>' +
            '<div class="kpi">Orders<b>' + (d.orders||0) + '</b></div>' +
            '<div class="kpi">Avg Order<b>TSh ' + (d.aov||0).toLocaleString() + '</b></div>';
          const rows = d.recentOrders || [];
          document.getElementById('rows').innerHTML =
            '<tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr>' +
            rows.map(r => '<tr><td>' + (r.id||'') + '</td><td>' + (r.createdAt||'') + '</td><td>' +
              (r.customerName||'') + '</td><td>' + (r.total||0) + '</td><td>' + (r.status||'') + '</td></tr>').join('');
        });
        setTimeout(() => window.print(), 400);
      <\/script>
      </body></html>`);
        printWindow.document.close();
        showToast('Print dialog opened — save as PDF', 'success');
    } catch (error) {
        console.error('Export analytics PDF error:', error);
        showToast('Failed to open print view', 'error');
    }
}

/**
 * Fetch dashboard analytics data
 * @param {string} period - '7', '30', or '90' days
 * @returns {Promise<Object>} Analytics data object
 */
async function fetchDashboardAnalytics(period = '30') {
    try {
        const response = await fetch(`/api/analytics/dashboard?period=${period}`, {
            headers: { Authorization: `Bearer ${window.auth?.currentUser?.uid || ''}` },
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard analytics');
        return await response.json();
    } catch (error) {
        console.error('Fetch dashboard analytics error:', error);
        return null;
    }
}

/**
 * Render dashboard analytics on the UI
 * @param {Object} data - Analytics data from API
 */
function renderDashboardAnalytics(data) {
    if (!data) return;

    // Revenue chart data
    const revenueData = data.revenueByDay || [];
    const labels = revenueData.map(d => d.date.split('T')[0]);
    const revenueValues = revenueData.map(d => d.totalRevenue || 0);

    // Update KPI cards
    const kpiElements = {
        totalRevenue: document.getElementById('totalRevenue'),
        totalOrders: document.getElementById('totalOrdersKpi'),
        avgOrderValue: document.getElementById('aovKpi'),
        newCustomers: document.getElementById('newCustomersKpi'),
    };

    if (kpiElements.totalRevenue)
        kpiElements.totalRevenue.textContent = `TSh ${(data.totalRevenue || 0).toLocaleString()}`;
    if (kpiElements.totalOrders) kpiElements.totalOrders.textContent = data.totalOrders || 0;
    if (kpiElements.avgOrderValue)
        kpiElements.avgOrderValue.textContent = `TSh ${(data.totalRevenue / (data.totalOrders || 1) || 0).toLocaleString()}`;
    if (kpiElements.newCustomers) kpiElements.newCustomers.textContent = data.newCustomers || 0;
}

// ============================================================
// ORDER SEARCH BY CUSTOMER API CONSUMER
// ============================================================

/**
 * Search orders by customer name
 * @param {string} customerName - Name to search for
 * @param {string} statusFilter - Optional status filter (all/pending/preparing/ready/delivered)
 */
async function searchOrdersByCustomer(customerName, statusFilter = 'all') {
    try {
        const params = new URLSearchParams({
            customerName: customerName,
            status: statusFilter,
        });
        const response = await fetch(`/api/orders/search?${params}`, {
            headers: { Authorization: `Bearer ${window.auth?.currentUser?.uid || ''}` },
        });
        if (!response.ok) throw new Error('Failed to search orders');
        const orders = await response.json();
        renderOrdersSearchResults(orders);
        return orders;
    } catch (error) {
        console.error('Search orders error:', error);
        showToast('Failed to search orders', 'error');
        return [];
    }
}

/**
 * Render order search results in the UI
 * @param {Array} orders - Order data from API
 */
function renderOrdersSearchResults(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p class="text-center py-8">No orders found for this customer</p>';
        return;
    }

    ordersList.innerHTML = orders
        .map(
            order => `
    <div class="order-item" onclick="selectOrder('${escapeHtml(order.id)}', this)">
      <div class="flex items-center gap-3">
        <div class="order-avatar">${
            (order.customerName || 'C')
                .split(' ')
                .map(w => (w[0] ? w[0] : ''))
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'CU'
        }</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="order-customer truncate">${escapeHtml(order.customerName || 'Customer')}</p>
            <span class="order-id">#${escapeHtml(String(order.id).slice(-6))}</span>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5">
            <span class="pill ${escapeHtml(getOrderStatusColor(order.status))}">${escapeHtml(order.status)}</span>
            <span class="order-amount">TSh ${(order.totalAmount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  `
        )
        .join('');
}

/**
 * Initialize order search functionality in the orders tab
 */
function initOrderSearch() {
    const searchInput = document.getElementById('dsSearchInput');
    if (!searchInput) return;

    let searchTimeout = null;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            if (query.length >= 2) {
                await searchOrdersByCustomer(query);
            } else if (query === '') {
                // Reload all orders
                const { loadOrdersRealtime } = await import('./merchant-enhancements.js');
                // Reload logic...
            }
        }, 300);
    });
}

// ============================================================
// LOW STOCK THRESHOLD CONFIGURATION API CONSUMER
// ============================================================

/**
 * Fetch the merchant's low stock threshold configuration
 */
async function fetchLowStockThreshold() {
    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        const res = await apiGet('/config/low-stock-threshold');
        // apiGet returns the unwrapped payload ({ threshold }), not a response body.
        return (res && Number(res.threshold)) || 5;
    } catch (error) {
        console.error('Fetch threshold error:', error);
        return 5; // Default fallback
    }
}

/**
 * Update the low stock threshold
 * @param {number} newThreshold - New threshold value (e.g., 5)
 */
async function updateLowStockThreshold(newThreshold) {
    try {
        const { apiFetch } = await import('./merchant-enhancements.js');
        await apiFetch('/config/low-stock-threshold', {
            method: 'PUT',
            body: JSON.stringify({ threshold: newThreshold }),
        });
        showThresholdUpdated(newThreshold);
        loadInventoryTab(); // Refresh inventory data
    } catch (error) {
        console.error('Update threshold error:', error);
        showToast('Failed to update threshold', 'error');
    }
}

/**
 * Show threshold updated notification
 * @param {number} threshold - The new threshold value
 */
function showThresholdUpdated(threshold) {
    showToast(`Low stock threshold updated to ${threshold}`, 'success');

    // Add a subtle visual indicator
    const root = document.documentElement;
    root.style.transition = 'background-color 0.3s';
    root.style.backgroundColor = '#e6fffa';
    setTimeout(() => {
        root.style.backgroundColor = '';
        root.style.transition = '';
    }, 300);
}

/**
 * Load inventory with dynamic threshold from backend
 */
async function loadInventoryWithThreshold() {
    const threshold = await fetchLowStockThreshold();

    // Use the fetched threshold instead of hardcoded value
    // This will be used in the inventory loading logic
    window.lowStockThreshold = threshold;

    // Continue with inventory loading...
    // The existing loadInventoryTab() will use window.lowStockThreshold
}

// Re-export/alias existing loadInventoryTab to use the new threshold
document.addEventListener('DOMContentLoaded', () => {
    const originalLoadInventory = window.loadInventoryTab;
    if (typeof originalLoadInventory === 'function') {
        window.loadInventoryTab = async function () {
            await originalLoadInventory();
            // Could re-apply threshold after load
        };
    }
});

// ============================================================
// UI HELPER: Initialize all API consumers on tab switch
// ============================================================

/**
 * Initialize API consumers when switching to a specific tab
 * @param {string} tabName - The tab name
 */
function initApiConsumerForTab(tabName) {
    switch (tabName) {
        case 'promotions':
            loadPromotionsFromApi();
            break;
        case 'payouts':
            loadPayoutHistory();
            if (!window.driverWsInitialized) {
                initDriverWebSocket();
                window.driverWsInitialized = true;
            }
            break;
        case 'analytics':
            // Analytics don't auto-fetch on load, but export buttons are ready
            break;
        case 'orders':
            initOrderSearch();
            break;
        case 'inventory':
            loadInventoryWithThreshold();
            break;
    }
}

// Execute on DOMContentLoaded if not already handled
document.addEventListener('DOMContentLoaded', () => {
    // The existing DOMContentHandler already runs initGamificationIntegration and initMerchantAppWithTabs
    // We can add initApiConsumerForTab there if needed
});

// Style element
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(100%); } }
`;
document.head.appendChild(style);

// ============================================================
// MISSING HANDLERS FOR NEW MERCHANT.HTML (Stitch-adapted)
// ============================================================

/**
 * Logout handler - uses SmartSokoLogout module
 */
async function logout() {
    try {
        if (window.SmartSokoLogout && typeof window.SmartSokoLogout.logout === 'function') {
            await window.SmartSokoLogout.logout();
        } else if (window.auth) {
            await window.auth.signOut();
            window.location.href = '/login.html?role=merchant';
        } else {
            window.location.href = '/login.html?role=merchant';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html?role=merchant';
    }
}

/**
 * Add Product CTA - opens the add menu item modal
 */
function dsAddProduct() {
    openAddMenuItem();
}

/**
 * Toggle sidebar collapsed state
 */
function toggleSidebar() {
    const html = document.documentElement;
    html.classList.toggle('sidebar-collapsed');
    const icon = document.getElementById('sidebarToggle')?.querySelector('span');
    if (icon) {
        icon.innerHTML = html.classList.contains('sidebar-collapsed') ? 'menu' : 'menu_open';
    }
}

/**
 * Filter orders by status - wrapper for existing filterOrdersByStatus
 */
function filterOrders(btn) {
    if (!btn) return;
    document.querySelectorAll('.fbtn[data-status]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const status = btn.dataset.status || 'all';
    if (typeof window.filterOrdersByStatus === 'function') {
        window.filterOrdersByStatus(status);
    }
}

/**
 * Open Add Menu Item modal
 */
function openAddMenuItem() {
    // merchant.html's Add/Edit Item modal is #addMenuModal (the #addMenuItemModal
    // ids belong to seller.html, which this page never renders).
    const modal = document.getElementById('addMenuModal');
    if (!modal) {
        showToast('Menu modal not found', 'error');
        return;
    }

    const titleEl = document.getElementById('menuModalTitle');
    if (titleEl) titleEl.textContent = 'Add Menu Item';
    const submitBtn = document.getElementById('menuModalSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Add Item';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Reset the modal's own form (#menuItemId / #menuItemName / #menuItemPrice...).
    const form = modal.querySelector('form');
    if (form) form.reset();
    const idField = document.getElementById('menuItemId');
    if (idField) idField.value = '';
    const firstInput =
        document.getElementById('menuItemName') || modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
}

/**
 * AI Add Product - placeholder for AI-assisted product creation
 */
/**
 * AI Add Product â€” extract product data from an image via the /ai/products
 * agent (Gemini vision), then prefill the Add-Item modal for review.
 * The merchant confirms and submits through the normal flow.
 */
function aiAddProduct() {
    // Hidden file input + one-shot change handler
    let input = document.getElementById('aiProductImageInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'aiProductImageInput';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            input.value = ''; // allow re-selecting the same file
            if (!file) return;
            await runAiExtraction(file);
        });
    }
    input.click();
}

/**
 * Reads an image File to a data URL, re-encoding it small enough to survive the
 * server's 1 MB express.json limit. A phone photo is 2-8 MB, which is 3-11 MB as
 * base64 and fails with 413 before any route sees it. Returns the original data URL
 * untouched when it is already small, and whenever anything about the re-encode fails.
 */
const IMAGE_SAFE_BYTES = 900_000;
async function shrinkImageToDataUrl(file, { maxEdge = 1024, quality = 0.82 } = {}) {
    const readRaw = () =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Could not read file'));
            reader.readAsDataURL(file);
        });

    let raw;
    try {
        raw = await readRaw();
    } catch (e) {
        throw new Error('Could not read the selected image');
    }
    if (raw.length <= IMAGE_SAFE_BYTES) return raw;

    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('decode failed'));
            el.src = objectUrl;
        });
        const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // JPEG has no alpha; transparent PNGs would go black
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const shrunk = canvas.toDataURL('image/jpeg', quality);
        return shrunk.length < raw.length ? shrunk : raw;
    } catch (e) {
        return raw;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
window.shrinkImageToDataUrl ||= shrinkImageToDataUrl;

// The products API refuses inline base64 over 8 KB, so a photo has to become a
// hosted URL before the product can be saved. POST /products/images stores it
// and hands back the public URL; nothing else in the save path sees the bytes.
async function uploadProductImage(dataUrl) {
    if (typeof window.merchantApi !== 'function')
        throw new Error('Merchant session is not ready yet');
    const result = await window.merchantApi('/products/images', {
        method: 'POST',
        body: JSON.stringify({ image: dataUrl }),
        timeoutMs: 60000,
    });
    const url = result && result.url;
    if (!url) throw new Error('The upload did not return an image URL');
    return url;
}
window.uploadProductImage ||= uploadProductImage;

async function runAiExtraction(file) {
    showToast('Analyzing image with AIâ€¦', 'info');
    try {
        const dataUrl = await shrinkImageToDataUrl(file);
        const imageBase64 = dataUrl.split(',')[1];
        const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'));

        const res = await fetch('/ai/products/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, mimeType }),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
            throw new Error((data && data.error) || 'AI extraction failed');

        const p = data.data || {};
        // Open the Add Item modal and prefill with AI-extracted values
        window.openAddMenuItem();
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el && v != null && String(v).trim() !== '') el.value = String(v).trim();
        };
        // merchant.html ids: #menuItemName / #menuItemDesc / #menuItemPrice /
        // #menuItemStock / #menuItemCategory.
        set('menuItemName', p.name);
        set('menuItemDesc', p.description);
        set('menuItemPrice', p.selling_price);
        set('menuItemStock', p.stock_quantity ?? 20);
        // #menuItemCategory is a free-text input backed by a datalist, so the AI
        // value can be written straight in.
        set('menuItemCategory', p.category);
        showToast('AI extracted: ' + (p.name || 'product') + ' â€” review and save', 'success');
    } catch (e) {
        console.error('AI Add Product error:', e);
        showToast('AI add failed: ' + e.message, 'error');
    }
}
window.runAiExtraction = runAiExtraction;

/**
 * Set Analytics Period
 */
function setAnalyticsPeriod(btn, days) {
    document.querySelectorAll('.fbtn[data-period]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof window.fetchDashboardAnalytics === 'function') {
        window.fetchDashboardAnalytics(days.toString()).then(data => {
            if (data && typeof window.renderDashboardAnalytics === 'function') {
                window.renderDashboardAnalytics(data);
            }
        });
    }
}

/**
 * Open Promo Modal
 */
function openPromoModal() {
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const form = modal.querySelector('form');
        if (form) form.reset();
    } else {
        showToast('Promo modal not found', 'error');
    }
}

/**
 * Filter Orders by Date
 */
function filterOrdersByDate(date) {
    // Store the date filter and re-render orders
    window.currentDateFilter = date || null;
    if (typeof window.renderOrders === 'function' && window.lastOrders) {
        window.renderOrders(window.lastOrders);
    }
}

/**
 * Filter Menu by Category
 */
function filterMenuByCategory(category) {
    // data-category is set by renderMenuItems on .ms-menu-item cards.
    const items = document.querySelectorAll('#menuItemsList .ms-menu-item');
    items.forEach(item => {
        const itemCategory = item.dataset.category || '';
        const matches = category === 'all' || itemCategory === category;
        item.style.display = matches ? '' : 'none';
    });
}

/**
 * Request Payout - already exists in merchant-app.js but ensure it's callable
 */
if (typeof window.requestPayout !== 'function') {
    window.requestPayout = async function requestPayout() {
        return loadFinance();
    };
}

/**
 * Load Promotions - ensure it's callable
 */
if (typeof window.loadPromotions !== 'function') {
    window.loadPromotions = async function loadPromotions() {
        if (typeof window.loadPromotionsFromApi === 'function') {
            await window.loadPromotionsFromApi();
        } else {
            showToast('Promotions module not loaded', 'warning');
        }
    };
}

/**
 * Open Customer Detail
 */
if (typeof window.openCustomerDetail !== 'function') {
    window.openCustomerDetail = async function openCustomerDetail(userId) {
        if (typeof window.getCustomerProfile === 'function') {
            const customer = await window.getCustomerProfile(userId);
            // Show customer detail modal
            showToast(`Loading customer ${userId}...`, 'info');
        }
    };
}

// Export for global access
window.logout = logout;
window.dsAddProduct = dsAddProduct;
window.toggleSidebar = toggleSidebar;
window.filterOrders ||= filterOrders;
window.openAddMenuItem ||= openAddMenuItem;
window.aiAddProduct = aiAddProduct;
window.setAnalyticsPeriod = setAnalyticsPeriod;
window.exportAnalyticsCSV ||= exportAnalyticsCSV;
window.openPromoModal ||= openPromoModal;
window.filterOrdersByDate ||= filterOrdersByDate;
window.filterMenuByCategory = filterMenuByCategory;
window.openCustomerDetail = window.openCustomerDetail;

// Additional global attachments â€” these functions were module-scoped but
// merchant.html inline handlers / feature modules expect them on window.
window.renderOrders = renderOrders; // date-filter re-render path
window.fetchDashboardAnalytics = fetchDashboardAnalytics;
window.renderDashboardAnalytics = renderDashboardAnalytics;
window.updateCheckboxStates = updateCheckboxStates; // menu-card inline onclick
window.loadPromotionsFromApi = loadPromotionsFromApi;
window.createPromoCode = createPromoCode;
window.loadOrdersTab = loadOrdersTab;
window.loadMenuTab = loadMenuTab;

// Add-menu-item submit path: merchant.html falls back to a direct API call
// when window.addMenuItem is absent. Attach a real implementation that
// creates the product through MerchantOS (Bearer ID-token auth).
window.addMenuItem = async function (data) {
    if (window.merchantOS && window.auth?.currentUser) {
        const payload = {
            name: data.name,
            description: data.description || '',
            price: Number(data.price) || 0,
            category: data.category || 'other',
            image: data.imageUrl || data.image || '',
            stockQuantity: Number(data.stock) || 0,
        };
        await window.merchantOS.createProduct(payload);
    }
};

// ============================================================
// MISSING TAB LOADERS
// ============================================================

/**
 * Load Reviews Tab - placeholder
 * (Renders into #reviewsList only â€” never replace the whole tab or the
 * category-filter dropdown in the tab header gets wiped out.)
 */
async function loadReviews() {
    const list = document.getElementById('reviewsList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-gray-500">Loading reviews...</p>';
    try {
        const { apiGet } = await import('./merchant-enhancements.js');
        const reviews = await apiGet('/reviews');
        const rows = Array.isArray(reviews) ? reviews : [];
        if (!rows.length) {
            list.innerHTML =
                '<div class="empty p-8"><span class="material-symbols-outlined">star</span><p class="empty-title">No reviews yet</p><p class="empty-msg">Customer reviews will appear here</p></div>';
            return;
        }
        list.innerHTML = rows
            .map(r => {
                const rating = Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0)));
                const stars = 'â˜…'.repeat(rating) + 'â˜†'.repeat(5 - rating);
                return (
                    '<div class="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0" data-review-category="' +
                    escapeHtml(r.category || 'general') +
                    '">' +
                    '<div>' +
                    '<div class="flex items-center gap-2"><span class="font-medium text-sm">' +
                    escapeHtml(r.customerName || r.userName || 'Customer') +
                    '</span>' +
                    '<span class="text-xs text-amber-500">' +
                    stars +
                    '</span></div>' +
                    '<p class="text-sm text-gray-600 mt-1">' +
                    escapeHtml(r.comment || r.review || '') +
                    '</p>' +
                    '<p class="text-xs text-gray-400 mt-1">' +
                    (r.createdAt ? escapeHtml(String(r.createdAt).slice(0, 10)) : '') +
                    '</p>' +
                    '</div></div>'
                );
            })
            .join('');
    } catch (e) {
        list.innerHTML =
            '<p class="text-sm text-red-500 p-4">Could not load reviews: ' +
            escapeHtml(e.message) +
            '</p>';
    }
}
window.loadReviews ||= loadReviews;

/**
 * Load Inventory Tab - ensure it's callable
 */
if (typeof window.loadInventoryTab !== 'function') {
    window.loadInventoryTab = async function loadInventoryTab() {
        showToast('Loading inventory...', 'info');
    };
}

/**
 * Load Staff Tab - ensure it's callable
 */
if (typeof window.loadStaffTab !== 'function') {
    window.loadStaffTab = async function loadStaffTab() {
        showToast('Loading staff...', 'info');
    };
}

/**
 * Load Delivery Tab - ensure it's callable
 */
if (typeof window.loadDeliveryTab !== 'function') {
    window.loadDeliveryTab = async function loadDeliveryTab() {
        showToast('Loading delivery...', 'info');
    };
}

/**
 * Load Profile/Settings Tab
 */
async function loadProfileTab() {
    const tab = document.getElementById('profileTab');
    if (!tab) return;
    showToast('Settings loaded', 'info');
}
window.loadProfileTab = loadProfileTab;

// ============================================================
// INLINE-HANDLER COMPATIBILITY GLOBALS
// merchant.html wires these via onclick/onchange attributes; the previous
// module-scoped versions were invisible to inline handlers.
// ============================================================

/** Reviews tab: category filter (id=reviewsCategoryFilter â†’ #reviewsList). */
window.filterReviewsByCategory = function (category) {
    document.querySelectorAll('#reviewsList [data-review-category]').forEach(el => {
        el.style.display =
            category === 'all' || el.dataset.reviewCategory === category ? '' : 'none';
    });
};
window.refreshReviews = function () {
    window.loadReviews && window.loadReviews();
};

/** Inventory tab: filter + actions (renders into #inventoryList). */
async function renderInventoryListLocal(category) {
    const listEl = document.getElementById('inventoryList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-sm text-gray-500 p-4">Loading inventory...</p>';
    try {
        const { loadMerchantProducts } = await import('./merchant-enhancements.js');
        let products = await loadMerchantProducts();
        if (category && category !== 'all')
            products = products.filter(p => p.category === category);
        if (!products.length) {
            listEl.innerHTML =
                '<div class="empty p-8"><span class="material-symbols-outlined">inventory_2</span><div class="empty-title">No items</div><div class="empty-msg">Add your first product to track stock.</div></div>';
            return;
        }
        listEl.innerHTML = products
            .map(p => {
                const stock = p.stockQuantity ?? p.stock ?? 0;
                const badge =
                    stock === 0
                        ? '<span class="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">OUT</span>'
                        : stock <= (p.minStock ?? p.lowStockThreshold ?? 5)
                          ? '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">LOW</span>'
                          : '<span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">OK</span>';
                return `<div class="flex items-center justify-between gap-3 py-2 px-4 border-b last:border-0">
        <div><div class="font-medium">${escapeHtml(p.name || 'Item')}</div><div class="text-xs text-gray-400">${escapeHtml(p.category || 'Uncategorized')}</div></div>
        <div class="flex items-center gap-3"><span class="text-sm font-semibold">${Number(stock).toLocaleString()} in stock</span>${badge}</div>
      </div>`;
            })
            .join('');
    } catch (e) {
        listEl.innerHTML = `<p class="text-sm text-red-500 p-4">Could not load inventory: ${escapeHtml(e.message)}</p>`;
    }
}
window.filterInventoryByCategory = function (category) {
    renderInventoryListLocal(category);
};
window.openAddProductModal = function () {
    window.openAddMenuItem && window.openAddMenuItem();
};
window.dsSyncInventory = function () {
    const sel = document.getElementById('inventoryCategoryFilter');
    renderInventoryListLocal(sel ? sel.value : 'all');
    showToast('Inventory synced', 'success');
};

/** Staff tab: filter + refresh (renders into #staffList). */
window.filterStaffByCategory = function (role) {
    document.querySelectorAll('#staffList [data-staff-role]').forEach(el => {
        el.style.display = role === 'all' || el.dataset.staffRole === role ? '' : 'none';
    });
};
window.refreshStaff = function () {
    window.loadStaffTab && window.loadStaffTab();
};

/** Dark mode toggle â€” toggles the html element's class. */
window.toggleDarkMode ||= function (enabled) {
    document.documentElement.classList.toggle('dark', !!enabled);
    document.documentElement.classList.toggle('light', !enabled);
    try {
        localStorage.setItem('smartsoko_theme', enabled ? 'dark' : 'light');
    } catch (_) {}
    showToast(enabled ? 'Dark mode on' : 'Light mode on', 'info');
};

/** Settings: Save Changes â€” persists merchant profile basics. */
window.saveProfile = async function () {
    const nameEl = document.getElementById('merchantProfileName');
    const phoneEl = document.getElementById('merchantProfilePhone');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
        showToast('Business name is required', 'error');
        return;
    }
    try {
        const user = window.auth?.currentUser;
        if (!user) throw new Error('Not signed in');
        const token = await user.getIdToken(true);
        const res = await fetch('/api/merchant/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ name, phone: phoneEl ? phoneEl.value.trim() : undefined }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showToast('Profile saved', 'success');
    } catch (e) {
        showToast('Failed to save profile: ' + e.message, 'error');
    }
};
