# SmartSoko Mobile Migration Plan

## Executive Summary

Converting the SmartSoko web app to a **React Native (Expo) mobile app** while reusing existing backend infrastructure. This is NOT a WebView wrapper - it's a true native app using the same Supabase/Firebase backend.

---

## 1. Web → Mobile Architecture Mapping

### Backend Reuse (100% Compatible)

| Web Component | Mobile Equivalent | Reuse Status |
|--------------|-------------------|--------------|
| Supabase Client (`supabase/client.js`) | `services/supabase.ts` | **Adapt** - Same SDK, different storage |
| Firebase Auth (`auth-check.js`) | `services/auth.ts` | **Adapt** - Use `@react-native-firebase/auth` |
| API Client (`api-client.js`) | `services/api.ts` | **Reuse** - Fetch API works in RN |
| Data Service (`data-service.js`) | `services/data.ts` | **Adapt** - Replace Firestore with Supabase |
| Cart Service (`cart-service.js`) | `services/cart.ts` | **Rewrite** - Use AsyncStorage instead of localStorage |
| Real-time subscriptions | `services/realtime.ts` | **Reuse** - Supabase realtime works in RN |

### UI/UX Transformations

| Web Pattern | Mobile Pattern | Implementation |
|-------------|----------------|----------------|
| HTML Pages | React Native Screens | `src/screens/` |
| Navigation Links | Bottom Tab Navigator | `@react-navigation/bottom-tabs` |
| Click Events | Touch/Press Events | `Pressable`, `TouchableOpacity` |
| CSS/Tailwind | StyleSheet + NativeWind | NativeWind (Tailwind for RN) |
| localStorage | AsyncStorage | `@react-native-async-storage/async-storage` |
| Window Resize | Dimensions API | `useWindowDimensions` hook |
| Desktop Hover | Long Press / Double Tap | Gesture handlers |

---

## 2. Directory Structure

```
food_delivery_app/mobile/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Buttons, Inputs, Cards
│   │   ├── product/         # ProductCard, ProductList
│   │   ├── vendor/          # VendorCard, VendorList
│   │   └── chat/            # MessageBubble, ChatInput
│   ├── screens/             # Screen components
│   │   ├── auth/            # Login, Signup, ForgotPassword
│   │   ├── main/            # Home, Search, Profile
│   │   ├── vendor/          # VendorDetail, Products
│   │   ├── cart/            # Cart, Checkout
│   │   ├── orders/          # OrderHistory, OrderDetail
│   │   └── chat/            # ChatList, ChatRoom
│   ├── navigation/          # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── services/            # Business logic (REUSABLE)
│   │   ├── supabase.ts      # Adapted from web
│   │   ├── auth.ts          # Authentication service
│   │   ├── api.ts           # API client
│   │   ├── cart.ts          # Cart management
│   │   ├── data.ts          # Data fetching
│   │   ├── realtime.ts      # Real-time subscriptions
│   │   └── notifications.ts # Push notifications
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   ├── useVendors.ts
│   │   └── useChat.ts
│   ├── context/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/               # TypeScript types
│   │   ├── models.ts        # Data models
│   │   ├── api.ts           # API types
│   │   └── navigation.ts    # Navigation types
│   ├── utils/               # Utility functions
│   │   ├── formatters.ts    # Currency, date formatting
│   │   ├── validators.ts    # Input validation
│   │   └── storage.ts       # Storage helpers
│   ├── constants/           # App constants
│   │   ├── colors.ts
│   │   ├── categories.ts
│   │   └── config.ts
│   └── assets/              # Images, fonts
├── App.tsx                  # Entry point
├── app.json                 # Expo configuration
├── package.json
├── tsconfig.json
└── tailwind.config.js       # NativeWind config
```

---

## 3. Code Reuse Strategy

### Can Be Directly Reused (with minor adaptations)

1. **Supabase Schema & Queries**
   - All table definitions
   - Query patterns (filters, ordering, pagination)
   - Real-time subscription logic

2. **Business Logic**
   - Authentication flows
   - Cart calculations
   - Order status transitions
   - Promo code validation

3. **Data Models**
   - User types (customer, merchant, driver, admin)
   - Product/Seller structures
   - Order structures
   - Chat message format

