# SmartSoko Mobile - APK Build Guide

## Quick Build Instructions

### Option 1: Local Build (On Your PC)

This requires Android SDK and Java installed.

#### Prerequisites:
1. **Node.js** (18+) - Check with: `node --version`
2. **Android Studio** - Install from https://developer.android.com/studio
3. **Java JDK** (11 or 17) - Required for Android builds
4. **Android SDK** - Installed via Android Studio

#### Step-by-Step Build:

```powershell
# 1. Navigate to mobile app directory
cd "e:\Project\food delivery\food_delivery_app\mobile"

# 2. Install dependencies (first time only)
npm install --legacy-peer-deps

# 3. Generate native Android project
npx expo prebuild --platform android

# 4. Build the APK
cd android
.\gradlew assembleRelease

# 5. APK will be at:
# android\app\build\outputs\apk\release\app-release.apk
```

### Option 2: Using EAS Build (Cloud - Easier)

Build in the cloud using Expo's build service.

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to Expo (create account at expo.dev if needed)
eas login

# 3. Configure build
eas build:configure

# 4. Build APK
eas build --platform android --profile preview

# 5. Download APK from the provided URL
```

### Option 3: Expo Classic Build (Deprecated but working)

```bash
# Build using legacy Expo build system
expo build:android --type apk
```

## Current Project Status

### Mobile App Features:
✅ Navigation (Stack + Bottom Tabs)
✅ Authentication (Login/Signup with Supabase)
✅ Home Screen (FlatList with pagination)
✅ Product Listing & Detail
✅ Post Product (Camera/Gallery upload)
✅ Chat System (Real-time)
✅ Profile Screen
✅ Cart & Checkout

### Project Structure:
```
food_delivery_app/mobile/
├── src/
│   ├── navigation/      # React Navigation setup
│   ├── screens/         # All app screens
│   ├── services/        # Supabase integration
│   ├── store/           # Zustand state management
│   └── utils/           # Image optimization
├── App.tsx              # Entry point
├── app.json             # Expo config
└── package.json         # Dependencies
```

## Android Configuration

The app is configured in `app.json`:
- **Package**: `com.smartsoko.app`
- **Version**: 1.0.0
- **Permissions**: Camera, Storage, Internet

## Troubleshooting

### Build Fails with "Could not find gradle"
Make sure Android Studio is installed and SDK is configured.

### Out of Memory Error
Add to gradle.properties:
```
org.gradle.jvmargs=-Xmx4096m
```

### Duplicate Classes Error
Clean build:
```bash
cd android
.\gradlew clean
.\gradlew assembleRelease
```

## Installing the APK

After building, install on your device:

```bash
# Via ADB (USB debugging must be enabled)
adb install android\app\build\outputs\apk\release\app-release.apk

# Or copy APK to phone and tap to install
# (Allow "Install from Unknown Sources" if prompted)
```

## Output Location

APKs will be saved to:
- `food_delivery_app/mobile/android/app/build/outputs/apk/release/`
- Or the cloud build URL if using EAS

## Next Steps After Build

1. Test on Android device
2. Sign the APK for Play Store (requires keystore)
3. Upload to Google Play Console
4. Or distribute directly via download link

---

**Need Help?** Check the mobile app README at:
`food_delivery_app/mobile/README.md`
