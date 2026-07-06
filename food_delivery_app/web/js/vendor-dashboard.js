/**
 * SmartSoko Vendor Dashboard
 * Sales analytics, top products, conversion tracking, customer insights, CSV export
 */

const VendorDashboard = (() => {
  // ── State ───────────────────────────────────────────────────────
  const state = {
    currentSeller: null,
    orders: [],
    products: [],
    reviews: [],
    period: 7, // days
    commissionRate: 0.10 // 10% platform fee
  };

  // ── Utilities ───────────────────────────────────────────────────
  const utils = {
    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    formatCurrency(amount) {
      return `TSh ${(amount || 0).toLocaleString()}`;
    },
    formatDate(dateValue) {
      if (!dateValue) return 'N/A';
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    getStartDate(days) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  };

  // ── Firebase Helpers ────────────────────────────────────────────
  async function getDb() {
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    return window.db || getFirestore(window.app);
  }

  // ── Analytics Engine ────────────────────────────────────────────
  async function loadAnalyticsData(days = 7) {
    if (!state.currentSeller?.id) return null;

    try {
      const db = await getDb();
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

      const startDate = utils.getStartDate(days);

      // Load orders
      const ordersQuery = query(collection(db, 'orders'), where('merchantId', '==', state.currentSeller.id));
      const ordersSnap = await getDocs(ordersQuery);
      state.orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => {
        const orderDate = o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) : null;
        return orderDate && orderDate >= startDate;
      });

      // Load products
      const productsQuery = query(collection(db, 'products'), where('merchantId', '==', state.currentSeller.id));
      const productsSnap = await getDocs(productsQuery);
      state.products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load reviews
      try {
        const { orderBy, limit } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const reviewsQuery = query(collection(db, 'reviews'), where('sellerId', '==', state.currentSeller.id), limit(100));
        const reviewsSnap = await getDocs(reviewsQuery);
        state.reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        state.reviews = [];
      }

      return computeAnalytics();
    } catch (err) {
      console.error('Error loading analytics:', err);
      return null;
    }
  }

  function computeAnalytics() {
    const orders = state.orders;
    const products = state.products;
    const reviews = state.reviews;

    // Sales metrics
    const totalSales = orders.reduce((sum, o) => sum + (o.total || o.amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0 : 0;

    // Platform commission
    const commission = Math.round(totalSales * state.commissionRate);
    const netRevenue = totalSales - commission;

    // Daily breakdown
    const dailyMap = {};
    orders.forEach(o => {
      const date = o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) : new Date();
      const key = date.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { sales: 0, orders: 0 };
      dailyMap[key].sales += (o.total || o.amount || 0);
      dailyMap[key].orders++;
    });

    // Top products
    const productSales = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const id = item.productId || item.id || 'unknown';
        if (!productSales[id]) productSales[id] = { name: item.name || 'Unknown', count: 0, revenue: 0 };
        productSales[id].count += (item.quantity || 1);
        productSales[id].revenue += ((item.price || 0) * (item.quantity || 1));
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Category breakdown
    const categorySales = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const cat = item.category || 'Uncategorized';
        if (!categorySales[cat]) categorySales[cat] = 0;
        categorySales[cat] += ((item.price || 0) * (item.quantity || 1));
      });
    });

    // Customer insights
    const customerMap = {};
    orders.forEach(o => {
      const cid = o.customerId || o.customerName || 'anonymous';
      if (!customerMap[cid]) customerMap[cid] = { orders: 0, spent: 0, name: o.customerName || 'Guest' };
      customerMap[cid].orders++;
      customerMap[cid].spent += (o.total || o.amount || 0);
    });

    const repeatCustomers = Object.values(customerMap).filter(c => c.orders > 1).length;
    const totalCustomers = Object.keys(customerMap).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    // Peak hours
    const hourCounts = new Array(24).fill(0);
    orders.forEach(o => {
      const date = o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) : new Date();
      hourCounts[date.getHours()]++;
    });

    // Review stats
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0';

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      commission,
      netRevenue,
      dailyMap,
      topProducts,
      categorySales,
      customerInsights: { repeatCustomers, totalCustomers, repeatRate, customerMap },
      peakHours: hourCounts,
      avgRating,
      reviewCount: reviews.length
    };
  }

  // ── Chart Rendering (Canvas) ────────────────────────────────────
  function renderRevenueChart(dailyMap, canvasId = 'revenueCanvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };

    const labels = Object.keys(dailyMap).sort();
    const values = labels.map(k => dailyMap[k].sales);
    const maxVal = Math.max(...values, 1);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (height - padding.top - padding.bottom) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = Math.round(maxVal * (1 - i / 5));
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`TSh ${(val / 1000).toFixed(0)}k`, padding.left - 8, y + 3);
    }

    if (labels.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.font = '14px sans-serif';
      ctx.fillText('No sales data yet', width / 2, height / 2);
      return;
    }

    // Bar chart
    const barWidth = (width - padding.left - padding.right) / labels.length * 0.7;
    const gap = (width - padding.left - padding.right) / labels.length * 0.3;

    labels.forEach((label, i) => {
      const val = dailyMap[label].sales;
      const barHeight = (val / maxVal) * (height - padding.top - padding.bottom);
      const x = padding.left + i * (barWidth + gap) + gap / 2;
      const y = height - padding.bottom - barHeight;

      // Gradient
      const gradient = ctx.createLinearGradient(0, y, 0, height - padding.bottom);
      gradient.addColorStop(0, '#16a34a');
      gradient.addColorStop(1, '#dcfce7');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // X label
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      const dateParts = label.split('-');
      ctx.fillText(`${dateParts[2]}/${dateParts[1]}`, x + barWidth / 2, height - padding.bottom + 15);
    });
  }

  function renderPieChart(data, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const entries = Object.entries(data);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);

    if (total === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      ctx.fillText('No data', centerX, centerY);
      return;
    }

    const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
    let startAngle = 0;

    entries.forEach(([key, val], i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Label
      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pct = Math.round((val / total) * 100);
      if (pct > 5) ctx.fillText(`${pct}%`, labelX, labelY);

      startAngle += sliceAngle;
    });
  }

  // ── Render Dashboard UI ─────────────────────────────────────────
  function renderDashboard(analytics) {
    if (!analytics) return;

    // Summary cards
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('dashTotalSales', utils.formatCurrency(analytics.totalSales));
    setText('dashTotalOrders', analytics.totalOrders.toLocaleString());
    setText('dashAvgOrder', utils.formatCurrency(analytics.avgOrderValue));
    setText('dashNetRevenue', utils.formatCurrency(analytics.netRevenue));
    setText('dashCommission', utils.formatCurrency(analytics.commission));
    setText('dashRepeatRate', `${analytics.customerInsights.repeatRate}%`);
    setText('dashAvgRating', analytics.avgRating);
    setText('dashReviewCount', analytics.reviewCount.toLocaleString());

    // Revenue chart
    renderRevenueChart(analytics.dailyMap);

    // Top products
    const topProductsEl = document.getElementById('dashTopProducts');
    if (topProductsEl) {
      if (analytics.topProducts.length === 0) {
        topProductsEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No sales yet</p>';
      } else {
        topProductsEl.innerHTML = analytics.topProducts.map((p, i) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">${i + 1}</div>
              <div>
                <p class="font-medium text-sm">${utils.escapeHtml(p.name)}</p>
                <p class="text-xs text-gray-500">${p.count} sold</p>
              </div>
            </div>
            <span class="font-semibold text-sm text-green-700">${utils.formatCurrency(p.revenue)}</span>
          </div>
        `).join('');
      }
    }

    // Category pie chart
    const categoryEl = document.getElementById('dashCategoryChart');
    if (categoryEl) {
      if (Object.keys(analytics.categorySales).length === 0) {
        categoryEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-8">No category data</p>';
      } else {
        categoryEl.innerHTML = '<canvas id="categoryPieCanvas" style="width:100%;height:200px;"></canvas>';
        setTimeout(() => renderPieChart(analytics.categorySales, 'categoryPieCanvas'), 0);
      }
    }

    // Category list
    const categoryListEl = document.getElementById('dashCategoryList');
    if (categoryListEl) {
      const entries = Object.entries(analytics.categorySales).sort((a, b) => b[1] - a[1]);
      categoryListEl.innerHTML = entries.map(([cat, val]) => `
        <div class="flex items-center justify-between py-2">
          <span class="text-sm">${utils.escapeHtml(cat)}</span>
          <span class="font-medium text-sm">${utils.formatCurrency(val)}</span>
        </div>
      `).join('');
    }

    // Peak hours
    const peakEl = document.getElementById('dashPeakHours');
    if (peakEl) {
      const maxHour = Math.max(...analytics.peakHours);
      const topHours = analytics.peakHours
        .map((count, hour) => ({ hour, count }))
        .filter(h => h.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      if (topHours.length === 0) {
        peakEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No orders yet</p>';
      } else {
        peakEl.innerHTML = topHours.map(h => {
          const pct = maxHour > 0 ? (h.count / maxHour) * 100 : 0;
          const timeStr = `${h.hour.toString().padStart(2, '0')}:00`;
          return `
            <div class="flex items-center gap-3 py-1.5">
              <span class="text-xs w-12 text-gray-600">${timeStr}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full" style="width: ${pct}%"></div>
              </div>
              <span class="text-xs w-6 text-right text-gray-600">${h.count}</span>
            </div>
          `;
        }).join('');
      }
    }

    // Customer insights
    const customerEl = document.getElementById('dashCustomerInsights');
    if (customerEl) {
      const ci = analytics.customerInsights;
      customerEl.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="text-xs text-blue-600 uppercase font-medium">Total Customers</p>
            <p class="text-xl font-bold text-blue-800">${ci.totalCustomers}</p>
          </div>
          <div class="bg-green-50 p-3 rounded-lg">
            <p class="text-xs text-green-600 uppercase font-medium">Repeat Buyers</p>
            <p class="text-xl font-bold text-green-800">${ci.repeatCustomers}</p>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-sm text-gray-600 mb-2">Repeat Purchase Rate</p>
          <div class="flex items-center gap-3">
            <div class="flex-1 bg-gray-100 rounded-full h-3">
              <div class="bg-green-500 h-3 rounded-full transition-all" style="width: ${ci.repeatRate}%"></div>
            </div>
            <span class="text-sm font-bold text-green-700">${ci.repeatRate}%</span>
          </div>
        </div>
      `;
    }
  }

  // ── CSV Export ────────────────────────────────────────────────
  function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => {
      const val = row[h] || '';
      // Escape quotes and wrap in quotes if needed
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportSalesReport(period = 30) {
    const analytics = await loadAnalyticsData(period);
    if (!analytics) return;

    const report = Object.entries(analytics.dailyMap).map(([date, data]) => ({
      date,
      total_sales: data.sales,
      orders: data.orders
    }));

    exportToCSV(report, `sales_report_${state.currentSeller.id}_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Sales report exported!', 'success');
  }

  async function exportProductsReport() {
    const db = await getDb();
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    const q = query(collection(db, 'products'), where('merchantId', '==', state.currentSeller.id));
    const snap = await getDocs(q);

    const products = snap.docs.map(d => {
      const p = d.data();
      return {
        id: d.id,
        name: p.name || '',
        price: p.price || 0,
        stock: p.stockQuantity !== undefined ? p.stockQuantity : (p.stock || -1),
        category: p.category || '',
        collection: p.collection || '',
        is_available: p.isAvailable !== false ? 'Yes' : 'No'
      };
    });

    exportToCSV(products, `products_inventory_${state.currentSeller.id}_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Products inventory exported!', 'success');
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
    init(seller, options = {}) {
      state.currentSeller = seller;
      if (options.commissionRate !== undefined) state.commissionRate = options.commissionRate;
    },

    async load(period = 7) {
      state.period = period;
      const analytics = await loadAnalyticsData(period);
      renderDashboard(analytics);
      return analytics;
    },

    // Export
    exportSalesReport,
    exportProductsReport,
    exportToCSV,

    // Computed data
    getAnalytics: () => computeAnalytics(),
    getOrders: () => state.orders,
    getProducts: () => state.products,

    // Chart helpers
    renderRevenueChart,
    renderPieChart
  };
})();

// Global access
window.VendorDashboard = VendorDashboard;
