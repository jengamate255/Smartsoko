// Analytics helper for merchant page
// Provides functions to load analytics data and prepare it for charts

export async function loadAnalytics() {
  const auth = window.auth;
  const db = window.db;
  
  if (!auth || !auth.currentUser || !db) {
    console.error('Analytics: Auth or DB not available');
    return null;
  }
  
  const merchantId = auth.currentUser.uid;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  
  try {
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    // Simple query with just merchantId to avoid composite index requirements
    const ordersQuery = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId)
    );
    
    const snapshot = await getDocs(ordersQuery);
    
    const weeklyData = [];
    const dailyTotals = {};
    
    // Generate 7 days with default zero values
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyTotals[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }
    
    // Process orders data
    snapshot.docs.forEach(doc => {
      const order = doc.data();
      const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      
      const dateStr = createdAt.toISOString().split('T')[0];
      
      if (createdAt >= startOfWeek && dailyTotals[dateStr]) {
        dailyTotals[dateStr].revenue += order.totalAmount || 0;
        dailyTotals[dateStr].orders += 1;
      }
    });
    
    // Convert to array and sort by date
    const analyticsData = Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return analyticsData;
    
  } catch (error) {
    console.error('Analytics Error:', error);
    return null;
  }
}

// Function to render analytics chart with given data
function renderChart(data, canvasId) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  
  if (window.analyticsChart) {
    window.analyticsChart.destroy();
  }
  
  window.analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Revenue',
          data: data.map(d => d.revenue),
          borderColor: '#022D1D',
          backgroundColor: 'rgba(9, 29, 46, 0.1)',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Orders',
          data: data.map(d => d.orders),
          borderColor: '#064E3B',
          backgroundColor: 'rgba(148, 74, 12, 0.1)',
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { 
          display: true, 
          text: 'Weekly Performance (Last 7 Days)',
          color: '#022D1D'
        },
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Amount / Count' },
          ticks: {
            callback: (value) => {
              if (value >= 1000) return 'TSh ' + (value / 1000) + 'k';
              return value;
            }
          }
        }
      }
    }
  });
}

export { renderChart };