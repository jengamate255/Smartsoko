# Tanzania SME/Shop Marketplace Feature

This feature adds support for local Tanzanian shops and small businesses to your food delivery app.

## New Features

### 1. Data Models
- **Shop Model**: Represents local businesses (grocery, electronics, clothing, pharmacy, hardware, beauty, restaurants, fish markets, farming, dairy, etc.)
- **Product Model**: Products sold by shops with pricing in TZS
- **ShopOrder Model**: Orders for shop products

### 2. Shop Categories (Biashara)
- Duka la Vyakula (Grocery)
- Duka la Vifaa vya Elektroniki (Electronics)
- Duka la Nguo (Clothing)
- Duka la Dawa (Pharmacy)
- Duka la Vifaa vya Ujenzi (Hardware)
- Duka la Vipodozi (Beauty & Cosmetics)
- Hoteli (Restaurant)
- Duka la Samaki (Fish Market)
- Biashara ya Kilimo (Farming)
- Duka la Maziwa (Dairy)
- Biashara Nyingine (Other)

### 3. UI Components
- **ShopsScreen**: Browse all shops with search and category filters
- **ShopDetailScreen**: View shop details and products
- Featured shops section
- Product grid with pricing and availability

### 4. Services
- **ShopService**: CRUD operations for shops and products
- **ImageUploadService**: Image picking and Firebase Storage upload
- **LocationPicker**: Interactive map with GPS and search
- Firebase Functions for shop order notifications

## Files Created

### Models
- `lib/models/shop.dart` - Shop, Product, and ShopOrder models

### Services
- `lib/services/shop_service.dart` - Shop business logic
- `lib/services/image_upload_service.dart` - Image picking and upload

### Screens
- `lib/screens/customer/shops_screen.dart` - Shop browsing with onboarding entry
- `lib/screens/customer/shop_detail_screen.dart` - Shop details
- `lib/screens/sme_onboarding_screen.dart` - Detailed 6-step SME onboarding
- `lib/screens/location_picker_screen.dart` - Interactive map location picker

### Data
- `lib/data/sample_data.dart` - Sample Tanzania shop data

## Entry Points for SME Onboarding

### 1. Banner in Shops Screen
A prominent orange banner at the top of the shops screen with the text "Sajili Biashara Yako" (Register Your Business). Tapping this banner opens the onboarding screen.

### 2. Floating Action Button
A floating action button at the bottom of the shops screen with the label "Sajili Biashara" and a business icon.

### 3. Programmatic Navigation
You can also navigate to the onboarding screen programmatically:

```dart
import 'screens/sme_onboarding_screen.dart';

Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => const SMEOnboardingScreen(),
  ),
);
```

## Integration Steps

### 1. Add to Customer Navigation
Add the ShopsScreen to your customer's main navigation:

```dart
// In your customer navigation or home screen
import 'screens/customer/shops_screen.dart';

// Add a new tab or button for shops
BottomNavigationBarItem(
  icon: Icon(Icons.store),
  label: 'Maduka',
),
```

### 2. Update Main Screen
Update your main customer screen to include the shops tab:

```dart
// In lib/screens/customer/main_screen.dart
class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    HomeScreen(),        // Existing food ordering
    ShopsScreen(),       // New: Shop marketplace
    OrdersScreen(),      // Existing orders
    ProfileScreen(),     // Existing profile
  ];
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
            icon: Icon(Icons.restaurant),
            label: 'Chakula',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.store),
            label: 'Maduka',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Oda',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
```

### 3. Populate Sample Data
To populate sample shop data for testing:

```dart
// In your app initialization or a test screen
import 'data/sample_data.dart';

// Call this once to populate sample data
await SampleData.populateSampleShops();
```

### 4. SME Onboarding Features
The onboarding screen includes a comprehensive 6-step form:

**Step 1: Business Information**
- Business name with validation
- Business type selection (11 types including fish, farming, dairy)
- Category selection based on business type
- Business description
- **Business image upload** with gallery and camera options
  - Image preview with edit/remove options
  - Automatic image optimization (1024x1024 max, 85% quality)
  - Firebase Storage integration for image hosting

