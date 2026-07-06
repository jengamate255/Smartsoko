# Food Delivery App - Supabase Integration

## Overview
This guide shows how to integrate Supabase as an alternative to Firebase for the Food Delivery system. Supabase provides PostgreSQL database, real-time subscriptions, authentication, and storage in a single platform.

## 🚀 **Features Included**

### **Database & Authentication**
- ✅ **Complete PostgreSQL schema** with all tables and relationships
- ✅ **Row Level Security (RLS)** for data protection
- ✅ **User authentication** with role-based access
- ✅ **Real-time subscriptions** for live updates
- ✅ **Advanced SQL functions** for analytics and business logic

### **Enhanced Capabilities**
- ✅ **Advanced analytics** with SQL functions
- ✅ **Delivery zones** with geospatial queries
- ✅ **Driver auto-assignment** based on location
- ✅ **Loyalty points system** with expiry
- ✅ **Restaurant rating calculations**
- ✅ **Performance-optimized indexes**

## 📋 **Setup Instructions**

### **1. Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Set database password and region
5. Wait for project to be created

### **2. Run Database Schema**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/config.sql`
4. Click **Run** to execute the schema
5. Verify all tables and functions are created

### **3. Configure Application**
1. Get your project URL and anon key from **Settings > API**
2. Update the configuration in your files:

```javascript
// In supabase/client.js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// In web-supabase/index.html
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### **4. Set Up Authentication**
1. Go to **Authentication > Settings**
2. Enable email/password authentication
3. Configure redirect URLs if needed
4. Set up additional providers (Google, Facebook, etc.)

### **5. Configure Storage**
1. Go to **Storage**
2. Create a new bucket named `food-delivery`
3. Set up storage policies for public access
4. Configure file size limits

## 🗄️ **Database Schema**

### **Core Tables**
- **`profiles`** - Extended user profiles with roles
- **`restaurants`** - Restaurant information and settings
- **`menu_items`** - Food items and inventory
- **`orders`** - Order management and tracking
- **`drivers`** - Driver profiles and location tracking
- **`promotions`** - Discount codes and campaigns
- **`loyalty_points`** - Customer rewards system
- **`reviews`** - Ratings and feedback
- **`messages`** - Chat and communication
- **`delivery_zones`** - Geographic delivery areas

### **Advanced Features**
- **Row Level Security (RLS)** policies for data protection
- **Automatic triggers** for business logic
- **SQL functions** for complex analytics
- **Geospatial queries** for delivery zones
- **Real-time subscriptions** for live updates

## 🔧 **API Usage**

### **Authentication**
```javascript
import { auth } from './supabase/client.js';

// Sign up
const { data, error } = await auth.signUp(email, password, { role: 'customer' });

// Sign in
const { data, error } = await auth.signIn(email, password);

// Get current user
const user = await auth.getCurrentUser();

// Listen to auth changes
auth.onAuthStateChange((user) => {
  console.log('Auth state changed:', user);
});
```

### **Database Operations**
```javascript
import { restaurants, orders, drivers } from './supabase/client.js';

// Get restaurants
const { data, error } = await restaurants.getAll();

// Create order
const { data, error } = await orders.create(orderData);

// Real-time subscription
const subscription = orders.subscribe((payload) => {
  console.log('Order updated:', payload);
});
```

### **Advanced Analytics**
```javascript
import { analytics } from './supabase/client.js';

// Get sales analytics
const { data, error } = await analytics.getSalesAnalytics(restaurantId, 30);

// Get popular items
const { data, error } = await analytics.getPopularItems(restaurantId, 10);

// Get peak hours
const { data, error } = await analytics.getPeakHours(restaurantId, 30);
```

## 🌍 **Real-time Features**

### **Live Order Tracking**
```javascript
// Subscribe to order updates
const subscription = supabase
  .from('orders')
  .on('*', (payload) => {
    if (payload.eventType === 'UPDATE') {
      updateOrderStatus(payload.new);
    }
  });
```

### **Driver Location Tracking**
```javascript
// Update driver location
await drivers.updateLocation(driverId, latitude, longitude);

