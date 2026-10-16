/**
 * Analytics Module for Merchant Dashboard
 * Handles chart rendering and analytics data visualization
 */

let revenueChartInstance = null;
let segmentationData = null;

/**
 * Initialize analytics module
 */
async function initAnalytics() {
  try {
    console.log('Initializing analytics module...');
    
    // Check if Chart.js is already loaded globally
    if (typeof Chart === 'undefined') {
      console.log('Chart.js not found, loading dynamically...');
      const chartModule = await import('https://cdn.jsdelivr.net/npm/chart.js');
      if (!chartModule) {
        throw new Error('Chart.js failed to load');
      }
    }

    // Load analytics data
    await loadAnalyticsData();

    // Render charts
    renderRevenueChart();
    renderCustomerSegmentation();
    renderRegionalBreakdown();
    renderBestItemsTable();
    renderCustomerInsights();

    console.log('Analytics module initialized successfully');

  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    throw error;
  }
}

/**
 * Load analytics data
 */
async function loadAnalyticsData() {
  try {
    // Simulate loading analytics data
    // In a real app, this would fetch from your backend API
    
    // Generate sample data for charts
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grossRevenue = [125000, 138000, 142000, 156000, 168000, 189000, 215000];
    const netProfit = [25000, 28000, 32000, 35000, 42000, 51000, 62000];

    return { labels, grossRevenue, netProfit };
    
  } catch (error) {
    console.error('Failed to load analytics data:', error);
    throw error;
  }
}

/**
 * Render revenue chart using Chart.js
 */
