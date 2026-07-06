# SmartSoko Mobile

A TRUE native React Native mobile application for the SmartSoko marketplace platform. Built with Expo + TypeScript, featuring real Supabase integration, Zustand state management, and mobile-optimized architecture.

## 🎯 Project Overview

This is a **TRUE native mobile app** (NOT a WebView wrapper) that:
- Uses native React Native components (View, Text, FlatList, etc.)
- NO HTML/CSS reuse - all UI is native
- Real Supabase backend integration with existing web app database
- Zustand for state management with offline persistence
- Optimized FlatList with pagination (no map loops)
- Image optimization before upload
- Pull-to-refresh and offline state handling

## 📁 Architecture

### Code Structure

```
src/
├── components/         # Reusable UI components
├── screens/            # Screen components
│   ├── auth/           # Login, Signup, Role Selection
│   ├── main/           # Home (FlatList), Search, Profile
│   ├── vendor/         # Vendor detail, Product detail, Post Product
│   ├── cart/           # Cart, Checkout
│   ├── orders/         # Order history, tracking
│   └── chat/           # Real-time messaging
├── navigation/         # Navigation configuration
│   ├── AppNavigator.tsx       # Root navigator (Stack)
│   ├── AuthNavigator.tsx      # Auth flow
│   └── MainNavigator.tsx      # Bottom tabs
├── store/              # Zustand stores
│   └── useProductStore.ts     # Products with pagination
├── services/           # Business logic
│   ├── supabase.ts     # Auth & database services
│   └── cart.ts         # AsyncStorage cart
├── hooks/              # Custom React hooks
│   └── useNetworkStatus.ts    # Offline detection
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   └── CartContext.tsx
├── types/              # TypeScript definitions
│   ├── models.ts       # Data models (User, Product, Order, etc.)
│   └── navigation.ts   # Navigation types
├── utils/              # Utility functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── imageOptimizer.ts      # Image compression & upload
└── constants/          # App constants
    ├── config.ts       # Supabase config
    └── categories.ts   # Categories
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Navigate to mobile directory
cd food_delivery_app/mobile

# Install dependencies
npm install

# Configure environment (if needed)
# Edit src/constants/config.ts with your Supabase credentials

# Start the development server
npm start
```

### Running on Device/Simulator

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Or use Expo Go on physical device
# Scan QR code from terminal with Expo Go app
```

## 📱 Features

### Core Features (All Implemented)

- [x] **Navigation Structure**
  - Stack Navigator (Auth + Overlay screens)
  - Bottom Tab Navigator (Home, Search, Cart, Orders, Profile)
  - Fully wired navigation between all screens

- [x] **Home Screen** (FlatList Optimized)
  - FlatList with pagination (NOT map loops)
  - Pull-to-refresh support
  - Offline banner when disconnected
  - Horizontal scrolling categories
  - Featured vendors carousel
  - Product grid with 2-column layout
  - Loading more indicator

- [x] **Product Detail Screen**
  - Full product information display
  - Quantity selector
  - Add to cart functionality
  - Vendor navigation

- [x] **Post Product Screen** (Merchant)
  - Camera image capture
  - Gallery image selection
  - Image optimization before upload
  - Form validation
  - Upload progress indicator
  - Category selector

- [x] **Chat Screen** (Real-time)
  - Real-time messaging via Supabase subscriptions
  - Keyboard avoiding view
  - Message bubbles with sender differentiation
  - Auto-scroll to bottom

- [x] **Profile Screen**
  - User info display with role badge
  - Stats section (Orders, Saved, Reviews)
  - Menu items with switches (Notifications, Dark Mode)
  - Merchant-specific "Post Product" option
  - Offline mode indicator
  - Sign out functionality

### State Management

- [x] **Zustand Store** (`useProductStore`)
  - Product feed with pagination
  - Offline persistence via AsyncStorage
  - Category filtering
  - Search functionality
  - Loading states

### Technical Features

- [x] **Image Optimization**
  - Compression before upload
  - Resize to max 1200px width
  - Quality control (0.8 default)
  - File size validation
  - Multiple image selection

- [x] **Offline Support**
  - Network status monitoring via NetInfo
  - Offline banner display
  - Cached data when offline
  - Automatic retry on reconnect

- [x] **Authentication**
  - Supabase Auth integration
  - Email/password login
  - Role-based access (customer/merchant/driver)
  - AsyncStorage session persistence
  - Auth state change listeners

## 🔌 Backend Integration

### Same Supabase Project

The mobile app uses the **exact same** Supabase project as the web app:

```typescript
// src/constants/config.ts
export const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

