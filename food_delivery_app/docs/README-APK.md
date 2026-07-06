# Food Delivery APK Build Instructions

## Overview
This guide shows how to build an Android APK from the Food Delivery web application using an Android WebView wrapper.

## Prerequisites
1. **Android Studio** - Download and install from https://developer.android.com/studio
2. **Android SDK** - Set up through Android Studio
3. **Java Development Kit (JDK)** - Version 8 or higher

## Setup Instructions

### 1. Configure Environment Variables
Set these environment variables:
```bash
ANDROID_HOME=C:\Users\YourUser\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-xx.x.x
```

Add to PATH:
```bash
%ANDROID_HOME%\tools
%ANDROID_HOME%\platform-tools
%JAVA_HOME%\bin
```

### 2. Build the APK

#### Method 1: Using the Build Script
1. Open Command Prompt as Administrator
2. Navigate to the project directory:
   ```bash
   cd "d:\Project\food delivery\food_delivery_app"
   ```
3. Run the build script:
   ```bash
   build-apk.bat
   ```

#### Method 2: Manual Build
1. Open Command Prompt
2. Navigate to the Android wrapper directory:
   ```bash
   cd "d:\Project\food delivery\food_delivery_app\android-wrapper"
   ```
3. Clean previous builds:
   ```bash
   gradlew clean
   ```
4. Build debug APK:
   ```bash
   gradlew assembleDebug
   ```
5. Build release APK (for production):
   ```bash
   gradlew assembleRelease
   ```

### 3. Install the APK

#### Install via USB
1. Enable USB Debugging on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
2. Connect device via USB
3. Install the APK:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

#### Install via File Transfer
1. Copy the APK file to your device
2. On your device, enable "Install from Unknown Sources"
3. Open the APK file to install

## APK Locations
- **Debug APK**: `android-wrapper/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android-wrapper/app/build/outputs/apk/release/app-release.apk`

## Features Included
- ✅ Full web app functionality
- ✅ Offline support with service worker
- ✅ Native Android WebView optimizations
- ✅ Network connectivity detection
- ✅ Progress indicators
- ✅ Back button navigation
- ✅ Bottom navigation bar
- ✅ App icon and splash screen

## Configuration
The app loads the web application from:
- **Development**: `http://10.0.2.2:8080/customer.html` (local server)
- **Production**: Local files bundled with the app

To change the URL, edit `MainActivity.java` and modify the `loadApp()` method.

## Troubleshooting

### Common Issues
1. **"ANDROID_HOME not set"** - Install Android Studio and set environment variables
2. **"Gradle build failed"** - Check Android SDK installation and internet connection
3. **"WebView not loading"** - Ensure the local server is running when using development URL
4. **"Network errors"** - Check internet connection and firewall settings

### Debug Mode
To enable WebView debugging:
1. Enable USB debugging on device
2. In Chrome, go to `chrome://inspect`
3. Select your device under "WebView in com.fooddelivery.app"

## Production Release
For a production release:
1. Build the release APK: `gradlew assembleRelease`
2. Sign the APK with your keystore
3. Upload to Google Play Store or distribute directly

## Support
For issues with the build process:
1. Check Android Studio installation
2. Verify all environment variables are set
3. Ensure internet connection for Gradle downloads
4. Review build logs for specific error messages
