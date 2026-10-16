// k6 Load Test Configuration for SmartSoko API
// Run: k6 run --vus 50 --duration 5m load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

// Custom metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },    // Steady load
    { duration: '30s', target: 100 },  // Stress
    { duration: '1m', target: 50 },    // Sustained
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],     // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],       // Error rate < 1%
    errors: ['rate<0.05'],                // Custom error rate < 5%
  },
};

// Test data
const testUsers = [
  { phone: '+255700000001', password: 'testpass123' },
  { phone: '+255700000002', password: 'testpass123' },
];

function getAuthToken() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const res = http.post(`${BASE_URL}/api/${API_VERSION}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': `test_${Date.now()}` },
  });
  check(res, { 'login success': (r) => r.status === 200 });
  if (res.status === 200) {
    authLatency.add(res.timings.duration);
    return res.json('token') || res.json('accessToken');
  }
  return null;
}

export default function () {
  const token = getAuthToken();
  if (!token) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': `test_${Date.now()}`,
  };

  // Test endpoints with different priorities
  const endpoints = [
    { path: '/api/health', weight: 10, name: 'health' },
    { path: `/api/${API_VERSION}/categories`, weight: 8, name: 'categories' },
    { path: `/api/${API_VERSION}/products?limit=20`, weight: 15, name: 'products' },
    { path: `/api/${API_VERSION}/products/featured`, weight: 10, name: 'featured' },
    { path: `/api/${API_VERSION}/sellers`, weight: 8, name: 'sellers' },
    { path: `/api/${API_VERSION}/cart`, weight: 5, name: 'cart' },
    { path: `/api/${API_VERSION}/orders`, weight: 5, name: 'orders' },
    { path: `/api/${API_VERSION}/users/profile`, weight: 3, name: 'profile' },
    { path: `/api/${API_VERSION}/addresses`, weight: 3, name: 'addresses' },
  ];

  // Weighted random selection
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let selected = endpoints[0];
  for (const ep of endpoints) {
    rand -= ep.weight;
    if (rand <= 0) { selected = ep; break; }
  }

  const start = Date.now();
  const res = http.get(`${BASE_URL}${selected.path}`, { headers, tags: { name: selected.name } });
  const duration = Date.now() - start;
  apiLatency.add(duration);

  const success = check(res, {
    [`${selected.name} status 200`]: (r) => r.status === 200,
    [`${selected.name} response time < 1s`]: (r) => r.timings.duration < 1000,
  });

  if (!success) errorRate.add(1);

  // Think time
  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  let out = '\n' + indent + '═══ Load Test Summary ═══\n';
  out += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  out += indent + `Failed Requests: ${data.metrics.http_req_failed.values.passes} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)\n`;
  out += indent + `Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(0)}ms\n`;
  out += indent + `P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms\n`;
  out += indent + `Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(0)}ms\n`;
  out += indent + `Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
  if (data.metrics.auth_latency) {
    out += indent + `Auth Avg: ${data.metrics.auth_latency.values.avg.toFixed(0)}ms\n`;
  }
  if (data.metrics.api_latency) {
    out += indent + `API Avg: ${data.metrics.api_latency.values.avg.toFixed(0)}ms\n`;
  }
  return out;
}