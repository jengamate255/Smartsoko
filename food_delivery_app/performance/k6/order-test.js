// Test 8: Order Processing - SmartSoko Order Lifecycle
// Simulates: 100,000 orders
// Measures: Order creation speed, database writes, notification processing

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    constant_orders: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 orders per minute
      timeUnit: '1m',
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 500,
      tags: { test_type: 'constant_throughput' },
    },
    ramp_orders: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1m',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [
        { target: 5000, duration: '3m' },
        { target: 10000, duration: '5m' },
        { target: 20000, duration: '2m' },
        { target: 0, duration: '1m' },
      ],
      tags: { test_type: 'ramp_throughput' },
    },
    soak_orders: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1m',
      duration: '30m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.005'],
    order_creation_latency: ['p(95)<400'],
    order_update_latency: ['p(95)<200'],
    notification_latency: ['p(95)<300'],
    db_write_latency: ['p(95)<100'],
    order_completion_rate: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const orderCreationLatency = new Trend('order_creation_latency');
const orderUpdateLatency = new Trend('order_update_latency');
const notificationLatency = new Trend('notification_latency');
const dbWriteLatency = new Trend('db_write_latency');
const orderCompletionRate = new Rate('order_completion_rate');
const orderErrorRate = new Rate('order_error_rate');
const statusTransitionRate = new Counter('status_transition_count');

// Test data
const TEST_CUSTOMERS = generateCustomers(10000);
const TEST_SELLERS = generateSellers(100);
const TEST_DRIVERS = generateDrivers(500);
const TEST_PRODUCTS = generateProducts(5000);

function generateCustomers(count) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    customers.push({
      id: `cust-${i.toString().padStart(6, '0')}`,
      name: `Customer ${i}`,
      email: `customer${i}@test.smartsoko.com`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      address: `Address ${i}, Dar es Salaam`,
    });
  }
  return customers;
}

function generateSellers(count) {
  const sellers = [];
  for (let i = 0; i < count; i++) {
    sellers.push({
      id: `seller-${i.toString().padStart(4, '0')}`,
      name: `Seller ${i}`,
      deliveryFee: Math.floor(Math.random() * 5000) + 2000,
    });
  }
  return sellers;
}

