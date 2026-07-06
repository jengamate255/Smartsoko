@echo off
REM Build all three Android apps
echo 🚀 Building Food Delivery Android Apps
echo =====================================

echo 📱 Building Customer App...
cd android-customer
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo ✅ Customer App built successfully
) else (
    echo ❌ Customer App build failed
)
cd ..

echo 🚚 Building Driver App...
cd android-driver
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo ✅ Driver App built successfully
) else (
    echo ❌ Driver App build failed
)
cd ..

echo 🏪 Building Merchant App...
cd android-merchant
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo ✅ Merchant App built successfully
) else (
    echo ❌ Merchant App build failed
)
cd ..

echo 📦 All APKs are ready:
echo 📱 Customer App: android-customer/app/build/outputs/apk/debug/app-debug.apk
echo 🚚 Driver App: android-driver/app/build/outputs/apk/debug/app-debug.apk
echo 🏪 Merchant App: android-merchant/app/build/outputs/apk/debug/app-debug.apk

pause
