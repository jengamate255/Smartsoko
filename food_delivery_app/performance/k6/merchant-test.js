// Test 7: Merchant Dashboard - SmartSoko Merchant Operations
// Simulates: 10,000 merchants
// Actions: Login, add products, update prices, update stock, view orders

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    merchant_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '10m', target: 2000 },
        { duration: '5m', target: 5000 },
        { duration: '5m', target: 10000 },
        { duration: '3m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    merchant_soak: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30m',
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    merchant_login_latency: ['p(95)<300'],
    product_create_latency: ['p(95)<400'],
    product_update_latency: ['p(95)<300'],
    stock_update_latency: ['p(95)<200'],
    analytics_latency: ['p(95)<800'],
    order_view_latency: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const merchantLoginLatency = new Trend('merchant_login_latency');
const productCreateLatency = new Trend('product_create_latency');
const productUpdateLatency = new Trend('product_update_latency');
const stockUpdateLatency = new Trend('stock_update_latency');
const analyticsLatency = new Trend('analytics_latency');
const orderViewLatency = new Trend('order_view_latency');
const merchantErrorRate = new Rate('merchant_error_rate');

// Test data
const MERCHANTS = generateMerchants(10000);
const PRODUCT_TEMPLATES = generateProductTemplates(100);

function generateMerchants(count) {
  const merchants = [];
  const categories = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
  for (let i = 1; i <= count; i++) {
    merchants.push({
      id: `merchant-${i.toString().padStart(5, '0')}`,
      email: `merchant${i}@smartsoko.test`,
      token: `merchant-token-${i}`,
      name: `Merchant ${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  }
  return merchants;
}

function generateProductTemplates(count) {
  const products = [];
  const names = ['Chicken', 'Beef', 'Fish', 'Rice', 'Beans', 'Tomatoes', 'Milk', 'Bread', 'Eggs', 'Cheese'];
  for (let i = 1; i <= count; i++) {
    products.push({
      name: `${names[i % names.length]} ${i}`,
      price: Math.floor(Math.random() * 30000) + 2000,
      category: ['food', 'dairy', 'fruits', 'groceries', 'bakery'][i % 5],
      description: `Product ${i} description`,
    });
  }
  return products;
}

function getRandomMerchant() {
  return MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
}

function getRandomProduct() {
  return PRODUCT_TEMPLATES[Math.floor(Math.random() * PRODUCT_TEMPLATES.length)];
}

export default function () {
  const merchant = getRandomMerchant();
  const token = merchant.token;
  
  // 1. Login / Verify token
  testMerchantLogin(merchant, token);
  
  // 2. View dashboard analytics
  testViewAnalytics(merchant, token);
  
  // 3. Add new product (10% of requests)
  if (Math.random() < 0.1) {
    testAddProduct(merchant, token);
  }
  
  // 4. Update product price/stock (30% of requests)
  if (Math.random() < 0.3) {
    testUpdateProduct(merchant, token);
  }
  
  // 5. Bulk stock update (10% of requests)
  if (Math.random() < 0.1) {
    testBulkStockUpdate(merchant, token);
  }
  
  // 6. View orders (50% of requests)
  if (Math.random() < 0.5) {
    testViewOrders(merchant, token);
  }
  
  // 7. View inventory
  if (Math.random() < 0.2) {
    testViewInventory(merchant, token);
  }
  
  // 8. Create coupon (5% of requests)
  if (Math.random() < 0.05) {
    testCreateCoupon(merchant, token);
  }
  
  // 9. Create bundle (5% of requests)
  if (Math.random() < 0.05) {
    testCreateBundle(merchant, token);
  }
  
  sleep(Math.random() * 3 + 1);
}

function testMerchantLogin(merchant, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'merchant_login' },
  };
  
  const res = http.get(`${BASE_URL}/api/auth/verify`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'merchant_login status 200': (r) => r.status === 200,
    'merchant_login role merchant': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.user.role === 'merchant';
      } catch {
        return false;
      }
    },
    'merchant_login latency < 300ms': () => latency < 300,
  });
  
  merchantLoginLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testViewAnalytics(merchant, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'view_analytics' },
  };
  
  // Test different time periods
  const days = [1, 7, 30, 90][Math.floor(Math.random() * 4)];
  const res = http.get(`${BASE_URL}/api/vendor/analytics?days=${days}&merchantId=${merchant.id}`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'analytics status 200': (r) => r.status === 200,
    'analytics has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.analytics !== undefined;
      } catch {
        return false;
      }
    },
    'analytics latency < 800ms': () => latency < 800,
  });
  
  analyticsLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testAddProduct(merchant, token) {
  const product = getRandomProduct();
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    name: `${product.name} ${Date.now()}`,
    description: product.description,
    price: product.price + Math.floor(Math.random() * 1000),
    category: product.category,
    imageUrl: `https://images.unsplash.com/photo-${1568901346375 + Math.floor(Math.random() * 1000000)}?w=800`,
    isAvailable: true,
    inStock: true,
    preparationTime: Math.floor(Math.random() * 60) + 15,
    tags: ['fresh', 'popular'],
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'add_product' },
  };
  
  const res = http.post(`${BASE_URL}/api/vendor/products`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'add_product status 201': (r) => r.status === 201,
    'add_product has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.id !== undefined;
      } catch {
        return false;
      }
    },
    'add_product latency < 400ms': () => latency < 400,
  });
  
  productCreateLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testUpdateProduct(merchant, token) {
  const startTime = Date.now();
  
  // First get merchant's products
  const listRes = http.get(`${BASE_URL}/api/vendor/products?merchantId=${merchant.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'list_products_for_update' },
  });
  
  let productId = null;
  try {
    const body = JSON.parse(listRes.body);
    if (body.success && body.data && body.data.length > 0) {
      productId = body.data[Math.floor(Math.random() * body.data.length)].id;
    }
  } catch {}
  
  if (!productId) return;
  
  const payload = JSON.stringify({
    price: Math.floor(Math.random() * 30000) + 2000,
    inStock: Math.random() > 0.2,
    preparationTime: Math.floor(Math.random() * 60) + 10,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'update_product' },
  };
  
  const res = http.put(`${BASE_URL}/api/vendor/products/${productId}`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'update_product status 200': (r) => r.status === 200,
    'update_product latency < 300ms': () => latency < 300,
  });
  
  productUpdateLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testBulkStockUpdate(merchant, token) {
  const startTime = Date.now();
  
  // Get multiple products
  const listRes = http.get(`${BASE_URL}/api/vendor/products?merchantId=${merchant.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'list_products_bulk' },
  });
  
  let productIds = [];
  try {
    const body = JSON.parse(listRes.body);
    if (body.success && body.data && body.data.length > 0) {
      const shuffled = [...body.data].sort(() => Math.random() - 0.5);
      productIds = shuffled.slice(0, Math.min(10, shuffled.length)).map(p => p.id);
    }
  } catch {}
  
  if (productIds.length === 0) return;
  
  const updates = productIds.map(id => ({
    type: 'product',
    id: id,
    stock: Math.floor(Math.random() * 100),
  }));
  
  const payload = JSON.stringify({ updates });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'bulk_stock_update' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/inventory/bulk`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'bulk_stock status 200': (r) => r.status === 200,
    'bulk_stock updated count': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.updated === productIds.length;
      } catch {
        return false;
      }
    },
    'bulk_stock latency < 500ms': () => latency < 500,
  });
  
  stockUpdateLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testViewOrders(merchant, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'view_orders' },
  };
  
  const res = http.get(`${BASE_URL}/api/shopify/orders?merchantId=${merchant.id}&limit=50`, params);
  const latency = Date.now() - startTime.
  
  const success = check(res, {
    'view_orders status 200': (r) => r.status === 200,
    'view_orders has orders': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.orders);
      } catch {
        return false;
      }
    },
    'view_orders latency < 300ms': () => latency < 300,
  });
  
  orderViewLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testViewInventory(merchant, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'view_inventory' },
  };
  
  const res = http.get(`${BASE_URL}/api/shopify/inventory?merchantId=${merchant.id}`, params);
  const latency = Date.now() - startTime.
  
  const success = check(res, {
    'view_inventory status 200': (r) => r.status === 200,
    'view_inventory has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.inventory !== undefined;
      } catch {
        return false;
      }
    },
    'view_inventory latency < 400ms': () => latency < 400,
  });
  
  analyticsLatency.add(latency);
  merchantErrorRate.add(success ? 0 : 1);
}

function testCreateCoupon(merchant, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    code: `MERCH${merchant.id.slice(-5)}${Date.now()}`.toUpperCase(),
    type: Math.random() > 0.5 ? 'percentage' : 'fixed',
    value: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 5000) + 1000,
    minPurchase: Math.floor(Math.random() * 20000) + 5000,
    maxUses: Math.floor(Math.random() * 100) + 10,
    merchantId: merchant.id,
    isActive: true,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'create_coupon' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/coupons`, payload, params);
  const latency = Date.now() - startTime.
  
  check(res, {
    'create_coupon status 201': (r) => r.status === 201,
    'create_coupon latency < 300ms': () => latency < 300,
  });
  
  merchantErrorRate.add(success ? 0 : 1);
}

function testCreateBundle(merchant, token) {
  // Get 2+ products for bundle
  const listRes = http.get(`${BASE_URL}/api/vendor/products?merchantId=${merchant.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'list_products_bundle' },
  });
  
  let productIds = [];
  try {
    const body = JSON.parse(listRes.body);
    if (body.success && body.data && body.data.length >= 2) {
      const shuffled = [...body.data].sort(() => Math.random() - 0.5);
      productIds = shuffled.slice(0, Math.min(5, shuffled.length)).map(p => p.id);
    }
  } catch {}
  
  if (productIds.length < 2) return;
  
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    name: `Bundle ${Date.now()}`,
    description: 'Special bundle offer',
    productIds: productIds,
    discountPercent: Math.floor(Math.random() * 20) + 10,
    merchantId: merchant.id,
    isActive: true,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'create_bundle' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/bundles`, payload, params);
  const latency = Date.now() - startTime.
  
  check(res, {
    'create_bundle status 201': (r) => r.status === 201,
    'create_bundle latency < 500ms': () => latency < 500,
  });
  
  merchantErrorRate.add(success ? 0 : 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/merchant-dashboard-summary.json': JSON.stringify(data),
  };
}