# 📱 SmartSoko APK Build Guide

## Overview
Build Android APKs for the three SmartSoko apps:
- **Customer App** - For customers to browse and order
- **Merchant App** - For restaurants to manage orders
- **Driver App** - For delivery drivers

## 🚀 Quick Build (Using Script)

### Prerequisites
1. **Android Studio** installed
2. **JDK 8 or higher** installed
3. **Environment variables** set (ANDROID_HOME, JAVA_HOME)

### Build All Apps
```bash
# Windows
cd "e:\Project\food delivery\food_delivery_app"
build-apks.bat
```

APKs will be saved to: `APK-Builds/` folder

---

## 🔧 Manual Build (Using Android Studio)

### Step 1: Build Customer App

1. Open Android Studio
2. **File → Open** → Select `android-customer` folder
3. Wait for Gradle sync to complete
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. Find APK at: `android-customer/app/build/outputs/apk/release/`

### Step 2: Build Merchant App

1. Open Android Studio
2. **File → Open** → Select `android-merchant` folder
3. Wait for Gradle sync
4. **Build → Build APK(s)**
5. Find APK at: `android-merchant/app/build/outputs/apk/release/`

### Step 3: Build Driver App

1. Open Android Studio
2. **File → Open** → Select `android-driver` folder
3. Wait for Gradle sync
4. **Build → Build APK(s)**
5. Find APK at: `android-driver/app/build/outputs/apk/release/`

---

## 📋 Build Configuration

### App Details

| App | Package Name | URL Loaded |
|-----|--------------|------------|
| Customer | `com.fooddelivery.customer` | `https://smartsoko-marketplace.vercel.app/customer.html` |
| Merchant | `com.fooddelivery.merchant` | `https://smartsoko-marketplace.vercel.app/merchant.html` |
| Driver | `com.fooddelivery.driver` | `https://smartsoko-marketplace.vercel.app/driver.html` |

### Features

**Customer App:**
- Browse restaurants and menus
- Place orders
- Track deliveries
- Manage profile
- View order history
- Offline support

**Merchant App:**
- Manage restaurant profile
- View and process orders
- Update menu items
- Analytics dashboard
- Order notifications

**Driver App:**
- Accept delivery requests
- Real-time location tracking
- Navigation to customer
- Earnings tracking
- Order status updates

---

## 🛠️ Troubleshooting

### "Gradle sync failed"
**Fix:**
1. Check internet connection
2. Update Gradle in Android Studio
3. Clean and rebuild: `Build → Clean Project`

### "Could not find JDK"
**Fix:**
1. Install JDK 8 or higher
2. Set JAVA_HOME environment variable
3. Restart Android Studio

### "Build failed with errors"
**Fix:**
1. Check for syntax errors in MainActivity.java
2. Ensure all imports are correct
3. Update Android SDK to latest version

### "APK not installing on device"
**Fix:**
1. Enable "Unknown sources" in device settings
2. Check APK signature
3. Ensure minimum SDK version matches device

---

## 🔐 Signing for Production

### Create Keystore
```bash
keytool -genkey -v -keystore smartsoko.keystore -alias smartsoko -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing
Add to `app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("smartsoko.keystore")
            storePassword "your_password"
            keyAlias "smartsoko"
            keyPassword "your_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 📦 Output Locations

### Automatic Build Script
- `APK-Builds/SmartSoko-Customer-[timestamp].apk`
- `APK-Builds/SmartSoko-Merchant-[timestamp].apk`
- `APK-Builds/SmartSoko-Driver-[timestamp].apk`

### Android Studio Build
- Customer: `android-customer/app/build/outputs/apk/release/`
- Merchant: `android-merchant/app/build/outputs/apk/release/`
- Driver: `android-driver/app/build/outputs/apk/release/`

---

## 🚀 Deployment

### Distribute APKs

1. **Google Play Store:**
   - Create developer account
   - Upload signed APK
   - Fill app details
   - Publish

2. **Direct Distribution:**
   - Host APKs on your website
   - Share download links
   - Users enable "Unknown sources" to install

3. **Internal Testing:**
   - Use Firebase App Distribution
   - Share with team members
   - Collect feedback

---

## 📝 Notes

- Each app loads the web interface from Vercel
- No backend code in APK - pure web wrapper
- Updates to web are instantly available in apps
- Offline page shown when no internet

---

## 🔗 Related Links

- **Live Customer App:** https://smartsoko-marketplace.vercel.app/customer.html
- **Live Merchant App:** https://smartsoko-marketplace.vercel.app/merchant.html
- **Live Driver App:** https://smartsoko-marketplace.vercel.app/driver.html

---

## ✅ Build Checklist

- [ ] Android Studio installed
- [ ] SDK and build tools updated
- [ ] Gradle sync successful
- [ ] Build APK for Customer
- [ ] Build APK for Merchant
- [ ] Build APK for Driver
- [ ] Test APKs on device
- [ ] Sign APKs for production
- [ ] Distribute to users

**Ready to build! 🎉**
