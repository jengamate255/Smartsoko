@echo off
echo Building Food Delivery APK...

REM Check if Android SDK is available
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME environment variable not set
    echo Please install Android Studio and set ANDROID_HOME
    pause
    exit /b 1
)

REM Navigate to Android wrapper directory
cd android-wrapper

REM Clean previous builds
echo Cleaning previous builds...
call gradlew clean

REM Build debug APK
echo Building debug APK...
call gradlew assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo APK built successfully!
    echo APK location: android-wrapper/app/build/outputs/apk/debug/app-debug.apk
    echo.
    echo To install on device:
    echo 1. Enable USB debugging on your Android device
    echo 2. Connect device via USB
    echo 3. Run: adb install app/build/outputs/apk/debug/app-debug.apk
    echo.
) else (
    echo ERROR: APK build failed
    echo Please check the error messages above
)

pause
