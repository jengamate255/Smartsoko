// Test 4: Cart System - SmartSoko Cart Operations
// Simulates: Adding products, removing products, updating quantities
// Tests cart persistence, session management, and concurrent operations

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
    load_cart: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    stress_cart: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 2000 },
        { duration: '10m', target: 5000 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
    cart_add_latency: ['p(95)<200'],
    cart_update_latency: ['p(95)<150'],
    cart_remove_latency: ['p(95)<100'],
    cart_fetch_latency: ['p(95)<100'],
    cart_consistency_rate: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';

// Custom metrics
const cartAddLatency = new Trend('cart_add_latency');
const cartUpdateLatency = new Trend('cart_update_latency');
const cartRemoveLatency = new Trend('cart_remove_latency');
const cartFetchLatency = new Trend('cart_fetch_latency');
const cartConsistencyRate = new Rate('cart_consistency_rate');
const cartErrorRate = new Rate('cart_error_rate');

// Test products (simulating real products from database)
const TEST_PRODUCTS = generateTestProducts(1000);

function generateTestProducts(count) {
  const products = [];
  const categories = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
  for (let i = 1; i <= count; i++) {
    products.push({
      id: `product-${i.toString().padStart(6, '0')}`,
      name: `Test Product ${i}`,
      price: Math.floor(Math.random() * 50000) + 1000,
      category: categories[Math.floor(Math.random() * categories.length)],
      sellerId: `seller-${Math.floor(Math.random() * 50) + 1}`,
      stock: Math.floor(Math.random() * 100) + 1,
    });
  }
  return products;
}

function getRandomProduct() {
  return TEST_PRODUCTS[Math.floor(Math.random() * TEST_PRODUCTS.length)];
}

function getAuthToken() {
  // In real scenario, this would be a valid Firebase ID token
  // For load testing, we use a mock token or pre-authenticated session
  return __ENV.AUTH_TOKEN || 'mock-firebase-token-for-load-test';
}

export function setup() {
  console.log('Test 4: Cart System - SmartSoko');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Create test users and pre-populate some carts
  const users = [];
  for (let i = 0; i < 100; i++) {
    users.push({
      id: `test-user-${i}`,
      token: getAuthToken(),
    });
  }
  return { users };
}

export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  const token = user.token;
  
  // Cart operations sequence
  const cartId = `cart-${user.id}`;
  
  // 1. Fetch cart (initialize if needed)
  const cart = testFetchCart(cartId, token);
  
  // 2. Add random products (1-5 items)
  const addCount = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < addCount; i++) {
    const product = getRandomProduct();
    const quantity = Math.floor(Math.random() * 3) + 1;
    testAddToCart(cartId, product, quantity, token);
  }
  
  // 3. Fetch cart to verify additions
  testFetchCart(cartId, token);
  
  // 4. Update quantities (randomly)
  if (Math.random() < 0.5) {
    testUpdateQuantity(cartId, token);
  }
  
  // 5. Remove random item
  if (Math.random() < 0.3) {
    testRemoveFromCart(cartId, token);
  }
  
  // 6. Verify cart consistency
  testCartConsistency(cartId, token);
  
  // 7. Test cart merge (simulate login)
  if (Math.random() < 0.1) {
    testCartMerge(user.id, token);
  }
  
  // 8. Clear cart (simulate checkout or abandon)
  if (Math.random() < 0.05) {
    testClearCart(cartId, token);
  }
  
  sleep(Math.random() * 2 + 0.5);
}

function testFetchCart(cartId, token) {
  const startTime = Date.now();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'fetch_cart' },
  };
  
  const res = http.get(`${BASE_URL}/api/shopify/cart`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'fetch_cart status 200': (r) => r.status === 200,
    'fetch_cart has items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.cart?.items);
      } catch {
        return false;
      }
    },
    'fetch_cart latency < 100ms': () => latency < 100,
  });
  
  cartFetchLatency.add(latency);
  cartErrorRate.add(success ? 0 : 1);
  
  return success ? JSON.parse(res.body).cart : null;
}