### Database Tables Used

- `profiles` - User profiles with roles
- `sellers` - Vendor/merchant information
- `products` - Product listings
- `orders` - Order records
- `chats` / `chat_messages` - Messaging system
- `promotions` - Promo codes

### Real-time Subscriptions

All real-time features work identically to web:
- Order status updates
- Chat messages
- Vendor availability changes

## 🧪 Testing

```bash
# Run unit tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📦 Building for Production

```bash
# Create production build
expo build:android
expo build:ios

# Or use EAS Build (recommended)
eas build --platform android
eas build --platform ios
```

## 🔄 Migration Guide: Web → Mobile

### What Changes

| Web | Mobile |
|-----|--------|
| `localStorage` | `AsyncStorage` |
| `fetch()` API | Same (works in RN) |
| CSS/Tailwind | StyleSheet / NativeWind |
| Page navigation | Stack + Tab navigators |
| Click events | `onPress` / TouchableOpacity |
| DOM elements | React Native components |

### What Stays the Same

- Supabase client configuration
- Database queries and subscriptions
- Business logic (auth, cart calculations)
- Data models and types
- API endpoints (if using REST)

## 🎨 Design System

The mobile app follows the SmartSoko design system:

### Colors
- **Primary**: `#012d1d` (dark green)
- **Secondary**: `#c1ecd4` (light mint)
- **Accent**: `#d4a574` (gold)

### Typography
- System fonts for native feel
- Consistent with web app hierarchy

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Expo SDK 50 |
| Language | TypeScript |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| Styling | StyleSheet (native) |
| Backend | Supabase |
| State | Zustand (with persist middleware) |
| Storage | AsyncStorage |
| Network | NetInfo (offline detection) |
| Images | expo-image-picker, expo-image-manipulator |
| Icons | Emoji-based (native) |

## 📋 Development Checklist

### Core Setup
- [x] Project setup with Expo + TypeScript
- [x] Supabase client adaptation with AsyncStorage
- [x] TypeScript path aliases configured
- [x] Navigation structure (Stack + Bottom Tabs)

### State Management
- [x] Zustand store with persist middleware
- [x] Product store with pagination
- [x] Auth context with Supabase
- [x] Cart context with AsyncStorage

### Screens Implemented
- [x] Auth screens (Login, Signup, Role Selection)
- [x] Home screen (FlatList with pagination)
- [x] Product Detail screen
- [x] Post Product screen (Camera + Gallery)
- [x] Profile screen (enhanced)
- [x] Chat screen (real-time)
- [x] Cart & Checkout screens
- [x] Orders screen

### Mobile Optimizations
- [x] FlatList pagination (no map loops)
- [x] Pull-to-refresh
- [x] Image optimization before upload
- [x] Offline state handling
- [x] Network status monitoring

### Pending
- [ ] Push notifications
- [ ] Search screen filters
- [ ] App store deployment

## 🤝 Contributing

This mobile app is designed to stay in sync with the web app. When adding features:

1. Check if the backend service already exists in `supabase/client.js`
2. Adapt the service for mobile (AsyncStorage, React Native APIs)
3. Create screen following mobile UX patterns
4. Update navigation configuration

## 📝 License

Same as the main SmartSoko project.

## 🆘 Support

For issues related to:
- **Mobile app**: Create issue with `[mobile]` prefix
- **Backend/API**: Reference the main project
- **Feature parity**: Compare with web app behavior

---

**Happy Coding! 🚀**
