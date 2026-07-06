# Food Delivery System - Connected Frontend-Backend Routes

## Architecture Overview

The Food Delivery System now features a **connected frontend-backend architecture** with:
- **Unified Backend API** (Express.js + Firebase Admin SDK)
- **Real-time Database** (Firestore)
- **RESTful API Routes** for all applications
- **Fallback Mechanisms** for direct Firebase access

## Backend API Server

### Server Configuration
- **File**: `server.js`
- **Port**: 3000 (or environment variable)
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK

### API Base URL
```
http://localhost:3000/api
```

## API Routes Structure

### 🍔 Customer Routes
```
GET    /api/restaurants              # Get all open restaurants
GET    /api/menu-items/:restaurantId # Get menu items for a restaurant
POST   /api/orders                   # Place a new order
GET    /api/orders/:customerId      # Get customer order history
```

### ⚙️ Admin Routes
```
GET    /api/admin/dashboard          # Admin dashboard statistics
GET    /api/admin/restaurants        # Get all restaurants
POST   /api/admin/restaurants        # Add new restaurant
GET    /api/admin/drivers            # Get all drivers
GET    /api/admin/orders             # Get all orders
GET    /api/admin/analytics          # Get analytics data
```

### 🏪 Merchant Routes
```
GET    /api/merchant/dashboard/:restaurantId # Merchant dashboard stats
GET    /api/merchant/orders/:restaurantId    # Get restaurant orders
POST   /api/merchant/menu                     # Add menu item
PUT    /api/merchant/menu/:itemId            # Update menu item
```

### 🏍️ Driver Routes
```
GET    /api/driver/dashboard/:driverId  # Driver dashboard stats
GET    /api/driver/orders               # Get available orders
PUT    /api/driver/orders/:orderId/accept # Accept an order
GET    /api/driver/earnings/:driverId   # Get driver earnings
```

### 🍽️ Restaurant Routes
```
GET    /api/restaurant/orders/:restaurantId # Get restaurant orders
PUT    /api/restaurant/orders/:orderId/status # Update order status
GET    /api/restaurant/kitchen/:restaurantId  # Get kitchen display
```

## Frontend Applications

### 1. Customer Application
- **URL**: `customer.html`
- **Backend Integration**: Uses API routes with Firebase fallback
- **Features**: 
  - Restaurant browsing via `/api/restaurants`
  - Menu ordering via `/api/menu-items/:restaurantId`
  - Cart management
  - Order placement via `/api/orders`
  - Real-time updates via Firestore listeners

### 2. Admin Dashboard
- **URL**: `index.html`
- **Backend Integration**: Full API integration
- **Features**:
  - Dashboard stats via `/api/admin/dashboard`
  - Restaurant management via `/api/admin/restaurants`
  - Order management via `/api/admin/orders`
  - Driver management via `/api/admin/drivers`
  - Analytics via `/api/admin/analytics`

### 3. Merchant Dashboard
- **URL**: `merchant.html`
- **Backend Integration**: API routes for restaurant-specific data
- **Features**:
  - Dashboard stats via `/api/merchant/dashboard/:restaurantId`
  - Order management via `/api/merchant/orders/:restaurantId`
  - Menu management via `/api/merchant/menu`
  - Sales analytics

### 4. Driver Application
- **URL**: `driver.html`
- **Backend Integration**: API routes for delivery operations
- **Features**:
  - Dashboard stats via `/api/driver/dashboard/:driverId`
  - Order acceptance via `/api/driver/orders/:orderId/accept`
  - Earnings tracking via `/api/driver/earnings/:driverId`
  - GPS navigation integration

### 5. Restaurant Dashboard
- **URL**: `restaurant.html`
- **Backend Integration**: Kitchen operations API
- **Features**:
  - Order display via `/api/restaurant/orders/:restaurantId`
  - Status updates via `/api/restaurant/orders/:orderId/status`
  - Kitchen display system
  - Preparation time tracking

## Data Flow Architecture

### Order Flow Example
```
Customer App → POST /api/orders → Firebase → Real-time Update → 
Restaurant Dashboard → Driver App → Admin Dashboard
```

### Real-time Updates
- All applications use Firestore listeners for real-time updates
- Order status changes propagate instantly across all interfaces
- Driver location updates in real-time
- Restaurant availability updates instantly

## Firebase Collections

### Primary Collections
- `restaurants` - Restaurant information and settings
- `menuItems` - Menu items with restaurant references
- `orders` - All orders with status tracking
- `drivers` - Driver profiles and availability
- `customers` - Customer information and preferences
- `payments` - Payment records and status
- `reviews` - Customer ratings and feedback

### Collection Relationships
```
restaurants (1) → (many) menuItems
restaurants (1) → (many) orders
drivers (1) → (many) orders
customers (1) → (many) orders
```

## Configuration Files

### Backend Configuration
- `server.js` - Main server file
- `package-server.json` - Backend dependencies
- `start-server.js` - Startup script
- `serviceAccountKey.json` - Firebase admin credentials

### Frontend Configuration
- `config/firebase-config.js` - Unified Firebase configuration
- `web/routes.md` - This documentation file

## Starting the System

### 1. Install Backend Dependencies
```bash
cd "d:\Project\food delivery\food_delivery_app"
npm install --package-lock-only
```

### 2. Start Backend Server
```bash
node start-server.js
```

### 3. Access Applications
```
Main:          http://localhost:3000/main.html
Customer:       http://localhost:3000/customer.html
Admin:          http://localhost:3000/index.html
Merchant:       http://localhost:3000/merchant.html
Driver:         http://localhost:3000/driver.html
Restaurant:     http://localhost:3000/restaurant.html
API Health:     http://localhost:3000/api/health
```

## Error Handling & Fallbacks

### API Fallback Mechanism
- If API server is unavailable, frontend apps fall back to direct Firebase access
- Automatic retry logic for failed API calls
- Graceful degradation of features

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Automatic retry for network failures
- Fallback to mock data for development

## Security Considerations

### Authentication
- Firebase Authentication for user management
- Role-based access control (Customer, Admin, Merchant, Driver)
- API key protection and rate limiting

### Data Validation
- Input validation on all API endpoints
- Sanitization of user data
- Protection against SQL injection and XSS

## Performance Optimizations

### Caching Strategy
- API response caching where appropriate
- Firebase offline persistence
- Image optimization and CDN usage

### Real-time Efficiency
- Optimized Firestore queries
- Selective real-time subscriptions
- Efficient data pagination

## Development Tools

### Testing
- API endpoint testing with Jest
- Frontend integration testing
- Load testing for concurrent users

### Monitoring
- Server health monitoring
- API performance metrics
- Error tracking and alerting

This connected architecture ensures seamless data flow between all applications while maintaining high performance and reliability.
