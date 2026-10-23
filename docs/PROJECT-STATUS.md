# SmartSoko APK Build Status

## Current Situation

✅ **Completed:**

- Flutter project exists at `food_delivery_app/lib/main_customer.dart`
- Web PWA and Node.js backend configured with Firebase Supabase
- Installation instructions (`INSTALL-FRUTTER.md`) created
- Automation scripts prepared in `scripts/` folder

❌ **Still Needed:**

- Flutter SDK download + extraction to your system
- Accept Android SDK licenses
- Re-generate Android wrapper project files

📘 **Your APK will be built at:**

```
food_delivery_app\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Installation Steps (in Order)

### Step 1: Download Flutter SDK

**Option A - Using Official Downloader (Easiest):**

1. Go to: **https://docs.flutter.dev/get-started/install/windows**
2. Click "Download Windows"
3. Accept terms, download `flutter_windows_x.x.x-x.stable.zip` (~600MB)

**Option B - Direct Download:**

```powershell
$env:TEMP + "\flutter_"
Invoke-WebRequest -Uri "https://storage.googleapis.com/flutter_windows_v3/stable/release/flutter_windows_3.24.1-stable.zip" -OutFile "$env:TEMP\flutter_windows_3.24.1-x.x.x-stable.zip"
```

### Step 2: Extract and Setup

**Extract to a Permanent Location:**

- Unzip `flutter_windows_x.x.x-x.stable.zip` → `C:\sdk\flutter`
- **Note:** Use WinRAR/7Zip if needed - standard Windows extractor works too

**Add Flutter to PATH (one-time):**

```powershell
$env:Path += ";C:\sdk\flutter\bin"
# To make permanent: Search "Environment Variables" in Windows Start Menu →
# Edit system environment variables → Path variable → New → C:\sdk\flutter\bin
```

### Step 3: Accept Licenses and Install Dependencies

**Run these commands from PowerShell (after Flutter is extracted to C:\):**

```powershell
cd D:\project\smartsoko

# Add Flutter bin to PATH if not in global env vars
$env:Path += ";C:\sdk\flutter\bin"
New-Item -ItemType Variable -Name 'Path' -Value $env:Path | Out-Null

# Accept Flutter license agreement
flutter config --no-analytics

# Generate Android project (if needed)
cd food_delivery_app
flutter create --platforms=android android --overwrite

cd android

# Fetch and accept Android SDK licenses
flutter doctor --android-license-agree
flutter precache --post-framework --platforms=android windows linux macos ios web android
```

### Step 4: Build Your APK

Once all above commands run successfully without errors:

**Build debug APK:**

```powershell
cd D:\project\smartsoko\food_delivery_app\android
gradlew clean
gradlew assembleDebug
```

The APK will appear at: `food_directory_app\android\app\build\outputs\apk\debug\app-debug.apk`

### Step 5: Install to Device

1. **Enable USB Debugging on Android device:**
    - Settings → About Phone → Tap "Build Number" 7 times (or Developer Options)
    - Go back to Settings → System/Developer Options → Enable USB Debugging

2. **Connect via USB** and run:

```powershell
adb devices
# Verify your device shows as connected (not "unauthorized")

adb install food_delivery_app\android\app\build\outputs\apk\debug\app-debug.apk
```

If device already has version installed, add force option:
`adb install --force <path>\app-debug.apk`

---

## Automation Scripts Available

In `D:\project\smartsoko\scripts\`:

- `setup-flutter.ps1` - Auto-generate Android wrapper project (run after Flutter is extracted)
- `build-apk.ps1` - Build APK (requires Flutter and licenses ready)
- `.bat files` - Windows batch wrappers for easier execution

### Quick Commands

Once Flutter is at `C:\sdk\flutter`:

```powershell
# Setup automation
cd D:\project\smartsoko\scripts
.\setup-flutter.ps1

# Build APK (debug, no signing keystore needed)
.\build-apk.ps1 -Mode debug

# Install manually when build complete
adb install food_delivery_app\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Troubleshooting

### "flutter: The term 'flutter' is not recognized"

- ✅ You skipped Step 2 or 3, or
- ❌ Flutter extracted to different directory than `C:\sdk\flutter`

**Solution:** Add your Flutter bin folder (e.g., from where you extracted) in PATH. Restart PowerShell terminal after adding PATH variable.

### Gradle sync failed / Build errors

```powershell
cd D:\project\smartsoko\food_delivery_app\android
gradlew clean
gradlew assembleDebug --info  # Shows more details
```

### Android licenses not accepted

```powershell
flutter doctor --android-license-agree
# Or manually via: C:\sdk\cmdline-tools\latest\bin\ sdkmanager --licenses
```

Check if you downloaded Android command line tools and extracted to `C:\sdk\cmdline-tools` or similar location. If not, download from Google and extract there.

### "Gradle not found"

Flutter should automatically bundle Gradle in:

- `C:\sdk\flutter\bin\gradle\wrapper\dists\...\lib\gradle\*.zip` - This extracts to the correct path.

If needed, configure ANDROID_HOME env var pointing to where Android SDK and Gradle are stored.

---

## Next Steps After APK Build

1. Install and test on physical device
2. Create release keystore for production builds (optional, see RELEASE-APK.md)
3. Update app name, icon, version in Android manifest (`android/app/build.gradle`)
4. Bundle multiple APKs for different screen densities (handled automatically by Flutter/Gradle)

---

## Alternative Options (if issues persist)

A. **Use Android Studio** instead of raw Flutter CLI:

- Install Android Studio from https://developer.android.com/studio
- It includes SDK Manager, Emulator, and Flutter tools
- Use Gradle toolchain inside it to build

B. **VS Code "Flutter & Dart" extension**:

- Can run Flutter/Android tasks directly from VS Code UI
- Still needs Flutter binary path configured in settings

C. **Use existing Windows Android developer tools** if already installed

---

## Summary

The project structure is correct, and APK building is ready to proceed once:

1. ✅ Flutter SDK downloaded (~600MB ZIP)
2. ✅ Extracted to `C:\sdk\flutter`
3. ✅ PATH updated with `C:\sdk\flutter\bin`
4. ✅ Android licenses accepted via `flutter doctor --android-license-agree`
5. ✅ Android project generated via `flutter create --platforms=android android`
6. ✅ APK built with Gradle commands

**Then install to physical device!**

---

_Need help? Run the automation scripts or check INSTALL-FRUTTER.md for detailed instructions._