// Subscribe to driver movements
const subscription = drivers.subscribe((payload) => {
    updateDriverOnMap(payload.new);
});
```

### **Restaurant Management**
```javascript
// Subscribe to menu changes
const subscription = menuItems.subscribe(restaurantId, (payload) => {
    updateMenuDisplay(payload);
});
```

## 📊 **Analytics Dashboard**

### **Built-in Functions**
- **`get_popular_items()`** - Most ordered items
- **`get_peak_hours()` - Busiest ordering times
- **`get_customer_analytics()`** - Customer behavior insights
- **`get_driver_analytics()`** - Driver performance metrics
- **`get_restaurant_analytics()`** - Restaurant KPIs
- **`generate_daily_sales_report()`** - Daily revenue reports

### **Key Metrics**
- Order volume and revenue trends
- Customer retention rates
- Average order values
- Peak delivery hours
- Popular menu items
- Driver performance stats
- Restaurant ratings

## 🚚 **Delivery Zone Management**

### **Geographic Features**
- **Polygon-based delivery areas** using PostGIS
- **Distance-based pricing** calculations
- **Automatic driver assignment** based on proximity
- **Delivery fee optimization** by zone

### **Implementation**
```javascript
// Check if location is in delivery zone
const isInZone = await supabase
  .rpc('is_in_delivery_zone', {
    p_restaurant_id: restaurantId,
    p_latitude: customerLat,
    p_longitude: customerLng
  });

// Calculate delivery fee
const deliveryFee = await supabase
  .rpc('calculate_delivery_fee', {
    p_restaurant_id: restaurantId,
    p_latitude: customerLat,
    p_longitude: customerLng,
    p_order_total: orderTotal
  });
```

## 🔐 **Security Features**

### **Row Level Security (RLS)**
- **Customers** can only see their own orders
- **Restaurants** can only manage their data
- **Drivers** can only view assigned orders
- **Admins** have full access based on role

### **Data Protection**
- **Encrypted connections** using HTTPS
- **API key authentication** with proper permissions
- **Input validation** and sanitization
- **SQL injection prevention** through parameterized queries

## 📱 **Mobile App Integration**

### **Flutter Integration**
```dart
// Add to pubspec.yaml
dependencies:
  supabase_flutter: ^1.10.0

// Usage example
import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.instance.client;
```

### **React Native Integration**
```javascript
// Add to package.json
dependencies:
  "@supabase/supabase-js": "^2.0.0"

// Usage example
import { createClient } from '@supabase/supabase-js';
```

## 🔄 **Migration from Firebase**

### **Data Migration**
1. Export Firebase data to JSON/CSV
2. Transform data to match Supabase schema
3. Use Supabase CSV import or custom migration script
4. Verify data integrity after migration

### **Code Changes**
1. Replace Firebase SDK with Supabase client
2. Update authentication calls
3. Modify database queries to use Supabase syntax
4. Update real-time subscription code

## 🚀 **Deployment**

### **Production Setup**
1. Set up environment variables for Supabase credentials
2. Configure CORS settings in Supabase dashboard
3. Set up custom domain if needed
4. Enable database backups
5. Configure monitoring and alerts

### **Performance Optimization**
- Use database indexes for frequently queried columns
- Implement proper pagination for large datasets
- Cache frequently accessed data
- Optimize SQL queries and functions
- Monitor query performance

## 📈 **Monitoring & Maintenance**

### **Database Monitoring**
- Monitor query performance in Supabase dashboard
- Set up alerts for high CPU usage
- Track storage usage and costs
- Monitor real-time subscription counts

### **Backup Strategy**
- Enable automatic daily backups
- Test backup restoration procedures
- Document recovery processes
- Monitor backup success rates

## 🔧 **Troubleshooting**

### **Common Issues**
1. **CORS errors** - Check Supabase CORS settings
2. **RLS policy violations** - Review security policies
3. **Connection timeouts** - Check network and database performance
4. **Real-time subscription failures** - Verify permissions and table structure

### **Debug Tools**
- Use browser DevTools for network requests
- Check Supabase dashboard logs
- Test SQL functions in the SQL editor
- Monitor real-time subscription status

## 📚 **Additional Resources**

### **Documentation**
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Reference](https://www.postgresql.org/docs/)
- [Real-time Subscriptions Guide](https://supabase.com/docs/guides/realtime)

### **Community**
- [Supabase Discord](https://discord.gg/supabase)
- [GitHub Discussions](https://github.com/supabase/supabase/discussions)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/supabase)

## 🎯 **Next Steps**

1. **Set up Supabase project** and run the schema
2. **Replace Firebase configuration** with Supabase credentials
3. **Test all functionality** with the new backend
4. **Migrate existing data** if needed
5. **Deploy to production** with monitoring

Your Food Delivery app is now ready to use Supabase as a powerful, scalable backend!