function testAddToCart(cartId, product, quantity, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    productId: product.id,
    quantity: quantity,
    variantId: null,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'add_to_cart' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/cart/add`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'add_to_cart status 200/201': (r) => r.status === 200 || r.status === 201,
    'add_to_cart success true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'add_to_cart latency < 200ms': () => latency < 200,
  });
  
  cartAddLatency.add(latency);
  cartErrorRate.add(success ? 0 : 1);
  
  return success;
}

function testUpdateQuantity(cartId, token) {
  const startTime = Date.now();
  
  // First fetch cart to get items
  const cartRes = http.get(`${BASE_URL}/api/shopify/cart`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'fetch_for_update' },
  });
  
  let cart = null;
  try {
    cart = JSON.parse(cartRes.body).cart;
  } catch {
    return false;
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return false;
  }
  
  // Update random item
  const item = cart.items[Math.floor(Math.random() * cart.items.length)];
  const newQuantity = Math.floor(Math.random() * 5) + 1;
  
  const payload = JSON.stringify({
    productId: item.productId,
    quantity: newQuantity,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'update_quantity' },
  };
  
  const res = http.put(`${BASE_URL}/api/shopify/cart/update`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'update_quantity status 200': (r) => r.status === 200,
    'update_quantity success true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'update_quantity latency < 150ms': () => latency < 150,
  });
  
  cartUpdateLatency.add(latency);
  cartErrorRate.add(success ? 0 : 1);
  
  return success;
}

function testRemoveFromCart(cartId, token) {
  const startTime = Date.now();
  
  // Fetch cart first
  const cartRes = http.get(`${BASE_URL}/api/shopify/cart`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'fetch_for_remove' },
  });
  
  let cart = null;
  try {
    cart = JSON.parse(cartRes.body).cart;
  } catch {
    return false;
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return false;
  }
  
  // Remove random item
  const item = cart.items[Math.floor(Math.random() * cart.items.length)];
  
  const payload = JSON.stringify({
    productId: item.productId,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'remove_from_cart' },
  };
  
  const res = http.del(`${BASE_URL}/api/shopify/cart/remove`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'remove_from_cart status 200': (r) => r.status === 200,
    'remove_from_cart success true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'remove_from_cart latency < 100ms': () => latency < 100,
  });
  
  cartRemoveLatency.add(latency);
  cartErrorRate.add(success ? 0 : 1);
  
  return success;
}

function testCartConsistency(cartId, token) {
  const startTime = Date.now();
  
  // Fetch cart multiple times to verify consistency
  const reads = 3;
  let consistent = true;
  let lastItems = null;
  
  for (let i = 0; i < reads; i++) {
    const res = http.get(`${BASE_URL}/api/shopify/cart`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { operation: 'consistency_check' },
    });
    
    try {
      const cart = JSON.parse(res.body).cart;
      const items = cart.items.map(item => `${item.productId}:${item.quantity}`).sort().join(',');
      
      if (lastItems !== null && items !== lastItems) {
        consistent = false;
      }
      lastItems = items;
    } catch {
      consistent = false;
    }
  }
  
  const latency = Date.now() - startTime;
  
  cartConsistencyRate.add(consistent ? 1 : 0);
  
  check(null, {
    'cart_consistency maintained': () => consistent,
    'cart_consistency latency < 500ms': () => latency < 500,
  });
}

function testCartMerge(userId, token) {
  const startTime = Date.now();
  
  // Simulate anonymous cart merge on login
  const payload = JSON.stringify({
    anonymousCartId: `anon-${userId}`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'cart_merge' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/cart/merge`, payload, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'cart_merge status 200': (r) => r.status === 200,
    'cart_merge latency < 500ms': () => latency < 500,
  });
  
  cartFetchLatency.add(latency);
}

function testClearCart(cartId, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'clear_cart' },
  };
  
  const res = http.del(`${BASE_URL}/api/shopify/cart/clear`, null, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'clear_cart status 200': (r) => r.status === 200,
    'clear_cart latency < 200ms': () => latency < 200,
  });
  
  cartRemoveLatency.add(latency);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/cart-test-summary.json': JSON.stringify(data),
  };
}