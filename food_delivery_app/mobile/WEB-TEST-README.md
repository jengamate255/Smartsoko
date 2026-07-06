# Web Testing with Puppeteer

This document explains how to test the SmartSoko Mobile app on web using Puppeteer.

## Setup

### 1. Install Dependencies

```bash
cd food_delivery_app/mobile
npm install
```

This will install:
- `react-native-web` - For running React Native on web
- `react-dom` - React web renderer
- `@expo/webpack-config` - Webpack configuration for Expo
- `puppeteer` - Browser automation tool

### 2. Start the Web Dev Server

```bash
npm run web
```

This will start the Expo web server at `http://localhost:8081`

Wait for the server to fully start before running tests.

### 3. Run Puppeteer Tests

In a new terminal:

```bash
cd food_delivery_app/mobile
npm run test:puppeteer
```

Or directly:

```bash
node puppeteer-test.js
```

## What the Tests Check

The Puppeteer test script (`puppeteer-test.js`) verifies:

1. ✅ **App loads successfully** - Initial page load
2. ✅ **Login Screen** - Demo account login (if on auth screen)
3. ✅ **Home Screen** - Categories, featured vendors, search bar
4. ✅ **Search Screen** - Tab navigation works
5. ✅ **Cart Screen** - Cart functionality accessible
6. ✅ **Profile Screen** - User profile accessible
7. ✅ **Orders Screen** - Order history accessible
8. ✅ **Navigation** - Bottom tab navigation structure

## Screenshots

Tests save screenshots to the project root:
- `test-01-initial-load.png` - App initial state
- `test-02-home-screen.png` - Home screen
- `test-03-search-screen.png` - Search screen
- `test-04-cart-screen.png` - Cart screen
- `test-05-profile-screen.png` - Profile screen
- `test-06-orders-screen.png` - Orders screen
- `test-07-home-return.png` - Back on home
- `test-final-state.png` - Final full page screenshot
- `test-error-state.png` - Error state (if any)

## Alternative: Manual Browser Testing

Open your browser to: `http://localhost:8081`

## Troubleshooting

### Port Already in Use
If port 8081 is taken, Expo will use another port. Update `BASE_URL` in `puppeteer-test.js`:
```javascript
const BASE_URL = 'http://localhost:19006'; // or whatever port Expo uses
```

### Web Support Issues
If you see errors about native modules, some features may not work on web:
- AsyncStorage should work with the web polyfill
- Camera/native modules won't work (expected)

### Slow Loading
The initial webpack build can take 30-60 seconds. Wait for "Compiled successfully" before running tests.

## Architecture

```
Mobile App (React Native)
    ↓
react-native-web (compatibility layer)
    ↓
Webpack (bundling)
    ↓
Browser (Chrome via Puppeteer)
    ↓
Automated Tests
```

## Future Test Enhancements

To add more comprehensive tests:

1. **Feature Tests**: Add product to cart, checkout flow
2. **API Mocking**: Mock Supabase responses for consistent testing
3. **Visual Regression**: Compare screenshots against baselines
4. **Performance**: Measure load times, bundle size

Example enhanced test:
```javascript
// Add to cart test
await page.click('[data-testid="add-to-cart"]');
await page.waitForSelector('[data-testid="cart-badge"]');
const badgeCount = await page.$eval('[data-testid="cart-badge"]', el => el.textContent);
console.assert(badgeCount === '1', 'Item added to cart');
```

## Notes

- The mobile app uses the **same Supabase backend** as the web app
- Web version is for testing only - production uses native iOS/Android builds
- Some native-only features (push notifications, camera) won't work on web
