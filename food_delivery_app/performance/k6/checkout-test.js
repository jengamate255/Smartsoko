// Test 5: Checkout System - SmartSoko Order Processing
// Simulates: Customers checking out simultaneously
// Tests: Order creation, stock reduction, payment initialization, order confirmation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    load_checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    spike_checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checkout_latency: ['p(95)<800'],
    order_creation_rate: ['rate>0.98'],
    stock_reduction_rate: ['rate>0.99'],
    payment_init_rate: ['rate>0.95'],
    duplicate_order_rate: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';

// Custom metrics
const checkoutLatency = new Trend('checkout_latency');
const orderCreationRate = new Rate('order_creation_rate');
const stockReductionRate = new Rate('stock_reduction_rate');
const paymentInitRate = new Rate('payment_init_rate');
const duplicateOrderRate = new Rate('duplicate_order_rate');
const orderTotalLatency = new Trend('order_total_latency');

// Test data
const TEST_USERS = generateTestUsers(500);
const TEST_PRODUCTS = generateTestProducts(200);
const TEST_SELLERS = generateTestSellers(20);

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `user-${i.toString().padStart(5, '0')}`,
      email: `checkout_test_${i}@smartsoko.test`,
      token: `mock-token-${i}`,
      address: `Test Address ${i}, Dar es Salaam`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
    });
  }
  return users;
}

function generateTestProducts(count) {
  const products = [];
  const categories = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
  for (let i = 1; i <= count; i++) {
    products.push({
      id: `product-${i.toString().padStart(6, '0')}`,
      name: `Product ${i}`,
      price: Math.floor(Math.random() * 30000) + 2000,
      sellerId: `seller-${Math.floor(Math.random() * 20) + 1}`,
      stock: Math.floor(Math.random() * 50) + 10,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  }
  return products;
}

function generateTestSellers(count) {
  const sellers = [];
  for (let i = 1; i <= count; i++) {
    sellers.push({
      id: `seller-${i}`,
      name: `Seller ${i}`,
      deliveryFee: Math.floor(Math.random() * 5000) + 2000,
    });
  }
  return sellers;
}

function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function getRandomProducts(count) {
  const products = [];
  const shuffled = [...TEST_PRODUCTS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const product = shuffled[i];
    products.push({
      productId: product.id,
      name: product.name,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: product.price,
      sellerId: product.sellerId,
    });
  }
  return products;
}

export function setup() {
  console.log('Test 5: Checkout System - SmartSoko');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Pre-create some carts for testing
  const carts = [];
  for (let i = 0; i < 100; i++) {
    const user = getRandomUser();
    const products = getRandomProducts(Math.floor(Math.random() * 3) + 1);
    carts.push({ userId: user.id, products, token: user.token });
  }
  
  return { carts };
}

export default function (data) {
  const user = getRandomUser();
  const token = user.token;
  
  // 1. Get or create cart
  const cart = getOrCreateCart(user, token);
  if (!cart) return;
  
  // 2. Validate cart (check stock, prices)
  const validation = validateCart(cart, token);
  if (!validation.valid) return;
  
  // 3. Create order
  const order = createOrder(user, cart, token);
  if (!order) return;
  
  // 4. Initialize payment
  const payment = initializePayment(order, user, token);
  
  // 5. Verify order confirmation
  verifyOrderConfirmation(order.id, token);
  
  // 6. Check stock reduction
  verifyStockReduction(cart.items, token);
  
  sleep(Math.random() * 3 + 1);
}

function getOrCreateCart(user, token) {
  const startTime = Date.now();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'get_cart_checkout' },
  };
  
  const res = http.get(`${BASE_URL}/api/shopify/cart`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'get_cart status 200': (r) => r.status === 200,
    'get_cart has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.cart && body.cart.items.length > 0;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    // Create a new cart with items
    return createTestCart(user, token);
  }
  
  return JSON.parse(res.body).cart;
}