function renderRevenueChart() {
  const canvas = document.getElementById('revenueCanvas');
  
  if (!canvas) {
    console.warn('Revenue canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');

  // Destroy existing chart if any
  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  // Sample data
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const grossRevenue = [125000, 138000, 142000, 156000, 168000, 189000, 215000];
  const netProfit = [25000, 28000, 32000, 35000, 42000, 51000, 62000];

  // Create gradient fills
  const gradientRevenue = ctx.createLinearGradient(0, 0, 0, 250);
  gradientRevenue.addColorStop(0, 'rgba(6, 78, 59, 0.5)');
  gradientRevenue.addColorStop(1, 'rgba(6, 78, 59, 0.1)');

  const gradientProfit = ctx.createLinearGradient(0, 0, 0, 250);
  gradientProfit.addColorStop(0, 'rgba(14, 165, 233, 0.5)');
  gradientProfit.addColorStop(1, 'rgba(14, 165, 233, 0.1)');

  // Chart configuration
  const config = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gross Revenue (TSh)',
          data: grossRevenue,
          borderColor: '#064E3B',
          backgroundColor: gradientRevenue,
          borderWidth: 2,
          pointBackgroundColor: '#064E3B',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Net Profit (TSh)',
          data: netProfit,
          borderColor: '#0EA5E9',
          backgroundColor: gradientProfit,
          borderWidth: 2,
          pointBackgroundColor: '#0EA5E9',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return `TSh ${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          },
          ticks: {
            callback: function(value) {
              return value >= 1000 ? `${value / 1000}K` : value;
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  };

  // Create chart
  revenueChartInstance = new Chart(ctx, config);
}

/**
 * Render customer segmentation chart
 */
function renderCustomerSegmentation() {
  const container = document.getElementById('segmentationContent');
  
  if (!container) return;

  // Sample segmentation data
  const segmentationData = {
    'New Customers': 124,
    'Repeat Customers': 342,
    'VIP Customers': 45,
    'Inactive': 89
  };

  const total = Object.values(segmentationData).reduce((a, b) => a + b, 0);

  container.innerHTML = Object.entries(segmentationData).map(([label, value]) => {
    const percentage = ((value / total) * 100).toFixed(1);
    
    // Determine color based on label
    let color = '#064E3B'; // Default
    if (label.includes('New')) color = '#0EA5E9';
    else if (label.includes('Repeat')) color = '#10B981';
    else if (label.includes('VIP')) color = '#F59E0B';
    else if (label.includes('Inactive')) color = '#6B7280';

    return `
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium text-gray-800">${label}</span>
          <span class="text-sm text-gray-600">${percentage}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div class="h-2.5 rounded-full transition-all duration-500" 
               style="width: ${percentage}%; background-color: ${color};"></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">${value} customers</div>
      </div>
    `;
  }).join('');
}

/**
 * Render regional breakdown
 */
function renderRegionalBreakdown() {
  const container = document.getElementById('regionalBreakdown');
  
  if (!container) return;

  // Sample regional data
  const regionalData = [
    { region: 'Dar es Salaam', orders: 456, percentage: 42 },
    { region: 'Mombasa', orders: 234, percentage: 21 },
    { region: 'Kisumu', orders: 189, percentage: 17 },
    { region: 'Nairobi', orders: 156, percentage: 14 },
    { region: 'Other', orders: 65, percentage: 6 }
  ];

  container.innerHTML = regionalData.map(item => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
             style="background-color: rgba(6,78,59,0.1);">
          <span class="material-symbols-outlined text-primary">map</span>
        </div>
        <div>
          <p class="font-medium text-gray-800">${item.region}</p>
          <p class="text-xs text-gray-500">${item.orders} orders</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800">${item.percentage}%</p>
        <div class="w-24 bg-gray-200 rounded-full h-1.5 mt-1 mx-auto">
          <div class="h-1.5 rounded-full bg-primary" style="width: ${item.percentage}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Render best performing items table
 */
function renderBestItemsTable() {
  const tableBody = document.getElementById('bestItemsTable');
  
  if (!tableBody) return;

  // Sample data
  const bestItems = [
    { name: 'Chapati & Beef Stew', sales: 145, growth: 12, stock: 'In Stock', revenue: 145000 },
    { name: ' ugali & Fish', sales: 123, growth: 8, stock: 'In Stock', revenue: 98400 },
    { name: 'Chicken Fry', sales: 98, growth: -3, stock: 'Low Stock', revenue: 78400 },
    { name: 'Samosa (10pcs)', sales: 87, growth: 15, stock: 'In Stock', revenue: 43500 },
    { name: 'Fanta (500ml)', sales: 76, growth: 5, stock: 'In Stock', revenue: 38000 }
  ];

  tableBody.innerHTML = bestItems.map(item => `
    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td class="py-4">
        <div class="font-medium text-gray-900">${item.name}</div>
        <div class="text-xs text-gray-500">Last 7 days</div>
      </td>
      <td class="py-4">
        <span class="font-semibold text-gray-800">${item.sales}</span>
        <span class="text-xs text-gray-500"> units</span>
      </td>
      <td class="py-4">
        <span class="px-2 py-1 rounded text-xs font-medium"
              style="${item.growth >= 0 ? 'background-color: rgba(16,185,129,0.1); color: #10b981;' : 'background-color: rgba(239,68,68,0.1); color: #ef4444;}">
          ${item.growth >= 0 ? '+' : ''}${item.growth}%
        </span>
      </td>
      <td class="py-4">
        <span class="px-2 py-1 rounded text-xs font-medium"
              style="${item.stock === 'In Stock' ? 'background-color: rgba(16,185,129,0.1); color: #10b981;' : 'background-color: rgba(251,191,36,0.1); color: #f59e0b;}">
          ${item.stock}
        </span>
      </td>
      <td class="py-4 text-right">
        <div class="font-bold text-gray-800">TSh ${item.revenue.toLocaleString()}</div>
      </td>
    </tr>
  `).join('');
}

/**
 * Render customer insights
 */
function renderCustomerInsights() {
  // Update customer insight cards
  const totalCustomers = document.getElementById('totalCustomers');
  const repeatRate = document.getElementById('repeatRate');
  const avgLtv = document.getElementById('avgLtv');
  const newCustomers = document.getElementById('newCustomers');

  if (totalCustomers) totalCustomers.textContent = '1,234';
  if (repeatRate) repeatRate.textContent = '38%';
  if (avgLtv) avgLtv.textContent = 'TSh 45,200';
  if (newCustomers) newCustomers.textContent = '89';

  // Load cohort retention data
  loadCohortRetention();
}

/**
 * Load cohort retention table
 */
function loadCohortRetention() {
  const tableBody = document.getElementById('cohortRetentionTable');
  
  if (!tableBody) return;

  // Sample cohort data
  const cohortData = [
    { cohort: 'Jan 2024', week1: 45, week2: 32, week3: 28, week4: 24, month2: 18 },
    { cohort: 'Feb 2024', week1: 52, week2: 38, week3: 31, week4: 27, month2: 22 },
    { cohort: 'Mar 2024', week1: 48, week2: 35, week3: 30, week4: 26, month2: 20 },
    { cohort: 'Apr 2024', week1: 55, week2: 40, week3: 34, week4: 29, month2: 25 }
  ];

  tableBody.innerHTML = cohortData.map(cohort => `
    <tr class="border-b border-gray-100">
      <td class="p-4 font-medium text-gray-800">${cohort.cohort}</td>
      <td class="p-4 text-center">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">${cohort.week1}%</span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">${cohort.week2}%</span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">${cohort.week3}%</span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">${cohort.week4}%</span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">${cohort.month2}%</span>
      </td>
    </tr>
  `).join('');
}

/**
 * Export analytics to CSV
 */
function exportAnalyticsCSV() {
  const csvData = [
    ['Date', 'Gross Revenue', 'Net Profit', 'Orders'],
    ['Mon', '125000', '25000', '45'],
    ['Tue', '138000', '28000', '52'],
    ['Wed', '142000', '32000', '48'],
    ['Thu', '156000', '35000', '55'],
    ['Fri', '168000', '42000', '61'],
    ['Sat', '189000', '51000', '68'],
    ['Sun', '215000', '62000', '79']
  ];

  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'analytics_export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Load analytics with different periods
 */
async function loadAnalytics(period = 7) {
  try {
    console.log(`Loading analytics for last ${period} days`);
    
    // In a real app, fetch data based on period
    // For now, just re-render with the same data
    renderRevenueChart();
    renderCustomerSegmentation();
    renderRegionalBreakdown();
    
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Initialize when module is loaded
if (typeof document !== 'undefined' && document.readyState === 'DOMContentLoaded') {
  // Already loaded, initialize now
} else {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics module ready');
  });
}

// Export functions for global access
if (typeof window !== 'undefined') {
  window.initAnalytics = initAnalytics;
  window.renderRevenueChart = renderRevenueChart;
  window.renderCustomerSegmentation = renderCustomerSegmentation;
  window.renderRegionalBreakdown = renderRegionalBreakdown;
  window.renderBestItemsTable = renderBestItemsTable;
  window.renderCustomerInsights = renderCustomerInsights;
  window.loadCohortRetention = loadCohortRetention;
  window.exportAnalyticsCSV = exportAnalyticsCSV;
  window.loadAnalytics = loadAnalytics;
}
