// Test 3: Product Search - SmartSoko Search Engine
// Target: 10,000 searches per minute
// Tests: Keyword searches, category filters, price filters, sorting

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    constant_search: {
      executor: 'constant-arrival-rate',
      rate: 10000, // 10,000 searches per minute
      timeUnit: '1m',
      duration: '10m',
      preAllocatedVUs: 200,
      maxVUs: 500,
      tags: { test_type: 'constant_load' },
    },
    ramp_search: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1m',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [
        { target: 5000, duration: '2m' },
        { target: 10000, duration: '5m' },
        { target: 15000, duration: '2m' },
        { target: 0, duration: '1m' },
      ],
      tags: { test_type: 'ramp' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
    search_latency: ['p(95)<250', 'p(99)<500'],
    filter_latency: ['p(95)<300'],
    sort_latency: ['p(95)<200'],
    pagination_latency: ['p(95)<150'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const searchLatency = new Trend('search_latency');
const filterLatency = new Trend('filter_latency');
const sortLatency = new Trend('sort_latency');
const paginationLatency = new Trend('pagination_latency');
const searchResultCount = new Counter('search_result_count');
const searchErrorRate = new Rate('search_error_rate');

// Search scenarios based on SmartSoko data
const SEARCH_KEYWORDS = [
  'chicken', 'beef', 'fish', 'rice', 'beans', 'tomato', 'onion', 'potato',
  'milk', 'bread', 'egg', 'cheese', 'yogurt', 'butter', 'oil', 'sugar',
  'salt', 'pepper', 'spice', 'sauce', 'noodle', 'pasta', 'flour', 'maize',
  'mango', 'banana', 'apple', 'orange', 'pineapple', 'watermelon', 'avocado',
  'spinach', 'kale', 'cabbage', 'carrot', 'cucumber', 'pepper', 'garlic',
  'chicken breast', 'ground beef', 'tilapia', 'salmon', 'shrimp', 'pork',
  'fresh milk', 'whole wheat', 'brown rice', 'organic', 'gluten free',
];

const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery', 'other'];
const PRICE_RANGES = ['0-5000', '5000-10000', '10000-20000', '20000-50000', '50000-100000'];
const SORT_OPTIONS = ['relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'popularity'];
const LOCATIONS = ['dar es salaam', 'arusha', 'mwanza', 'dodoma', 'mbeya', 'morogoro'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomKeywords(count = 3) {
  const shuffled = [...SEARCH_KEYWORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(' ');
}

export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Basic keyword search
    testKeywordSearch();
  } else if (scenario < 0.6) {
    // 20% - Category filter
    testCategoryFilter();
  } else if (scenario < 0.75) {
    // 15% - Price range filter
    testPriceFilter();
  } else if (scenario < 0.85) {
    // 10% - Combined filters
    testCombinedFilters();
  } else if (scenario < 0.95) {
    // 10% - Sorting
    testSorting();
  } else {
    // 5% - Pagination
    testSearchPagination();
  }
  
  sleep(Math.random() * 0.5 + 0.1);
}

function testKeywordSearch() {
  const keywords = getRandomKeywords(Math.floor(Math.random() * 3) + 1);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'keyword_search', keywords: keywords.substring(0, 20) },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?search=${encodeURIComponent(keywords)}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'keyword_search status 200': (r) => r.status === 200,
    'keyword_search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'keyword_search latency < 250ms': () => latency < 250,
  });
  
  if (success) {
    const body = JSON.parse(res.body);
    searchResultCount.add(body.count || body.data?.length || 0);
  }
  
  searchErrorRate.add(success ? 0 : 1);
  searchLatency.add(latency);
}

function testCategoryFilter() {
  const category = getRandomElement(CATEGORIES);
  const keyword = getRandomKeywords(1);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'category_filter', category },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?category=${category}&search=${encodeURIComponent(keyword)}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'category_filter status 200': (r) => r.status === 200,
    'category_filter latency < 300ms': () => latency < 300,
  });
  
  searchErrorRate.add(success ? 0 : 1);
  filterLatency.add(latency);
}

function testPriceFilter() {
  const priceRange = getRandomElement(PRICE_RANGES);
  const [min, max] = priceRange.split('-').map(Number);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'price_filter', price_range: priceRange },
  };
  
  // Note: SmartSoko API might use minPrice/maxPrice params
  const res = http.get(`${BASE_URL}/api/sellers?minPrice=${min}&maxPrice=${max}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'price_filter status 200': (r) => r.status === 200,
    'price_filter latency < 300ms': () => latency < 300,
  });
  
  searchErrorRate.add(success ? 0 : 1);
  filterLatency.add(latency);
}

function testCombinedFilters() {
  const category = getRandomElement(CATEGORIES);
  const priceRange = getRandomElement(PRICE_RANGES);
  const [min, max] = priceRange.split('-').map(Number);
  const keyword = getRandomKeywords(1);
  const location = getRandomElement(LOCATIONS);
  const sort = getRandomElement(SORT_OPTIONS);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'combined_filters', category, price_range: priceRange, sort },
  };
  
  const url = `${BASE_URL}/api/sellers?` +
    `category=${category}&` +
    `search=${encodeURIComponent(keyword)}&` +
    `minPrice=${min}&maxPrice=${max}&` +
    `location=${encodeURIComponent(location)}&` +
    `sort=${sort}&limit=20`;
  
  const res = http.get(url, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'combined_filters status 200': (r) => r.status === 200,
    'combined_filters latency < 400ms': () => latency < 400,
  });
  
  searchErrorRate.add(success ? 0 : 1);
  filterLatency.add(latency);
}

function testSorting() {
  const sort = getRandomElement(SORT_OPTIONS);
  const category = getRandomElement(CATEGORIES);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'sorting', sort },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?category=${category}&sort=${sort}&limit=20`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'sorting status 200': (r) => r.status === 200,
    'sorting latency < 200ms': () => latency < 200,
  });
  
  searchErrorRate.add(success ? 0 : 1);
  sortLatency.add(latency);
}

function testSearchPagination() {
  const page = Math.floor(Math.random() * 20) + 1;
  const keyword = getRandomKeywords(1);
  const startTime = Date.now();
  
  const params = {
    tags: { operation: 'search_pagination', page: page.toString() },
  };
  
  const res = http.get(`${BASE_URL}/api/sellers?search=${encodeURIComponent(keyword)}&limit=20&page=${page}`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'search_pagination status 200': (r) => r.status === 200,
    'search_pagination latency < 150ms': () => latency < 150,
  });
  
  searchErrorRate.add(success ? 0 : 1);
  paginationLatency.add(latency);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/search-test-summary.json': JSON.stringify(data),
  };
}