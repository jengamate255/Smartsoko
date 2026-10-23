# Manual Flutter SDK Installation Guide

## What You'll Get

After following these steps, you'll have:

- Flutter SDK installed on Windows
- Ability to build APKs for Android devices
- Access to `flutter` CLI commands
- Gradle build system configured

---

## Step 1: Download Flutter SDK

### Option A: Use the Official Downloader (Recommended)

1. Visit: **https://docs.flutter.dev/get-started/install/windows**
2. Click "Download Windows" button
3. Accept terms and let it download `flutter_windows_x.x.x-x.stable.zip` (~600MB)

### Option B: Direct Download Link (if you have browser access)

```powershell
$flutterUrl = "https://storage.googleapis.com/flutter_windows_v3/stable/release/flutter_windows_3.24.1-stable.zip"
ProgressPreference:'SilentlyContinue'; Invoke-WebRequest -Uri $flutterUrl -OutFile "$ENV:TEMP\flutter_stable.zip"
```

**Alternatively**, search your browser for "Flutter SDK Windows download" and download the ZIP installer (~500-600MB).

---

## Step 2: Extract and Set Up Flutter

### Extract Files

1. Unzip `flutter_windows_x.x.x-x.stable.zip` anywhere convenient (e.g., `C:\src\flutter`)
    - Or use WinRAR/7Zip to extract the ZIP file
2. Move extracted folder to a permanent location like: `C:\sdk\flutter`

### Set Environment Variables

Run this in PowerShell **as Administrator**:

```powershell
# Add Flutter to PATH
$env:Path += ";C:\sdk\flutter\bin"

# Verify installation
flutter --version
```

**Note:** To make it permanent after closing terminal:

1. Search "Environment Variables" in Windows Start Menu
2. Click "Edit the system environment variables"
3. Click "Environment Variables..." button
4. Under "System variables", find "Path" → Edit → New → Add `C:\sdk\flutter\bin`
5. Apply and OK

---

## Step 3: Install Flutter Dependencies

Open PowerShell in your project folder and run:

```powershell
# Move to the Flutter app directory
cd D:\project\smartsoko\food_delivery_app\lib

# Accept licenses (first time only)
flutter config --no-analytics

# Generate Android platform files
flutter create --platforms=android android-wrapper

# This will:
# - Create android-wrapper/ directory with Gradle project
# - Set up Android SDK configuration if not present
```

---

## Step 4: Install Android Command Line Tools (if needed)

Flutter needs Android SDK command tools. Check if they're automatically installed; otherwise:

1. Download from: **https://developer.android.com/stereo/software/command-line**
2. Extract to `C:\sdk\cmdline-tools`
3. Set ANDROID_HOME:

```powershell
$env:ANDROID_HOME = "C:\sdk"
# Or use cmdline-tools path if Flutter installed SDK there automatically
$env:PATH += ";C:\sdk\cmdline-tools\latest\bin"
```

---

## Step 5: Accept Android SDK Licenses

```powershell
flutter doctor --android-license-agree
```

This accepts all Android license agreements required for APK builds.

---

## Step 6: Verify Setup

```powershell
# Check Flutter installation
flutter --version

# Check Android setup
flutter doctor

# This will tell you what's missing and auto-fix if possible
```

If `flutter doctor` shows Android licenses not accepted:

```powershell
flutter precache --post-framework --platforms=android linux windows macos ios web android
flutter config --disable-analytics  # optional
```

---

## Step 7: Build APK

Once Flutter is set up and working:

**Navigate to project:**

```powershell
cd D:\project\smartsoko\food_delivery_app\android-wrapper
```

**Build debug APK:**

```powershell
flutter build apk --debug
```

APK location will be at:

```
D:\project\smartsoko\food_delivery_app\build\app\outputs\apk\debug\app-debug.apk
```

---

## Quick Commands Reference

### Rebuild APK

```powershell
cd D:\project\smartsoko\food_delivery_app\android-wrapper
flutter clean
flutter build apk --debug
```

### Build Release (signed) APK for production device

```powershell
# You'll need to create a signing keystore first
flutter build apk --release
```

### Install from Windows using ADB

```powershell
# USB Debugging must be enabled on device
cd D:\project\smartsoko\food_delivery_app\android-wrapper
adb devices  # Check connection
adb install build/app/outputs/apk/debug/app-debug.apk
```

---

## Troubleshooting

### Issue: `flutter` command not found?

- Verify Flutter bin directory is in PATH
- Restart PowerShell after setting environment variables

### Issue: Android licenses error?

```powershell
flutter doctor --android-license-agree
# Then retry build
```

### Issue: Gradle sync failed?

```powershell
cd android-wrapper
gradlew clean
gradlew assembleDebug
```

---

## Next Steps After Installation

1. Enable USB Debugging on your Android device
2. Connect via USB (enable Developer Options → USB Debugging)
3. Run `flutter build apk --debug` in the `android-wrapper/` directory
4. Install with: `adb install path-to-your-app.apk`

---

## Need Help?

After running `flutter doctor`, let me know what it shows. I can help resolve any setup issues you encounter.