### Needs Rewrite

1. **Storage Layer**
   - `localStorage` → `AsyncStorage`
   - Add encryption for sensitive data

2. **Navigation**
   - URL-based routing → React Navigation
   - Add deep linking support

3. **UI Components**
   - HTML/CSS → React Native components
   - Responsive design → Mobile-first layouts
   - Mouse events → Touch gestures

4. **Image Handling**
   - `<img>` → `Image` component with caching
   - Add progressive loading
   - Implement offline image cache

---

## 4. Mobile-Specific Enhancements

### Bottom Tab Navigation

```
┌─────────────────────────────────────────┐
│  🏠 Home    🔍 Search   🛒 Cart   👤 Profile  │
└─────────────────────────────────────────┘
```

### Low Bandwidth Optimizations

1. **Image Optimization**
   - Compress images on upload
   - Multiple sizes (thumbnail, full)
   - Lazy loading with placeholders
   - Offline image caching

2. **Data Pagination**
   - Infinite scroll for lists
   - Pull-to-refresh
   - Optimistic updates

3. **Offline Support**
   - Cache critical data (categories, user profile)
   - Queue actions for sync (cart updates, messages)
   - Show offline indicator

### Push Notifications

- Order status updates
- New messages
- Promo notifications
- Driver location updates

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Project setup with Expo + TypeScript
- [x] Navigation structure
- [x] Supabase client adaptation
- [x] Auth context and hooks

### Phase 2: Auth + Core (Week 2)
- [x] Login/Signup screens
- [x] Role-based routing
- [x] Home screen with categories
- [x] Vendor listing

### Phase 3: Commerce (Week 3)
- [x] Product listing
- [x] Search and filters
- [x] Cart functionality
- [x] Checkout flow

### Phase 4: Engagement (Week 4)
- [x] Order history
- [x] Chat system
- [x] User profile
- [ ] Push notifications

### Phase 5: Polish (Week 5)
- [ ] Offline caching
- [ ] Performance optimization
- [ ] Testing
- [ ] Deployment

---

## 6. Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | Expo SDK 50+ | React Native platform |
| Language | TypeScript | Type safety |
| Navigation | React Navigation v6 | Screen routing |
| Styling | NativeWind | Tailwind for RN |
| Backend | Supabase | Database, Auth, Realtime |
| State | React Context + Hooks | Local state |
| Storage | AsyncStorage | Local persistence |
| Images | Expo Image | Optimized image loading |
| Notifications | Expo Notifications | Push notifications |
| Maps | React Native Maps | Location features |

---

## 7. Key Differences from Web

| Aspect | Web | Mobile |
|--------|-----|--------|
| Auth Persistence | Firebase Auth + localStorage | Supabase Auth + SecureStore |
| Cart Storage | localStorage | AsyncStorage |
| Images | Standard `<img>` | `Image` with resizeMode |
| Navigation | URL-based | Stack + Tab navigators |
| Real-time | Firestore listeners | Supabase realtime |
| Offline | Limited | Full offline support |
| Gestures | Click/scroll | Swipe, pinch, long-press |

---

## 8. Configuration Files

### Supabase Config (Reused)
```typescript
const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Firebase Config (Optional - for push notifications)
```typescript
// Only needed for Firebase Cloud Messaging
const firebaseConfig = {
  // From existing web config
};
```

---

## 9. Testing Strategy

1. **Unit Tests**: Jest for services/hooks
2. **Integration Tests**: React Native Testing Library
3. **E2E Tests**: Detox for critical flows
4. **Manual Testing**: Physical devices (iOS/Android)

---

## 10. Deployment

| Platform | Store | Method |
|----------|-------|--------|
| iOS | App Store | EAS Build + Submit |
| Android | Play Store | EAS Build + Submit |
| OTA Updates | - | EAS Update |

---

## Summary

This migration preserves **all existing backend logic** while creating a **true native mobile experience**. The mobile app will:

- ✅ Use the same Supabase project
- ✅ Maintain feature parity with web
- ✅ Add mobile-native UX patterns
- ✅ Support offline usage
- ✅ Enable push notifications

**Estimated Timeline**: 4-5 weeks for full feature parity
