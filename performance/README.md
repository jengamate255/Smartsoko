# SmartSoko Performance Testing Framework

A production-quality performance testing framework for the SmartSoko marketplace MVP, built with k6, Docker, Prometheus, and Grafana.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Performance Testing Stack                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │   k6     │───▶│Prometheus│◀───│ Grafana  │    │ InfluxDB │      │
│  │(Load Gen)│    │ (Metrics)│    │(Dashboards)    │(Alt Metrics)│    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │                                               ▲             │
│       ▼                                               │             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐       │             │
│  │ SmartSoko│    │  Redis   │    │ Telegraf │       │             │
│  │   App    │    │ (Cache)  │    │ (SysMet) │       │             │
│  └──────────┘    └──────────┘    └──────────┘       │             │
│       │                                               │             │
│       └───────────────────────────────────────────────┘             │
│                              │                                      │
│                    ┌─────────┴─────────┐                            │
│                    │   Firebase/Firestore│                          │
│                    │   (Production DB)   │                          │
│                    └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
performance/
├── k6/                          # k6 Load Test Scripts
│   ├── auth-test.js            # Test 1: Customer Registration/Login
│   ├── product-test.js         # Test 2: Product Browsing
│   ├── search-test.js          # Test 3: Product Search
│   ├── cart-test.js            # Test 4: Cart System
│   ├── checkout-test.js        # Test 5: Checkout Process
│   ├── payment-test.js         # Test 6: Payment System
│   ├── merchant-test.js        # Test 7: Merchant Dashboard
│   ├── order-test.js           # Test 8: Order Processing
│   ├── soak-test.js            # 24-hour Soak Test
│   └── spike-test.js           # Spike Test
│
├── datagen/                     # Data Generation Scripts
│   ├── generate-data.js        # Main data generator
│   ├── generate-users.js       # 1M users generator
│   ├── generate-products.js    # 500K products generator
│   └── generate-orders.js      # 5M orders generator
│
├── grafana/
│   ├── dashboards/             # Grafana Dashboard JSON
│   │   ├── overview.json       # System Overview
│   │   ├── auth.json           # Authentication Metrics
│   │   ├── product.json        # Product Browsing
│   │   ├── search.json         # Search Performance
│   │   ├── cart.json           # Cart Operations
│   │   ├── checkout.json       # Checkout Flow
│   │   ├── payment.json        # Payment Metrics
│   │   ├── merchant.json       # Merchant Dashboard
│   │   └── orders.json         # Order Processing
│   └── datasources/
│       └── datasources.yml     # Prometheus + InfluxDB
│
├── prometheus/
│   └── prometheus.yml          # Prometheus Configuration
│
├── scripts/
│   ├── run-performance.ps1     # Windows PowerShell Runner
│   └── run-performance.sh      # Linux/macOS Runner
│
├── reports/                     # Test Reports Output
├── Dockerfile.datagen          # Data Generator Dockerfile
├── docker-compose.yml          # Full Stack Definition
└── README.md                   # This file
```

## Test Scenarios

### Test 1: Customer Registration/Login (auth-test.js)
- **Load Levels**: 100, 1,000, 10,000 concurrent users
- **Operations**: Firebase Auth signup, signin, token verification, token refresh
- **Metrics**: Auth latency (p50/p95/p99), failure rate, registration rate, login rate
- **Thresholds**: p95 < 300ms, failure rate < 2%

### Test 2: Product Browsing (product-test.js)
- **Data**: 100,000 products
- **Operations**: Homepage, categories, search, pagination, product detail, images
- **Metrics**: API latency, database performance, image load rate
- **Thresholds**: p95 < 400ms, image load rate > 95%

### Test 3: Product Search (search-test.js)
- **Target**: 10,000 searches/minute
- **Operations**: Keyword search, category filters, price filters, sorting, pagination
- **Metrics**: Search latency, filter latency, sort latency, pagination latency
- **Thresholds**: p95 < 300ms, error rate < 1%

### Test 4: Cart System (cart-test.js)
- **Operations**: Add, remove, update quantity, fetch, merge (login), clear
- **Metrics**: Add/update/remove latency, fetch latency, consistency rate
- **Thresholds**: p95 < 200ms, consistency > 99%

### Test 5: Checkout (checkout-test.js)
- **Operations**: Cart validation, order creation, stock reduction, payment init, confirmation
- **Metrics**: Checkout latency, order creation rate, stock reduction rate, payment init rate
- **Thresholds**: p95 < 800ms, order creation > 98%, no duplicate orders

### Test 6: Payment System (payment-test.js)
- **Scenarios**: Successful payment, failed payment, timeout, duplicate callback
- **Metrics**: Payment init latency, callback processing, status check latency
- **Guarantees**: No duplicate orders, no lost transactions, DB consistency
- **Thresholds**: p95 < 2s, duplicate detection < 0.1%

### Test 7: Merchant Dashboard (merchant-test.js)
- **Load**: 10,000 concurrent merchants
- **Operations**: Login, analytics, add product, update price/stock, view orders, inventory
- **Metrics**: Login latency, product CRUD latency, analytics latency, order view latency
- **Thresholds**: p95 < 500ms, error rate < 1%

### Test 8: Order Processing (order-test.js)
- **Volume**: 100,000 orders
- **Lifecycle**: Created → Accepted → Preparing → Assigned → Picked Up → Delivered
- **Metrics**: Creation speed, DB write latency, notification latency, completion rate
- **Thresholds**: p95 < 500ms, completion rate > 99%

### Soak Test (soak-test.js)
- **Duration**: 24 hours continuous
- **Load**: 500 RPS constant
- **Detection**: Memory leaks, DB connection leaks, performance degradation

### Spike Test (spike-test.js)
- **Pattern**: 1,000 users → 100,000 users (sudden)
- **Metrics**: Recovery time, error rate during spike, server stability

## Quick Start

### Prerequisites

- Docker Desktop 4.0+ (Windows/Mac) or Docker Engine 20+ (Linux)
- Docker Compose 2.0+
- 16GB+ RAM recommended
- Firebase project with Firestore enabled
- Firebase Service Account key (base64 encoded)

### Environment Setup

```bash
# Export Firebase credentials (required)
export FIREBASE_SERVICE_ACCOUNT_BASE64=$(base64 -w 0 serviceAccountKey.json)