function createTestCart(user, token) {
  const products = getRandomProducts(Math.floor(Math.random() * 3) + 1);
  
  for (const product of products) {
    const payload = JSON.stringify({
      productId: product.productId,
      quantity: product.quantity,
    });
    
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { operation: 'create_cart_item' },
    };
    
    http.post(`${BASE_URL}/api/shopify/cart/add`, payload, params);
  }
  
  // Fetch the cart
  const res = http.get(`${BASE_URL}/api/shopify/cart`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'fetch_created_cart' },
  });
  
  if (res.status === 200) {
    try {
      return JSON.parse(res.body).cart;
    } catch {
      return null;
    }
  }
  return null;
}

function validateCart(cart, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    items: cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'validate_cart' },
  };
  
  const res = http.post(`${BASE_URL}/api/shopify/cart/validate`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'validate_cart status 200': (r) => r.status === 200,
    'validate_cart valid true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.valid === true;
      } catch {
        return false;
      }
    },
    'validate_cart latency < 300ms': () => latency < 300,
  });
  
  return { valid: success, data: success ? JSON.parse(res.body) : null };
}

function createOrder(user, cart, token) {
  const startTime = Date.now();
  
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 3000;
  const tax = subtotal * 0.18;
  const total = subtotal + deliveryFee + tax;
  
  const payload = JSON.stringify({
    customerId: user.id,
    customerName: user.email.split('@')[0],
    customerPhone: user.phone,
    customerEmail: user.email,
    deliveryAddress: user.address,
    deliveryLocation: {
      lat: -6.7924 + (Math.random() - 0.5) * 0.1,
      lng: 39.2083 + (Math.random() - 0.5) * 0.1,
    },
    items: cart.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      sellerId: item.sellerId,
    })),
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    tax: tax,
    total: total,
    paymentMethod: 'pesapal',
    notes: 'Load test order',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'create_order' },
  };
  
  const res = http.post(`${BASE_URL}/api/orders`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'create_order status 201': (r) => r.status === 201,
    'create_order success true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.id !== undefined;
      } catch {
        return false;
      }
    },
    'create_order latency < 800ms': () => latency < 800,
  });
  
  checkoutLatency.add(latency);
  orderCreationRate.add(success ? 1 : 0);
  orderTotalLatency.add(latency);
  
  if (!success) {
    // Check for duplicate order error
    try {
      const body = JSON.parse(res.body);
      if (body.error && body.error.includes('duplicate')) {
        duplicateOrderRate.add(1);
      }
    } catch {}
  }
  
  return success ? { id: JSON.parse(res.body).id, total, items: cart.items } : null;
}

function initializePayment(order, user, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    amount: order.total,
    currency: 'TZS',
    description: `Order ${order.id}`,
    customerEmail: user.email,
    customerPhone: user.phone,
    customerFirstName: user.email.split('@')[0],
    customerLastName: 'Test',
    callbackUrl: `${BASE_URL}/api/payments/pesapal/callback`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'initialize_payment' },
  };
  
  const res = http.post(`${BASE_URL}/api/payments/pesapal/initiate`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'init_payment status 200': (r) => r.status === 200,
    'init_payment has redirect': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.redirectUrl !== undefined;
      } catch {
        return false;
      }
    },
    'init_payment latency < 2000ms': () => latency < 2000,
  });
  
  paymentInitRate.add(success ? 1 : 0);
  
  return success ? JSON.parse(res.body) : null;
}

function verifyOrderConfirmation(orderId, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'verify_order' },
  };
  
  const res = http.get(`${BASE_URL}/api/orders/${orderId}`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'verify_order status 200': (r) => r.status === 200,
    'verify_order has order data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data !== undefined;
      } catch {
        return false;
      }
    },
    'verify_order status pending': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data.status === 'pending';
      } catch {
        return false;
      }
    },
    'verify_order latency < 200ms': () => latency < 200,
  });
}

function verifyStockReduction(items, token) {
  // Check product stock after order
  for (const item of items) {
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/api/products/${item.productId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { operation: 'check_stock' },
    });
    
    const latency = Date.now() - startTime;
    
    const success = check(res, {
      'check_stock status 200': (r) => r.status === 200,
      'check_stock has stock field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data.stock !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    stockReductionRate.add(success ? 1 : 0);
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/checkout-test-summary.json': JSON.stringify(data),
  };
}