// Test 2: Product Browsing - SmartSoko Marketplace
// Simulates: Opening homepage, viewing categories, viewing products, loading images
// Data: 100,000 products
// Measures: API latency, database performance

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
    load_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 2000 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    spike_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '30s', target: 5000 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    product_list_latency: ['p(95)<300'],
    product_detail_latency: ['p(95)<200'],
    category_latency: ['p(95)<150'],
    image_load_rate: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const productListLatency = new Trend('product_list_latency');
const productDetailLatency = new Trend('product_detail_latency');
const categoryLatency = new Trend('category_latency');
const imageLoadRate = new Rate('image_load_rate');
const searchLatency = new Trend('search_latency');
const paginationRate = new Rate('pagination_rate');

// Product IDs for testing (simulating 100,000 products)
const PRODUCT_IDS = generateProductIds(100000);
const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery', 'other'];
const SEARCH_TERMS = ['chicken', 'milk', 'bread', 'rice', 'tomato', 'banana', 'yogurt', 'cheese', 'egg', 'fish'];

function generateProductIds(count) {
  const ids = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`product-${i.toString().padStart(6, '0')}`);
  }
  return ids;
}

function getRandomProductId() {
  return PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
}

function getRandomCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function getRandomSearchTerm() {
  return SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
}

export default function () {
  // User journey: Home -> Categories -> Search -> Product List -> Product Detail -> Images
  
  // 1. Home page / Featured products
  testHomePage();
  
  // 2. Category listing
  testCategoryListing();
  
  // 3. Product search
  testProductSearch();
  
  // 4. Product list with pagination
  testProductListPagination();
  
  // 5. Product detail
  testProductDetail();
  
  // 6. Product images
  testProductImages();
  
  // 7. Related products
  testRelatedProducts();
  
  sleep(Math.random() * 3 + 1);
}

function testHomePage() {
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'homepage' },
  };
  
  // Featured products (first page)
  const res = http.get(`${BASE_URL}/api/sellers?limit=10`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage has sellers': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'homepage latency < 300ms': () => latency < 300,
  });
  
  productListLatency.add(latency);
  
  // Categories
  const catStart = Date.now();
  const catRes = http.get(`${BASE_URL}/api/categories`, params);
  const catLatency = Date.now() - catStart;
  
  check(catRes, {
    'categories status 200': (r) => r.status === 200,
    'categories has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.categories);
      } catch {
        return false;
      }
    },
    'categories latency < 150ms': () => catLatency < 150,
  });
  
  categoryLatency.add(catLatency);
}

function testCategoryListing() {
  const category = getRandomCategory();
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'category_list', category },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?category=${category}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'category_list status 200': (r) => r.status === 200,
    'category_list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'category_list latency < 400ms': () => latency < 400,
  });
  
  productListLatency.add(latency);
}

function testProductSearch() {
  const searchTerm = getRandomSearchTerm();
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'search', search: searchTerm },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?search=${encodeURIComponent(searchTerm)}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'search latency < 500ms': () => latency < 500,
  });
  
  searchLatency.add(latency);
}

function testProductListPagination() {
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = 20;
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'pagination', page: page.toString() },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?limit=${limit}&page=${page}`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'pagination status 200': (r) => r.status === 200,
    'pagination has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'pagination latency < 300ms': () => latency < 300,
  });
  
  paginationRate.add(success ? 1 : 0);
  productListLatency.add(latency);
}

function testProductDetail() {
  const productId = getRandomProductId();
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'product_detail' },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers/${productId}`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'product_detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'product_detail has data if 200': (r) => {
      if (r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data !== undefined;
      } catch {
        return false;
      }
    },
    'product_detail latency < 200ms': () => latency < 200,
  });
  
  productDetailLatency.add(latency);
}

function testProductImages() {
  // Simulate loading product images
  const imageUrls = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  ];
  
  let loaded = 0;
  const total = 3;
  
  for (let i = 0; i < total; i++) {
    const url = imageUrls[Math.floor(Math.random() * imageUrls.length)];
    const startTime = Date.now();
    
    const res = http.get(url, {
      tags: { operation: 'load_image' },
      timeout: '5s',
    });
    
    const latency = Date.now() - startTime;
    
    if (res.status === 200 && res.body && res.body.length > 0) {
      loaded++;
    }
  }
  
  imageLoadRate.add(loaded / total);
}

function testRelatedProducts() {
  const productId = getRandomProductId();
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'related_products' },
  };
  
  const res = http.get(`${BASE_URL}/api/shopify/bundles?merchantId=${productId}`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'related_products status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'related_products latency < 300ms': () => latency < 300,
  });
  
  productListLatency.add(latency);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/product-browse-summary.json': JSON.stringify(data),
  };
}