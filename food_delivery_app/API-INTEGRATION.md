# Frontend-Backend Integration Guide

## Overview
This document explains how the SmartSoko frontend applications are now integrated with the backend Express.js API server.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                       │
├─────────────────────────────────────────────────────────┤
│  customer.html  │  merchant.html  │  driver.html        │
│  main.html      │  index.html (admin)                   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/FETCH
                         ▼
┌─────────────────────────────────────────────────────────┐
│              API CLIENT LAYER (api-config.js)           │
├─────────────────────────────────────────────────────────┤
│ - apiHelpers (GET, POST, PUT, DELETE)                  │
│ - API_ROUTES (route constants)                          │
│ - API_BASE_URL (dynamic port detection)                │
└────────────────────────┬────────────────────────────────┘
                         │ http://localhost:3000/api
                         ▼
┌─────────────────────────────────────────────────────────┐
│                EXPRESS.JS API SERVER                    │
├─────────────────────────────────────────────────────────┤
│ server.js (server.js)                                   │
│ - CORS enabled                                          │
│ - JSON middleware                                       │
│ - Static file serving                                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FIREBASE FIRESTORE DATABASE                │
├─────────────────────────────────────────────────────────┤
│ Collections: sellers, products, orders, drivers         │
└─────────────────────────────────────────────────────────┘
```

## Files Added/Modified

### New Files:
1. **web/config/api-config.js** - API configuration and helper functions
2. **web/test-api-integration.html** - Testing page for API connectivity

### Modified Files:
1. **web/customer.html** - Added api-config.js script reference
2. **web/merchant.html** - Added api-config.js script reference
3. **web/driver.html** - Added api-config.js script reference
4. **web/index.html** - Added api-config.js script reference

## API Configuration (web/config/api-config.js)

### Features:
- **Automatic Port Detection**: Detects API server port (3000, 3001, etc.)
- **Environment-aware**: Uses relative paths in production
- **Fallback Support**: Multiple HTTP methods (GET, POST, PUT, DELETE)
- **Error Handling**: Standardized error responses

### API Base URL Detection:
```javascript
// In development (localhost):
- Tries port 3000 first (default server port)
- Falls back to 3001 if needed