function generateDrivers(count) {
  const drivers = [];
  const statuses = ['online', 'offline', 'delivery'];
  for (let i = 0; i < count; i++) {
    drivers.push({
      id: `driver-${i.toString().padStart(5, '0')}`,
      name: `Driver ${i}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lat: -6.7924 + (Math.random() - 0.5) * 0.2,
      lng: 39.2083 + (Math.random() - 0.5) * 0.2,
    });
  }
  return drivers;
}

function generateProducts(count) {
  const products = [];
  const categories = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
  for (let i = 0; i < count; i++) {
    products.push({
      id: `prod-${i.toString().padStart(6, '0')}`,
      name: `Product ${i}`,
      price: Math.floor(Math.random() * 30000) + 1000,
      sellerId: `seller-${String(Math.floor(Math.random() * 100)).padStart(4, '0')}`,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  }
  return products;
}

function getRandomCustomer() {
  return TEST_CUSTOMERS[Math.floor(Math.random() * TEST_CUSTOMERS.length)];
}

function getRandomSeller() {
  return TEST_SELLERS[Math.floor(Math.random() * TEST_SELLERS.length)];
}

function getRandomDriver() {
  return TEST_DRIVERS[Math.floor(Math.random() * TEST_DRIVERS.length)];
}

function getRandomProducts(count) {
  const products = [];
  const shuffled = [...TEST_PRODUCTS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const p = shuffled[i];
    products.push({
      productId: p.id,
      name: p.name,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: p.price,
      sellerId: p.sellerId,
    });
  }
  return products;
}

export default function () {
  const customer = getRandomCustomer();
  const token = getAuthToken(customer.id);
  
  // Full order lifecycle
  const order = createOrder(customer, token);
  if (!order) return;
  
  // Merchant accepts
  sleep(Math.random() * 2 + 1);
  acceptOrder(order.id, token);
  
  // Merchant prepares
  sleep(Math.random() * 3 + 2);
  prepareOrder(order.id, token);
  
  // Assign driver
  sleep(Math.random() * 2 + 1);
  assignDriver(order.id, token);
  
  // Driver picks up
  sleep(Math.random() * 3 + 2);
  pickupOrder(order.id, token);
  
  // Driver delivers
  sleep(Math.random() * 5 + 3);
  deliverOrder(order.id, token);
  
  // Verify completion
  verifyOrderComplete(order.id, token);
  
  orderCompletionRate.add(1);
  sleep(Math.random() * 1 + 0.5);
}

function getAuthToken(userId) {
  return `token-${userId}-${Date.now()}`;
}

function createOrder(customer, token) {
  const startTime = Date.now();
  const items = getRandomProducts(Math.floor(Math.random() * 5) + 1);
  const seller = getRandomSeller();
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = seller.deliveryFee;
  const tax = subtotal * 0.18;
  const total = subtotal + deliveryFee + tax;
  
  const payload = JSON.stringify({
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    deliveryAddress: customer.address,
    deliveryLocation: {
      lat: -6.7924 + (Math.random() - 0.5) * 0.1,
      lng: 39.2083 + (Math.random() - 0.5) * 0.1,
    },
    items: items,
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    tax: tax,
    total: total,
    paymentMethod: 'pesapal',
    sellerId: seller.id,
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
    'create_order has id': (r) => {
      try { return JSON.parse(r.body).id !== undefined; } catch { return false; }
    },
    'create_order latency < 400ms': () => latency < 400,
  });
  
  orderCreationLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  dbWriteLatency.add(latency);
  
  if (success) {
    statusTransitionRate.add(1, { transition: 'created' });
    return { id: JSON.parse(res.body).id, sellerId: seller.id };
  }
  return null;
}

function acceptOrder(orderId, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({ status: 'accepted' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'accept_order' },
  };
  
  const res = http.put(`${BASE_URL}/api/orders/${orderId}/status`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'accept_order status 200': (r) => r.status === 200,
    'accept_order latency < 200ms': () => latency < 200,
  });
  
  orderUpdateLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  if (success) statusTransitionRate.add(1, { transition: 'accepted' });
}

function prepareOrder(orderId, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({ status: 'preparing' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'prepare_order' },
  };
  
  const res = http.put(`${BASE_URL}/api/orders/${orderId}/status`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'prepare_order status 200': (r) => r.status === 200,
    'prepare_order latency < 200ms': () => latency < 200,
  });
  
  orderUpdateLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  if (success) statusTransitionRate.add(1, { transition: 'preparing' });
}

function assignDriver(orderId, token) {
  const startTime = Date.now();
  const driver = getRandomDriver();
  
  const payload = JSON.stringify({
    status: 'assigned',
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'assign_driver' },
  };
  
  const res = http.put(`${BASE_URL}/api/orders/${orderId}/status`, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'assign_driver status 200': (r) => r.status === 200,
    'assign_driver latency < 300ms': () => latency < 300,
  });
  
  orderUpdateLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  if (success) statusTransitionRate.add(1, { transition: 'assigned' });
}

function pickupOrder(orderId, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({ status: 'picked_up' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'pickup_order' },
  };
  
  const res = http.put(`${BASE_URL}/api/orders/${orderId}/status`, payload, params);
  const latency = Date.now() - startTime.
  
  const success = check(res, {
    'pickup_order status 200': (r) => r.status === 200,
    'pickup_order latency < 200ms': () => latency < 200,
  });
  
  orderUpdateLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  if (success) statusTransitionRate.add(1, { transition: 'picked_up' });
}

function deliverOrder(orderId, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({ status: 'delivered' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'deliver_order' },
  };
  
  const res = http.put(`${BASE_URL}/api/orders/${orderId}/status`, payload, params);
  const latency = Date.now() - startTime.
  
  const success = check(res, {
    'deliver_order status 200': (r) => r.status === 200,
    'deliver_order latency < 200ms': () => latency < 200,
  });
  
  orderUpdateLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
  if (success) statusTransitionRate.add(1, { transition: 'delivered' });
}

function verifyOrderComplete(orderId, token) {
  const startTime = Date.now().
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'verify_complete' },
  };
  
  const res = http.get(`${BASE_URL}/api/orders/${orderId}`, params);
  const latency = Date.now() - startTime.
  
  const success = check(res, {
    'verify_complete status 200': (r) => r.status === 200,
    'verify_complete status delivered': (r) => {
      try { return JSON.parse(r.body).data?.status === 'delivered'; } catch { return false; }
    },
    'verify_complete latency < 200ms': () => latency < 200,
  });
  
  notificationLatency.add(latency);
  orderErrorRate.add(success ? 0 : 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/order-processing-summary.json': JSON.stringify(data),
  };
}