**Step 2: Location**
- Full address input with validation
- **Interactive map picker** with Google Maps
  - Tap map to select location
  - Search for locations by name
  - Get current GPS location
  - Real-time address reverse geocoding
- GPS coordinates display (Dar es Salaam default)
- Location tips in Swahili

**Step 3: Contact Information**
- Tanzania phone number validation (+255)
- WhatsApp integration
- Instagram handle
- Facebook page
- Social media benefits

**Step 4: Payment Methods**
- M-Pesa integration
- Cash payment option
- Payment information

**Step 5: Delivery Options**
- Delivery service toggle
- Pickup option toggle
- Operating hours

**Step 6: Terms & Conditions**
- Complete terms in Swahili
- Terms acceptance
- Business summary

### 5. Update Firestore Security Rules
Update your `firestore.rules` to include the new collections:

```javascript
// Shops collection
match /shops/{shopId} {
  allow read: if true;
  allow write: if true;
}

// Products collection (for shops)
match /products/{productId} {
  allow read: if true;
  allow write: if true;
}

// Shop orders collection
match /shop_orders/{orderId} {
  allow read, write: if true;
}
```

## Usage

### For Customers
1. Open the app and tap "Maduka" tab
2. Browse shops by category or use search
3. Tap a shop to view details and products
4. Contact shop via phone or WhatsApp
5. Place orders directly with the shop

### For Shop Owners
1. Register as a shop owner
2. Add your shop details and products
3. Receive notifications for new orders
4. Manage inventory and orders

## Tanzania-Specific Features

### Currency
- All prices in Tanzanian Shillings (TZS)
- Price formatting: "TSh 5,000"

### Phone Numbers
- Tanzania format: +255XXXXXXXXX
- WhatsApp integration for direct contact

### Location
- Dar es Salaam based shops (expandable to other regions)
- GPS coordinates for delivery

### Language
- Swahili labels and descriptions
- Bilingual interface (Swahili/English)

## Next Steps

1. **Shop Owner Registration**: Create a screen for shop owners to register
2. **Product Management**: Add screens for shop owners to manage products
3. **Order Management**: Implement full order flow with M-Pesa integration
4. **Delivery Integration**: Extend delivery system for shop orders
5. **Reviews & Ratings**: Add customer review system
6. **Analytics**: Track shop performance and popular products

## Sample Tanzania Businesses Included

### Food & Grocery
- Duka la Mama Fatma (Grocery)
- Supermarket ya Jirani (Supermarket)

### Electronics & Technology
- Tech Tanzania (Electronics)
- Digital Store TZ (Digital Accessories)

### Fashion & Clothing
- Fashion House TZ (Clothing)
- Duka la Nguo za Jumla (Wholesale Clothing)

### Health & Pharmacy
- Pharmacy ya Afya (Pharmacy)

### Construction & Hardware
- Hardware ya Mjini (Hardware)
- Jenga Hardware (Construction Materials)

### Beauty & Personal Care
- Beauty Palace TZ (Beauty & Cosmetics)
- Salon ya Rembo (Salon & Spa)

### Restaurants
- Hoteli ya Mama Lishe (Tanzanian Cuisine)

### Fish Markets
- Samaki wa Bahari (Sea Fish)
- Duka la Samaki wa Fresh (Fresh Fish)
- Samaki wa Maziwa (Lake Fish)

### Farming & Agriculture
- Shamba la Kisasa (Fresh Produce)
- Mbegu Bora Tanzania (Seeds & Fertilizers)
- Mazao ya Shamba (Farm Produce)

### Dairy & Milk
- Maziwa ya Fresh (Fresh Milk)
- Duka la Maziwa na Bidhaa (Dairy Products)
- Maziwa ya Mbuzi (Goat Milk)

### Other Businesses
- Duka la Vitabu (Books & Stationery)
- Duka la Vyakula vya Mifugo (Animal Feed)
- Duka la Vifaa vya Shule (School Supplies)