// In production:
- Uses same host as frontend (relative URL: /api)
```

## API Routes

### Customer Routes
```javascript
GET    /api/sellers              - Get all sellers with optional category filter
GET    /api/categories           - Get categories with seller counts
GET    /api/sellers/:sellerId    - Get specific seller
GET    /api/products/:sellerId   - Get products for a seller
POST   /api/orders               - Create a new order
GET    /api/orders/:customerId   - Get customer's orders
```

### Driver Routes
```javascript
GET    /api/driver/available-orders           - Get orders ready for delivery
GET    /api/driver/orders                     - Get driver's accepted orders
PUT    /api/driver/orders/:orderId/accept     - Accept an order
PUT    /api/driver/orders/:orderId/status     - Update order status
```

### Merchant/Seller Routes
```javascript
GET    /api/seller/orders/:sellerId           - Get seller's orders
PUT    /api/seller/orders/:orderId/status     - Update order status
POST   /api/seller/:sellerId/products         - Add new product
PUT    /api/products/:productId               - Update product
```

### Admin Routes
```javascript
GET    /api/admin/dashboard      - Get dashboard statistics
GET    /api/admin/users          - Get all users (if implemented)
GET    /api/admin/orders         - Get all orders (if implemented)
GET    /api/admin/sellers        - Get all sellers (if implemented)
```

### Health Check
```javascript
GET    /api/health               - Server health status
```

## Using the API in Your Frontend

### Example 1: Load Sellers (Customer App)
```javascript
// In customer.html script
async function loadRestaurants() {
  try {
    const sellers = await apiHelpers.get(API_ROUTES.CUSTOMER.RESTAURANTS);
    console.log('✅ Sellers loaded:', sellers);
    // Render sellers on page
  } catch (error) {
    console.error('Failed to load sellers:', error);
    // Fallback to mock data or Firebase direct access
  }
}
```

### Example 2: Place an Order
```javascript
async function proceedToCheckout() {
  const orderData = {
    customerName: 'John Doe',
    deliveryAddress: 'Dar es Salaam',
    items: cart,
    total: 50000
  };
  
  try {
    const response = await apiHelpers.post(
      API_ROUTES.CUSTOMER.ORDERS, 
      orderData
    );
    console.log('✅ Order created:', response);
  } catch (error) {
    console.error('Order failed:', error);
  }
}
```

### Example 3: Get Categories
```javascript
async function loadCategories() {
  try {
    const categories = await apiHelpers.get(API_ROUTES.CUSTOMER.CATEGORIES);
    console.log('Categories:', categories);
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}
```

### Example 4: Accept an Order (Driver App)
```javascript
async function acceptOrder(orderId) {
  try {
    await apiHelpers.put(
      API_ROUTES.DRIVER.ACCEPT_ORDER(orderId),
      { 
        driverId: currentDriverId,
        driverName: currentDriverName 
      }
    );
    console.log('✅ Order accepted');
  } catch (error) {
    console.error('Failed to accept order:', error);
  }
}
```

## Testing the Integration

### Method 1: Open Test Page
1. Start the server: `node server.js`
2. Open in browser: `http://localhost:3000/test-api-integration.html`
3. Automatic tests will run and show results

### Method 2: Browser Console
```javascript
// Test GET request
apiHelpers.get(API_ROUTES.CUSTOMER.RESTAURANTS)
  .then(data => console.log('Sellers:', data))
  .catch(err => console.error('Error:', err));

// Test POST request (create order)
apiHelpers.post(API_ROUTES.CUSTOMER.ORDERS, {
  customerName: 'Test User',
  items: [],
  total: 0
})
  .then(data => console.log('Order:', data))
  .catch(err => console.error('Error:', err));
```

### Method 3: Using curl
```bash
# Test health check
curl http://localhost:3000/api/health

# Get sellers
curl http://localhost:3000/api/sellers

# Get categories
curl http://localhost:3000/api/categories

# Get admin dashboard
curl http://localhost:3000/api/admin/dashboard
```

## Fallback Mechanism

All frontend apps are designed with fallback strategies:

```javascript
async function loadData() {
  try {
    // Try API first
    return await apiHelpers.get(endpoint);
  } catch (error) {
    console.log('API not available, falling back to Firebase');
    // Fallback to direct Firebase access
    // OR use mock data
  }
}
```

This ensures:
- ✅ Seamless experience when API is available
- ✅ Graceful degradation if API fails
- ✅ Demo mode with mock data if both fail

## Server Setup

### Start the Server
```bash
# Using Node.js
node server.js

# Or with npm
npm start

# With specific port
PORT=3001 node server.js
```

### Server Output
```
✅ Firebase initialized successfully - using real database
🚀 SmartSoko Server running on http://localhost:3000
📱 API available at http://localhost:3000/api
```

### Environment Variables
```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment (default: development)
```

## CORS Configuration

The server has CORS enabled for cross-origin requests:
```javascript
app.use(cors());  // Allow all origins in development
```

For production, configure specific origins:
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

## Database Collections

The API uses these Firestore collections:

### sellers
```javascript
{
  id: string,
  name: string,
  category: string,  // food, dairy, fruits, groceries, bakery
  rating: number,
  reviews: number,
  deliveryTime: string,
  deliveryFee: number,
  isOpen: boolean
}
```

### products
```javascript
{
  id: string,
  sellerId: string,
  name: string,
  price: number,
  description: string,
  isAvailable: boolean
}
```

### orders
```javascript
{
  id: string,
  customerId: string,
  items: array,
  total: number,
  status: string,  // pending, accepted, ready_for_delivery, completed
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Troubleshooting

### Issue: "API not available" error
**Solution:**
1. Verify server is running: `node server.js`
2. Check port (default: 3000)
3. Check CORS is enabled
4. Look for Firebase initialization errors

### Issue: CORS errors
**Solution:**
1. Ensure `cors()` middleware is enabled in server.js
2. Check browser console for specific domain blocked
3. Verify API_BASE_URL is correct

### Issue: Database connection failed
**Solution:**
1. Verify Firebase credentials file exists
2. Check firestore.rules permissions
3. Verify Firestore database is accessible

### Issue: 404 Not Found
**Solution:**
1. Verify API endpoint is correct
2. Check server.js for the route
3. Ensure API_ROUTES constant matches server routes

## Next Steps

1. **Add Authentication**: Implement user login/signup
2. **Add Real-time Updates**: Use Firestore listeners for live order tracking
3. **Add Payment Integration**: Integrate M-Pesa or Stripe
4. **Add Notifications**: Implement push notifications for order updates
5. **Add Maps**: Integrate Google Maps for driver tracking
6. **Add Reviews**: Implement rating and review system

## Support & Documentation

For more information:
- Check [routes.md](routes.md) for route documentation
- Review [server.js](server.js) for implementation details
- Test API with [test-api-integration.html](test-api-integration.html)
