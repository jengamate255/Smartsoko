@echo off
echo ==========================================
echo Food Delivery App - APK Builder Script
echo ==========================================
echo.
echo Building all app variants...
echo.

REM Check if Android SDK is available
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME environment variable not set
    echo Please install Android Studio and set ANDROID_HOME
    pause
    exit /b 1
)

REM Create output directory
if not exist "APK-Builds" mkdir "APK-Builds"

echo [1/4] Building Customer APK...
cd android-customer
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    copy "app\build\outputs\apk\debug\app-debug.apk" "..\APK-Builds\FoodDelivery-Customer-v1.0.0.apk" /Y
    echo ✓ Customer APK built successfully
) else (
    echo ✗ Customer APK build failed
)
cd ..

echo [2/4] Building Driver APK...
cd android-driver
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    copy "app\build\outputs\apk\debug\app-debug.apk" "..\APK-Builds\FoodDelivery-Driver-v1.0.0.apk" /Y
    echo ✓ Driver APK built successfully
) else (
    echo ✗ Driver APK build failed
)
cd ..

echo [3/4] Building Merchant APK...
cd android-merchant
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    copy "app\build\outputs\apk\debug\app-debug.apk" "..\APK-Builds\FoodDelivery-Merchant-v1.0.0.apk" /Y
    echo ✓ Merchant APK built successfully
) else (
    echo ✗ Merchant APK build failed
)
cd ..

echo [4/4] Building Main Wrapper APK...
cd android-wrapper
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    copy "build\outputs\apk\debug\android-wrapper-debug.apk" "..\APK-Builds\FoodDelivery-Main-v1.0.0.apk" /Y
    echo ✓ Main Wrapper APK built successfully
) else (
    echo ✗ Main Wrapper APK build failed
)
cd ..

echo.
echo ==========================================
echo Build Complete!
echo ==========================================
echo.
echo APK files are located in: APK-Builds/
echo.
echo Files created:
dir "APK-Builds\*.apk" /b
echo.
echo.
echo To install on your Android device:
echo 1. Enable USB debugging on your device (Settings ^> Developer Options)
echo 2. Connect your device via USB
echo 3. Run: adb install APK-Builds/FoodDelivery-Customer-v1.0.0.apk
echo.
echo Or copy the APK files to your device and install directly.
echo.
pause