# Optional overrides
export BASE_URL=http://localhost:3000
export FIREBASE_API_KEY=your-api-key
export PESAPAL_ENV=sandbox
```

### Run All Tests (Linux/macOS)

```bash
cd performance
chmod +x scripts/run-performance.sh
./scripts/run-performance.sh
```

### Run All Tests (Windows PowerShell)

```powershell
cd performance
.\scripts\run-performance.ps1
```

### Run Specific Test

```bash
# Run only auth tests
./scripts/run-performance.sh --test-type auth

# Run with custom base URL
./scripts/run-performance.sh --base-url https://staging.smartsoko.com

# Generate test data first, then run all tests
./scripts/run-performance.sh --generate-data --users 100000 --products 50000

# Run soak test (24 hours)
./scripts/run-performance.sh --test-type soak

# Run spike test
./scripts/run-performance.sh --test-type spike
```

### Using Docker Compose Directly

```bash
# Start infrastructure only
docker-compose up -d prometheus grafana redis influxdb

# Run single k6 test
docker-compose run --rm \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e FIREBASE_API_KEY=your-key \
  k6 run /scripts/auth-test.js

# Run with custom VUs
docker-compose run --rm k6 run -u 500 -d 10m /scripts/product-test.js
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Yes | - | Base64 encoded Firebase service account |
| `BASE_URL` | No | `http://localhost:3000` | SmartSoko API base URL |
| `FIREBASE_API_KEY` | No | Demo key | Firebase Web API Key |
| `PESAPAL_ENV` | No | `sandbox` | PesaPal environment (sandbox/live) |
| `MAPBOX_ACCESS_TOKEN` | No | - | Mapbox token for route optimization |

### k6 Test Configuration

Each test script exports an `options` object with:

```javascript
export const options = {
  scenarios: {
    smoke: { /* quick validation */ },
    load: { /* sustained load */ },
    stress: { /* breaking point */ },
    spike: { /* sudden load */ },
    soak: { /* long duration */ }
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    // Custom metrics thresholds...
  }
}
```

### Prometheus Configuration

Key scrape targets:
- `k6:6565` - k6 metrics endpoint
- `smartsoko-app:3000` - Application metrics
- `redis:6379` - Redis metrics via exporter
- `node-exporter:9100` - Host system metrics
- `cadvisor:8080` - Container metrics

## Monitoring & Dashboards

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| InfluxDB | http://localhost:8086 | admin / adminadmin |
| SmartSoko App | http://localhost:3000 | - |

### Pre-built Dashboards

