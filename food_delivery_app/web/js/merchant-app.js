import { loadMerchantProducts, getSalesAnalytics, updateOrderStatus } from './merchant-enhancements.js';
import { loadAnalytics } from './analytics.js';
import { loadOrders } from './orders.js';

let currentTab = 'orders';

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

function createSkeletonCard() {
  return `
    <div class="skeleton stitch-card" style="height: 80px;"></div>
  `;
}

function updateBreadcrumb() {
  const breadcrumb = document.querySelector('.mb-4');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <nav class="flex text-sm text-gray-500" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-2">
          <li class="inline-flex items-center">
            <a href="/dashboard" class="hover:text-gray-700">Dashboard</a>
          </li>
          <li>
            <div class="flex items-center">
              <span class="mx-2">/</span>
              <span class="text-gray-900 font-medium">${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}</span>
            </div>
          </li>
        </ol>
      </nav>
    `;
  }
}

async function loadKPIs() {
  const kpiContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-4');
  if (!kpiContainer) return;
  
  kpiContainer.setAttribute('aria-busy', 'true');

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const setDelta = (id, current, previous) => {
    const el = document.getElementById(id);
    if (!el) return;
    let icon = 'trending_flat', text = '0%', cls = 'stitch-badge-up';
    if (previous > 0) {
      const pct = Math.round(((current - previous) / previous) * 1000) / 10;
      if (pct > 0) { icon = 'trending_up'; text = `+${pct}%`; }
      else if (pct < 0) { icon = 'trending_down'; text = `${pct}%`; cls = 'stitch-badge-down'; }
    } else if (current > 0) {
      icon = 'trending_up';
      text = 'New';
    }
    el.className = cls;
    el.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">${icon}</span>${text}`;
  };
  
  try {
    const auth = window.auth;
    const db = window.db;
    if (auth?.currentUser && db) {
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const snapshot = await getDocs(query(collection(db, 'orders'), where('merchantId', '==', auth.currentUser.uid)));
      const orders = snapshot.docs.map(d => d.data());

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfToday.getDate() - 1);

      let todaySales = 0, todayOrders = 0, pendingCount = 0;
      let yestSales = 0, yestOrders = 0;

      orders.forEach(o => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
        const amount = o.totalAmount || o.total || 0;
        if (o.status === 'completed' || o.status === 'delivered') {
          if (d >= startOfToday) { todaySales += amount; todayOrders++; }
          else if (d >= startOfYesterday) { yestSales += amount; yestOrders++; }
        }
        if (o.status && o.status !== 'completed' && o.status !== 'delivered' && o.status !== 'cancelled') pendingCount++;
      });

      const avgToday = todayOrders > 0 ? Math.round(todaySales / todayOrders) : 0;
      const avgYesterday = yestOrders > 0 ? yestSales / yestOrders : 0;

      setText('todaySales', formatTSh(todaySales));
      setText('orderCount', todayOrders);
      setText('avgOrderValue', formatTSh(avgToday));
      setText('pendingOrders', `${pendingCount} pending order${pendingCount === 1 ? '' : 's'}`);
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
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('[id$="Tab"]');
  
  tabs.forEach(tab => {
    if (tab === clickedBtn) {
      tab.classList.add('bg-primary', 'text-white', 'font-bold', 'shadow-md');
      tab.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
    } else {
      tab.classList.remove('bg-primary', 'text-white', 'font-bold', 'shadow-md');
      tab.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
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
  else if (tabName === 'analytics') renderDashboardChart();
  else if (tabName === 'finance') {
    loadFinance();
    if (typeof window.loadFinanceReconciliation === 'function') window.loadFinanceReconciliation();
  }
  else if (tabName === 'promotions') loadPromotions();
  else if (tabName === 'reviews') loadReviews();
  else if (tabName === 'inventory') loadInventoryTab();
  else if (tabName === 'delivery') loadDeliveryTab();
  else if (tabName === 'staff') loadStaffTab();
}

async function loadOrdersTab() {
  const ordersList = document.getElementById('ordersList');
  const detailsPanel = document.getElementById('orderDetailsPanel');
  
  ordersList.innerHTML = '<div class="text-center py-8"><span class="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><p class="text-gray-500 mt-2">Loading orders...</p></div>';
  detailsPanel.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Select an order to view details</p>';
  
  const { loadOrdersRealtime } = await import('./merchant-enhancements.js');
  
  const unsubscribe = await loadOrdersRealtime((orders) => {
    renderOrders(orders);
  });

  if (unsubscribe) {
    ordersList.dataset.unsubscribe = unsubscribe;
  } else {
    ordersList.innerHTML = `
      <div class="empty-state py-12">
        <span class="material-symbols-outlined empty-state-icon">receipt_long</span>
        <div class="empty-state-title">No orders yet</div>
        <div class="empty-state-message">New customer orders will appear here when they come in.</div>
      </div>`;
  }
}

function renderOrders(orders) {
  const ordersList = document.getElementById('ordersList');
  const detailsPanel = document.getElementById('orderDetailsPanel');
  
  if (!orders || orders.length === 0) {
    ordersList.innerHTML = '<p class="text-gray-500 text-center py-8">No orders found</p>';
    return;
  }
  
  ordersList.innerHTML = orders.map(order => {
    const customerName = order.customerName || 'Customer';
    const initials = customerName.split(' ').map(w => w && w[0] ? w[0] : '').join('').slice(0, 2).toUpperCase() || 'CU';
    return `
    <div class="order-item" onclick="selectOrder('${order.id}', this)">
      <div class="flex items-center gap-3">
        <div class="order-avatar">${initials}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="order-customer truncate">${escapeHtml(customerName)}</p>
            <span class="order-id">#${escapeHtml(String(order.id).slice(-6))}</span>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5">
            <span class="pill ${getOrderStatusColor(order.status)}">${escapeHtml(order.status)}</span>
            <span class="order-amount">TSh ${(order.totalAmount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function selectOrder(orderId, element) {
  document.querySelectorAll('#ordersList > div').forEach(el => {
    el.classList.remove('ring-2', 'ring-primary');
  });
  element.classList.add('ring-2', 'ring-primary');
  
  const detailsPanel = document.getElementById('orderDetailsPanel');
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
    const { collection, doc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const db = window.db;
    
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      container.innerHTML = '<p class="text-red-500 text-center py-4">Order not found</p>';
      return;
    }
    
    const order = { id: orderDoc.id, ...orderDoc.data() };
    
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-center pb-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-800">Order Details</h3>
          <span class="inline-block px-3 py-1 rounded text-sm font-medium ${getOrderStatusColor(order.status)}">${order.status}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Customer</p>
            <p class="font-medium text-gray-800">${order.customerName || 'N/A'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Total Amount</p>
            <p class="font-medium text-gray-800">TSh ${order.totalAmount || 0}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Created</p>
            <p class="font-medium text-gray-800">${order.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Items</p>
            <p class="font-medium text-gray-800">${order.items?.length || 0}</p>
          </div>
        </div>
        
        <div class="mt-4">
          <p class="text-sm text-gray-500 mb-2">Items Ordered:</p>
          <ul class="space-y-1">
            ${(order.items || []).map(item => `
              <li class="flex justify-between text-sm">
                <span class="text-gray-700">â€¢ ${item.name || 'Item'}</span>
                <span class="text-gray-600">${item.quantity || 1} Ã— TSh ${item.price || 0}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        
        ${order.status !== 'completed' ? `
          <div class="pt-4 border-t border-gray-200">
            <label class="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
            <div class="flex gap-2">
              <button onclick="updateOrderStatusFromDetail('${order.id}', 'accepted')" class="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200">Accept</button>
              <button onclick="updateOrderStatusFromDetail('${order.id}', 'preparing')" class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium hover:bg-yellow-200">Preparing</button>
              <button onclick="updateOrderStatusFromDetail('${order.id}', 'ready')" class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200">Ready</button>
              <button onclick="updateOrderStatusFromDetail('${order.id}', 'completed')" class="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium hover:bg-purple-200">Complete</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
  } catch (error) {
    container.innerHTML = `<p class="text-red-500 text-center py-4">Error loading order: ${error.message}</p>`;
    console.error('Order Details Error:', error);
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
  const elements = document.querySelectorAll('#ordersList > div');
  elements.forEach(el => {
    const orderStatus = JSON.parse(el.dataset.orderStatus || '"' + el.querySelector('span.inline-block')?.textContent?.trim() + '"');
    if (status === 'all' || orderStatus === status) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

async function loadMenuTab() {
  const menuItemsList = document.getElementById('menuItemsList');
  if (!menuItemsList) return;
  
  menuItemsList.innerHTML = '<div class="text-center py-8"><span class="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><p class="text-gray-500 mt-2">Loading menu...</p></div>';
  
  try {
    const products = await loadMerchantProducts();
    renderMenuItems(products);
  } catch (error) {
    showToast('Failed to load menu', 'error');
    console.error('Menu Error:', error);
  }
}

function renderMenuItems(products) {
  const menuItemsList = document.getElementById('menuItemsList');
  if (!products || products.length === 0) {
    menuItemsList.innerHTML = '<p class="text-gray-500 text-center py-8">No menu items found</p>';
    return;
  }
  
  menuItemsList.innerHTML = products.map(product => `
    <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div class="flex gap-4">
        <div class="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
          <img src="${product.image || 'images/default-product.png'}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.src='images/default-product.png'" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800 mb-1">${product.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${product.description || 'No description'}</p>
          <div class="flex justify-between items-center">
            <span class="font-medium text-gray-800">TSh ${product.price}</span>
            <span class="text-xs ${product.isActive ? 'text-green-600' : 'text-red-600'} font-medium">${product.isActive ? 'Available' : 'Unavailable'}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">Stock: ${product.stock || 0}</div>
        </div>
        <div class="flex flex-col gap-2">
          <button onclick="toggleMenuItemAvailability('${product.id}', ${!product.isActive})" class="px-3 py-1 rounded text-xs font-medium ${product.isActive ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'} transition-colors">
            ${product.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onclick="deleteMenuItem('${product.id}')" class="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleMenuItemAvailability(productId, newStatus) {
  try {
    const { collection, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const db = window.db;
    
    await updateDoc(doc(db, 'products', productId), { 
      isActive: newStatus,
      updatedAt: serverTimestamp()
    });
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
    const { collection, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const db = window.db;
    
    await deleteDoc(doc(db, 'products', productId));
    showToast('Product deleted successfully', 'success');
    loadMenuTab();
  } catch (error) {
    showToast('Failed to delete product', 'error');
    console.error('Delete Error:', error);
  }
}

function getOrderStatusColor(status) {
  const colors = {
    'pending': 'pill-surface',
    'accepted': 'pill-secondary',
    'preparing': 'pill-tertiary',
    'ready': 'pill-primary',
    'completed': 'pill-outline',
    'cancelled': 'pill-error'
  };
  return colors[status] || 'pill-outline';
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

  if (!currentSeller) {
    setText('totalCustomers', '0');
    setText('repeatRate', '0%');
    setText('avgLtv', 'TSh 0');
    setText('newCustomers', '0');
    if (cohortEl) cohortEl.innerHTML = emptyRow('No customer data yet.');
    if (segmentationEl) segmentationEl.innerHTML = '<p class="text-sm text-gray-500">No customer data yet.</p>';
    if (regionalEl) regionalEl.innerHTML = '<p class="text-sm text-gray-500">No regional data yet.</p>';
    if (bestItemsEl) bestItemsEl.innerHTML = emptyRow('No sales data yet.', 5);
    return;
  }

  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(query(collection(db, 'orders'), where('sellerId', '==', currentSeller.id))),
      getDocs(query(collection(db, 'products'), where('sellerId', '==', currentSeller.id)))
    ]);

    const productByName = new Map();
    productsSnap.docs.forEach(d => {
      const p = d.data();
      if (p.name) productByName.set(p.name, p);
    });

    const orders = ordersSnap.docs.map(d => d.data()).filter(o => o.status && o.status !== 'cancelled');

    // Customer aggregation
    const customers = new Map();
    let totalRevenue = 0;
    const now = new Date();
    let newThisMonth = 0;

    orders.forEach(o => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      const amount = o.totalAmount || o.total || 0;
      totalRevenue += amount;
      const key = o.customerId || o.customerName || 'guest';
      let c = customers.get(key);
      if (!c) {
        c = { key, name: o.customerName || 'Guest', address: o.customerAddress || '', firstDate: date, orders: [], spend: 0 };
        customers.set(key, c);
        if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) newThisMonth++;
      }
      c.orders.push(date);
      c.spend += amount;
    });

    const uniqueCount = customers.size;
    const repeatCount = [...customers.values()].filter(c => c.orders.length >= 2).length;
    setText('totalCustomers', uniqueCount);
    setText('repeatRate', uniqueCount > 0 ? Math.round((repeatCount / uniqueCount) * 100) + '%' : '0%');
    setText('avgLtv', formatTSh(uniqueCount > 0 ? totalRevenue / uniqueCount : 0));
    setText('newCustomers', newThisMonth);

    // Cohort retention (month of first order, weekly columns)
    if (cohortEl) {
      if (orders.length === 0) {
        cohortEl.innerHTML = emptyRow('No customer data yet.');
      } else {
        const cohortMap = new Map();
        customers.forEach(c => {
          const key = c.firstDate.getFullYear() + '-' + c.firstDate.getMonth();
          if (!cohortMap.has(key)) cohortMap.set(key, []);
          cohortMap.get(key).push(c);
        });
        const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString('default', { month: 'short', year: 'numeric' });
        const inWindow = (c, fromDays, toDays) => c.orders.filter(d => {
          const diff = (d - c.firstDate) / 86400000;
          return diff >= fromDays && diff < toDays;
        }).length > 0;
        const retentionPct = (members, fromDays, toDays) => Math.round((members.filter(c => inWindow(c, fromDays, toDays)).length / members.length) * 100);

        cohortEl.innerHTML = [...cohortMap.keys()].sort().map(key => {
          const [y, m] = key.split('-').map(Number);
          const members = cohortMap.get(key);
          const m2 = retentionPct(members, 28, 60);
          return `
            <tr class="border-b border-surface-container">
              <td class="py-3 pr-4 font-medium" style="color: #022D1D;">${monthLabel(y, m)}</td>
              <td class="py-3 pr-4">${retentionPct(members, 0, 7)}%</td>
              <td class="py-3 pr-4">${retentionPct(members, 7, 14)}%</td>
              <td class="py-3 pr-4">${retentionPct(members, 14, 21)}%</td>
              <td class="py-3 pr-4">${retentionPct(members, 21, 28)}%</td>
              <td class="py-3 font-medium ${m2 >= 25 ? 'text-green-600' : 'text-gray-600'}">${m2}%</td>
            </tr>
          `;
        }).join('') || emptyRow('No customer data yet.');
      }
    }

    // Best performing items
    if (bestItemsEl) {
      const itemMap = new Map();
      orders.forEach(o => {
        (o.items || []).forEach(item => {
          const name = item.name || 'Unknown item';
          let it = itemMap.get(name);
          if (!it) { it = { name, units: 0, revenue: 0, orderCount: 0, orderDates: [] }; itemMap.set(name, it); }
          it.units += item.quantity || 1;
          it.revenue += (item.price || 0) * (item.quantity || 1);
          it.orderCount++;
          const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
          it.orderDates.push(date);
        });
      });
      const topItems = [...itemMap.values()].sort((a, b) => b.units - a.units).slice(0, 4);

      if (topItems.length === 0) {
        bestItemsEl.innerHTML = emptyRow('No sales data yet.', 5);
      } else {
        const weekAgo = now - 7 * 86400000;
        const twoWeeksAgo = now - 14 * 86400000;
        bestItemsEl.innerHTML = topItems.map(item => {
          const recent = item.orderDates.filter(d => d >= weekAgo).length;
          const previous = item.orderDates.filter(d => d >= twoWeeksAgo && d < weekAgo).length;
          const growth = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : (recent > 0 ? 100 : 0);
          const growthHtml = growth > 0
            ? `<span class="stitch-badge-up"><span class="material-symbols-outlined" style="font-size: 14px;">trending_up</span>${growth}%</span>`
            : growth < 0
              ? `<span class="stitch-badge-down"><span class="material-symbols-outlined" style="font-size: 14px;">trending_down</span>${growth}%</span>`
              : '<span class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">0%</span>';

          const product = productByName.get(item.name);
          const stock = product ? (product.stockQuantity !== undefined ? product.stockQuantity : (product.stock || 0)) : null;
          const stockHtml = stock === null
            ? '<span class="font-body-sm text-xs" style="color: #64748B;">â€”</span>'
            : stock === 0
              ? '<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full" style="background: #EF4444;"></div><span class="font-body-sm" style="color: #B91C1C;">Out of Stock</span></div>'
              : stock <= (product.lowStockThreshold || 5)
                ? '<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div><span class="font-body-sm" style="color: #F59E0B;">Low Stock</span></div>'
                : '<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full" style="background: #059669;"></div><span class="font-body-sm" style="color: #022D1D;">In Stock</span></div>';

          return `
            <tr class="border-b border-surface-container">
              <td class="py-4 pr-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden">
                    <img src="${product && product.imageUrl ? product.imageUrl : 'images/default-product.png'}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover" onerror="this.src='images/default-product.png'"/>
                  </div>
                  <div>
                    <div class="font-body-sm font-medium" style="color: #022D1D;">${escapeHtml(item.name)}</div>
                    <div class="font-body-sm text-xs" style="color: #64748B;">${item.orderCount} order${item.orderCount === 1 ? '' : 's'}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 pr-4">
                <div class="font-body-sm font-medium" style="color: #022D1D;">${item.units} units</div>
                <div class="font-body-sm text-xs" style="color: #64748B;">Total sold</div>
              </td>
              <td class="py-4 pr-4">${growthHtml}</td>
              <td class="py-4 pr-4">${stockHtml}</td>
              <td class="py-4">
                <div class="font-body-sm font-medium text-right" style="color: #022D1D;">${formatTSh(item.revenue)}</div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Customer segmentation by lifetime spend
    if (segmentationEl) {
      if (uniqueCount === 0) {
        segmentationEl.innerHTML = '<p class="text-sm text-gray-500">No customer data yet.</p>';
      } else {
        const tiers = [
          { label: 'Platinum', color: '#064E3B', min: 100000 },
          { label: 'Gold', color: '#059669', min: 50000 },
          { label: 'Regular', color: '#0EA5E9', min: 10000 },
          { label: 'New', color: '#059669', min: 0 }
        ];
        const counts = tiers.map(t => ({ ...t, count: [...customers.values()].filter(c => c.spend >= t.min && (tiers[tiers.indexOf(t) + 1] ? c.spend < tiers[tiers.indexOf(t) + 1].min : true)).length }));
        segmentationEl.innerHTML = counts.map(t => {
          const pct = Math.round((t.count / uniqueCount) * 100);
          return `
            <div class="flex items-center justify-between mb-2">
              <span class="font-body-sm" style="color: #022D1D;">${t.label}</span>
              <span class="font-body-sm" style="color: #64748B;">${t.count} customer${t.count === 1 ? '' : 's'} (${pct}%)</span>
            </div>
            <div class="h-8 bg-gray-100 rounded-full overflow-hidden relative mb-4">
              <div class="h-full rounded-full relative" style="background: ${t.color}; width: ${pct}%;${t.count > 0 ? ' min-width: 12px;' : ''}"></div>
            </div>
          `;
        }).join('') + '<p class="font-body-sm text-xs" style="color: #64748B;">Tiers by lifetime spend: Platinum â‰¥ TSh 100,000 Â· Gold â‰¥ TSh 50,000 Â· Regular â‰¥ TSh 10,000</p>';
      }
    }

    // Regional breakdown by customer address
    if (regionalEl) {
      const regionMap = new Map();
      orders.forEach(o => {
        const region = (o.customerAddress || '').trim() || 'Unknown area';
        regionMap.set(region, (regionMap.get(region) || 0) + (o.totalAmount || o.total || 0));
      });
      const regions = [...regionMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const totalRegional = regions.reduce((s, [, v]) => s + v, 0);

      if (regions.length === 0) {
        regionalEl.innerHTML = '<p class="text-sm text-gray-500">No regional data yet.</p>';
      } else {
        regionalEl.innerHTML = regions.map(([name, amount], idx) => {
          const pct = totalRegional > 0 ? Math.round((amount / totalRegional) * 100) : 0;
          const barColor = idx % 2 === 0 ? '#059669' : '#0EA5E9';
          return `
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="font-body-sm" style="color: #022D1D;">${escapeHtml(name)}</span>
                <span class="font-body-sm" style="color: ${barColor}; font-weight: 600;">${formatTSh(amount)} (${pct}%)</span>
              </div>
              <div class="h-8 bg-gray-100 rounded-full overflow-hidden relative">
                <div class="absolute inset-0 flex items-center justify-center text-xs font-medium" style="color: #022D1D;">${pct}%</div>
                <div class="h-full rounded-full relative" style="background: ${barColor}; width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Customer Insights Error:', error);
  }
}

function renderDashboardChart() {
  loadCustomerInsights();
}

async function loadStaffTab() {
  const listEl = document.getElementById('staffList');
  if (!listEl) return;

  if (!currentSeller) {
    listEl.innerHTML = '<p class="text-sm text-gray-500">Complete your seller profile to manage staff.</p>';
    return;
  }

  listEl.innerHTML = '<p class="text-sm text-gray-500">Loading staff...</p>';

  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const snapshot = await getDocs(query(collection(db, 'staff'), where('sellerId', '==', currentSeller.id)));
    const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (staff.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-gray-500">No staff added yet. Add your first team member below.</p>';
      return;
    }

    const roleColors = {
      manager: 'bg-purple-100 text-purple-800',
      cashier: 'bg-blue-100 text-blue-800',
      kitchen: 'bg-orange-100 text-orange-800',
      waiter: 'bg-green-100 text-green-800',
      delivery: 'bg-red-100 text-red-800'
    };

    listEl.innerHTML = staff.map(member => {
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
            <p class="text-xs ${status === 'active' ? 'text-green-600' : 'text-amber-600'}">${escapeHtml(status)}${member.inviteCode ? ' · ' + escapeHtml(member.inviteCode) : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded ${roleColors[member.role] || 'bg-gray-100 text-gray-800'}">${escapeHtml(member.role || 'staff')}</span>
          <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">${escapeHtml(member.shift || 'full')}</span>
          ${inviteBtn}
          <button onclick="removeStaff('${member.id}')" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>`;
    }).join('');

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
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    if (!currentSeller) {
      showToast('Complete your seller profile before adding staff', 'warning');
      return;
    }
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const inviteCode = generateInviteCode();
    const inviteLink = `${window.location.origin}/signup?staffInvite=${encodeURIComponent(inviteCode)}`;

    await addDoc(collection(db, 'staff'), {
      sellerId: currentSeller.id,
      sellerName: currentSeller.name || currentSeller.storeName || '',
      name,
      email: email.toLowerCase(),
      role,
      shift,
      posAccess,
      status: 'invited',
      inviteCode,
      inviteLink,
      createdAt: serverTimestamp()
    });

    try {
      await addDoc(collection(db, 'staffInvites'), {
        code: inviteCode,
        sellerId: currentSeller.id,
        sellerName: currentSeller.name || currentSeller.storeName || '',
        email: email.toLowerCase(),
        name,
        role,
        shift,
        posAccess,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (_) { /* staffInvites optional if rules block */ }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(inviteLink); } catch (_) { /* ignore */ }
    }

    showToast(`Invite created for ${name}. Link copied.`, 'success');
    alert(`Staff invite for ${name}\n\nRole: ${role}\nInvite code: ${inviteCode}\n\nShare this link:\n${inviteLink}`);
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
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'staff', staffId));
    showToast('Staff member removed', 'success');
    loadStaffTab();
  } catch (error) {
    console.error('Remove staff error:', error);
    showToast('Failed to remove staff member', 'error');
  }
}

// â”€â”€ Inventory Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadInventoryTab() {
  const lowStockItems = document.getElementById('lowStockItems');
  const totalItemsEl = document.getElementById('inventoryTotalItems');
  const totalStockEl = document.getElementById('inventoryTotalStock');
  const categoriesEl = document.getElementById('inventoryCategories');
  const outOfStockEl = document.getElementById('inventoryOutOfStock');

  if (lowStockItems) lowStockItems.innerHTML = '<p class="text-sm text-gray-500">Loading inventory...</p>';

  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const constraints = [];
    if (currentSeller?.id) constraints.push(where('sellerId', '==', currentSeller.id));
    const q = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let lowStock = [];
    let outOfStock = 0;
    let totalStock = 0;
    const categories = new Set();

    products.forEach(p => {
      const stock = p.stockQuantity !== undefined ? p.stockQuantity : (p.stock || 0);
      if (stock === 0) outOfStock++;
      if (stock > 0 && stock <= (p.lowStockThreshold || 5)) lowStock.push({ ...p, currentStock: stock });
      if (stock > 0) totalStock += stock;
      if (p.category) categories.add(p.category);
    });

    if (lowStockItems) {
      if (lowStock.length === 0) {
        lowStockItems.innerHTML = '<p class="text-sm text-green-600">All products are well stocked!</p>';
      } else {
        lowStockItems.innerHTML = lowStock.map(p => `
          <div class="flex items-center justify-between p-2 bg-white rounded-lg">
            <div>
              <p class="text-sm font-medium">${escapeHtml(p.name)}</p>
              <p class="text-xs text-yellow-600">Only ${p.currentStock} left</p>
            </div>
            <button onclick="quickAddStockForItem('${p.id}', 10)" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">+10</button>
          </div>
        `).join('');
      }
    }

    if (totalItemsEl) totalItemsEl.textContent = products.length;
    if (totalStockEl) totalStockEl.textContent = totalStock;
    if (categoriesEl) categoriesEl.textContent = categories.size;
    if (outOfStockEl) outOfStockEl.textContent = outOfStock;
  } catch (error) {
    console.error('Inventory load error:', error);
    if (lowStockItems) lowStockItems.innerHTML = '<p class="text-sm text-gray-500">No inventory data available</p>';
    if (totalItemsEl) totalItemsEl.textContent = '0';
    if (totalStockEl) totalStockEl.textContent = '0';
    if (categoriesEl) categoriesEl.textContent = '0';
    if (outOfStockEl) outOfStockEl.textContent = '0';
  }
}

async function updateProductStock(productId, newStock) {
  const db = window.db;
  if (!db) throw new Error('Database not initialized');
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
  await updateDoc(doc(db, 'products', productId), { stockQuantity: newStock });
}

async function quickAddStockForItem(productId, qty) {
  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { doc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) { showToast('Product not found', 'error'); return; }
    const data = productSnap.data();
    const current = data.stockQuantity !== undefined ? data.stockQuantity : (data.stock || 0);
    const newQty = current < 0 ? qty : current + qty;
    await updateDoc(productRef, { stockQuantity: newQty });
    showToast(`Restocked +${qty} units`, 'success');
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

  if (!name || qty <= 0) { showToast('Enter a product name and valid quantity', 'warning'); return; }

  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, query, where, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const constraints = [where('name', '==', name)];
    if (currentSeller?.id) constraints.push(where('sellerId', '==', currentSeller.id));
    const q = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(q);

    if (snapshot.empty) { showToast('Product not found â€” check the name', 'warning'); return; }

    const productDoc = snapshot.docs[0];
    const data = productDoc.data();
    const current = data.stockQuantity !== undefined ? data.stockQuantity : (data.stock || 0);
    const newQty = current < 0 ? qty : current + qty;
    await updateDoc(doc(db, 'products', productDoc.id), { stockQuantity: newQty });
    showToast(`+${qty} ${unitInput?.value || 'units'} added to ${name}`, 'success');
    nameInput.value = '';
    qtyInput.value = '';
    loadInventoryTab();
  } catch (error) {
    console.error('Add stock error:', error);
    showToast('Failed to add stock', 'error');
  }
}

// â”€â”€ Delivery Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadDeliveryTab() {
  await Promise.all([loadAvailableDrivers(), loadAssignableOrders(), loadActiveDeliveries()]);
}

function isDriverOnline(d) {
  if (!d) return false;
  if (d.available === false && !d.isOnline && d.status !== 'online') return false;
  return d.isOnline === true || d.available === true || d.isActive === true || d.status === 'online' || d.status === 'active';
}

async function loadAvailableDrivers() {
  const container = document.getElementById('availableDrivers');
  if (container) container.innerHTML = '<p class="text-sm text-gray-500">Loading drivers...</p>';

  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const snapshot = await getDocs(collection(db, 'drivers'));
    const drivers = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(isDriverOnline)
      .filter(d => !d.currentOrderId);
    renderAvailableDrivers(drivers);
  } catch (error) {
    console.error('Load drivers error:', error);
    if (container) container.innerHTML = '<p class="text-sm text-gray-500">No drivers available</p>';
  }
}

function renderAvailableDrivers(drivers) {
  const container = document.getElementById('availableDrivers');
  const driverSelect = document.getElementById('driverSelect');

  if (container) {
    if (!drivers || drivers.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No drivers currently online</p>';
    } else {
      container.innerHTML = drivers.map(d => `
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
      `).join('');
    }
  }

  if (driverSelect) {
    driverSelect.innerHTML = '<option value="">Select Driver</option>' +
      (drivers || []).map(d => `<option value="${d.id}" data-name="${escapeHtml(d.name || d.displayName || '')}">${escapeHtml(d.name || d.displayName || d.id)}</option>`).join('');
  }
}

async function loadAssignableOrders() {
  const orderInput = document.getElementById('orderIdInput');
  if (!orderInput) return;

  try {
    const db = window.db;
    if (!db || !currentSeller?.id) return;
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const snap = await getDocs(query(collection(db, 'orders'), where('sellerId', '==', currentSeller.id)));
    const assignable = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => {
        const s = String(o.status || '').toLowerCase();
        return ['ready', 'ready_for_delivery', 'preparing', 'confirmed', 'accepted', 'pending'].includes(s) && !o.driverId;
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
      orderSelect.innerHTML = '<option value="">Select order to assign</option>' +
        assignable.map(o => `<option value="${o.id}">#${escapeHtml(String(o.id).slice(-8))} · TSh ${Number(o.total || 0).toLocaleString()} · ${escapeHtml(o.customerName || 'Customer')}</option>`).join('');
    }
  } catch (error) {
    console.error('Load assignable orders error:', error);
  }
}

async function loadActiveDeliveries() {
  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    let count = 0;
    if (currentSeller?.id) {
      const snap = await getDocs(query(collection(db, 'orders'), where('sellerId', '==', currentSeller.id)));
      count = snap.docs.filter(d => {
        const s = String(d.data().status || '').toLowerCase();
        return ['assigned', 'picked_up', 'on_the_way', 'delivering', 'out_for_delivery', 'dispatched'].includes(s);
      }).length;
    }

    const activeEl = document.getElementById('activeDeliveries');
    if (activeEl) activeEl.textContent = String(count);
    const etaEl = document.getElementById('deliveryEta');
    if (etaEl) etaEl.textContent = count > 0 ? '~30 min' : '00:00';
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
  const driverName = driverSelect?.selectedOptions?.[0]?.dataset?.name || driverSelect?.selectedOptions?.[0]?.textContent || '';

  if (!orderId || !driverId) { showToast('Select an Order and a Driver', 'warning'); return; }

  await assignDriverToOrder(orderId, driverId, driverName);
  if (orderIdInput) orderIdInput.value = '';
}

async function assignDriverToOrder(orderId, driverId, driverName = '') {
  try {
    const db = window.db;
    if (!db) throw new Error('Database not initialized');
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) { showToast('Order not found', 'error'); return; }

    let name = driverName;
    if (!name) {
      try {
        const dSnap = await getDoc(doc(db, 'drivers', driverId));
        if (dSnap.exists()) name = dSnap.data().name || dSnap.data().displayName || '';
      } catch (_) { /* ignore */ }
    }

    await updateDoc(orderRef, {
      driverId,
      driverName: name || null,
      status: 'assigned',
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        available: false,
        currentOrderId: orderId,
        updatedAt: serverTimestamp()
      });
    } catch (_) { /* driver doc may not allow update */ }

    showToast('Driver assigned to order', 'success');
    loadDeliveryTab();
  } catch (error) {
    console.error('Assign driver error:', error);
    showToast('Failed to assign driver', 'error');
  }
}

// â”€â”€ Finance Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let financeOrders = [];

async function loadFinance() {
  const db = window.db;
  if (!db) return;
  try {
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const q = query(collection(db, 'orders'), where('sellerId', '==', currentSeller?.id || ''));
    const snap = await getDocs(q);
    financeOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let available = 0;
    let pending = 0;
    let lifetime = 0;

    financeOrders.forEach(o => {
      const total = o.total || 0;
      lifetime += total;
      if (o.status === 'completed' || o.status === 'delivered') available += total;
      else pending += total;
    });

    const fmt = n => 'TSh ' + Number(n || 0).toLocaleString();
    const setText = id => { const el = document.getElementById(id); if (el) el.textContent = fmt(id === 'availableBalance' ? available : id === 'pendingBalance' ? pending : lifetime); };
    setText('availableBalance');
    setText('pendingBalance');
    setText('lifetimeEarnings');
  } catch (error) {
    console.error('Finance load error:', error);
  }
}

async function requestPayout() {
  const db = window.db;
  if (!db) return showNotification('Service unavailable', 'error');
  try {
    const balanceText = document.getElementById('availableBalance')?.textContent || 'TSh 0';
    const amount = parseInt((balanceText.match(/[\d,]+/) || ['0'])[0].replace(/,/g, ''), 10);
    if (!amount) { showNotification('No balance available for payout', 'error'); return; }

    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await addDoc(collection(db, 'payouts'), {
      sellerId: currentSeller?.id || '',
      amount,
      status: 'requested',
      createdAt: new Date().toISOString()
    });
    showNotification(`Payout request of TSh ${amount.toLocaleString()} submitted! Funds will arrive in 1-2 business days.`, 'success');
    document.getElementById('availableBalance').textContent = 'TSh 0';
  } catch (error) {
    console.error('Payout error:', error);
    showNotification('Failed to submit payout', 'error');
  }
}

// Promotions and Reviews tabs are implemented by global functions in
// merchant.html's inline script (loadPromotions/loadReviews/etc.);
// the module must NOT shadow them with local stubs.

window.updateOrderStatus = updateOrderStatus;
window.loadKPIs = loadKPIs;
window.selectOrder = selectOrder;
window.filterOrdersByStatus = filterOrdersByStatus;
window.updateOrderStatusFromDetail = updateOrderStatusFromDetail;
window.toggleMenuItemAvailability = toggleMenuItemAvailability;
window.deleteMenuItem = deleteMenuItem;
window.switchTab = switchTab;
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
window.requestPayout = requestPayout;
window.copyStaffInvite = function(code) {
  const link = `${window.location.origin}/signup?staffInvite=${encodeURIComponent(code)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => showToast('Invite link copied', 'success')).catch(() => alert(link));
  } else {
    alert(link);
  }
};

async function initMerchantApp() {
  await loadKPIs();
  updateBreadcrumb();
  loadOrdersTab();
}

async function initMerchantAppWithTabs() {
  await loadKPIs();
  updateBreadcrumb();
  loadOrdersTab();
  
  const currentTab = window.location.hash ? window.location.hash.substring(1) : 'orders';
  if (currentTab) {
    const tabButton = document.querySelector(`.tab-btn[onclick*="'${currentTab}'"]`);
    if (tabButton) {
      tabButton.click();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMerchantAppWithTabs();
});

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(100%); } }
`;
document.head.appendChild(style);