1. **Overview** - System health, RPS, latency percentiles, error rates
2. **Auth** - Registration/login rates, token operations, Firebase quota
3. **Product** - Browse/detail latency, image loads, pagination
4. **Search** - Search/filter/sort latency, result counts
5. **Cart** - Add/update/remove latency, consistency checks
6. **Checkout** - Order creation, stock reduction, payment init
7. **Payment** - Success/fail/timeout rates, callback processing
8. **Merchant** - Dashboard load, CRUD operations, analytics
9. **Orders** - Lifecycle transitions, notification delivery

### Key Metrics to Watch

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| `http_req_duration{p95}` | < 500ms | > 1000ms |
| `http_req_failed` | < 1% | > 5% |
| `auth_latency{p95}` | < 300ms | > 500ms |
| `order_creation_rate` | > 98% | < 95% |
| `duplicate_order_rate` | < 0.1% | > 0.5% |
| `memory_usage` | < 70% | > 85% |
| `db_connections` | < 80% | > 90% |

## Data Generation

### Generate Test Data

```bash
# Generate full dataset (1M users, 500K products, 5M orders)
./scripts/run-performance.sh --generate-data

# Custom volumes
./scripts/run-performance.sh --generate-data \
  --users 100000 \
  --products 50000 \
  --orders 500000
```

### Data Collections Created

| Collection | Count | Description |
|------------|-------|-------------|
| `users` | 1,000,000 | Customer accounts with profiles |
| `sellers` | 100,000 | Merchant/seller accounts |
| `products` | 500,000 | Product catalog with variants |
| `drivers` | 10,000 | Delivery driver profiles |
| `orders` | 5,000,000 | Complete order lifecycle |
| `reviews` | 2,000,000 | Product reviews and ratings |
| `cart_items` | 500,000 | Active shopping carts |
| `payments` | 5,000,000 | Payment transactions |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday
  workflow_dispatch:
    inputs:
      test_type:
        description: 'Test type'
        required: true
        default: 'all'

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker
        uses: docker/setup-buildx-action@v3
      
      - name: Start Infrastructure
        run: |
          cd performance
          docker-compose up -d prometheus grafana redis
          sleep 30
      
      - name: Start SmartSoko App
        run: |
          cd performance
          docker-compose up -d smartsoko-app
          sleep 60
      
      - name: Run Performance Tests
        env:
          FIREBASE_SERVICE_ACCOUNT_BASE64: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          BASE_URL: http://localhost:3000
        run: |
          cd performance
          ./scripts/run-performance.sh --test-type ${{ github.event.inputs.test_type }}
      
      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: performance-reports
          path: performance/reports/
      
      - name: Notify on Failure
        if: failure()
        run: |
          # Send Slack/email notification
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d "{\"text\":\"Performance tests failed!\"}"
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| k6 can't connect to app | Check `BASE_URL` uses `smartsoko-app:3000` inside Docker network |
| Firebase auth fails | Verify `FIREBASE_SERVICE_ACCOUNT_BASE64` is set correctly |
| Prometheus not scraping | Check network connectivity, firewall rules |
| Grafana dashboards empty | Verify Prometheus datasource URL is `http://prometheus:9090` |
| Out of memory | Increase Docker memory limit to 8GB+ |
| Tests timeout | Increase k6 `protocolTimeout` or test duration |

### Debug Commands

```bash
# View k6 logs
docker-compose logs -f k6

# View app logs
docker-compose logs -f smartsoko-app

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test API directly
curl http://localhost:3000/health
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/verify

# Check Firestore indexes
firebase firestore:indexes
```

## Performance Baselines

Based on current SmartSoko architecture (Firebase/Firestore backend):

| Operation | Target p95 | Current Baseline |
|-----------|------------|------------------|
| User Registration | < 300ms | ~250ms |
| User Login | < 200ms | ~180ms |
| Token Verification | < 100ms | ~80ms |
| Product List (20) | < 300ms | ~280ms |
| Product Detail | < 200ms | ~150ms |
| Search | < 400ms | ~350ms |
| Add to Cart | < 150ms | ~120ms |
| Checkout | < 800ms | ~650ms |
| Payment Init | < 2000ms | ~1500ms |
| Order Status Update | < 200ms | ~180ms |

## Scaling Considerations

### Horizontal Scaling
- Run multiple k6 instances: `docker-compose up --scale k6=3`
- Use k6 Cloud for distributed load generation
- Separate read/write Firestore instances

### Database Optimization
- Enable Firestore indexes for query patterns
- Use composite indexes for multi-field queries
- Consider BigQuery export for analytics queries

### Caching Strategy
- Redis for session/cart data
- CDN for product images
- In-memory cache for config/category data

## License

MIT License - See LICENSE file for details.

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Slack: #smartsoko-performance