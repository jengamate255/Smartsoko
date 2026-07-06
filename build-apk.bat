@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo   SmartSoko Mobile - APK Build Script
echo ==========================================
echo.

set PROJECT_DIR=e:\Project\food delivery\food_delivery_app\mobile
set OUTPUT_DIR=e:\Project\food delivery\APK-Builds

:: Check if project exists
if not exist "%PROJECT_DIR%\package.json" (
    echo ERROR: Project not found at %PROJECT_DIR%
    exit /b 1
)

:: Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)
echo      Node.js version: 
node --version

echo.
echo [2/5] Installing dependencies...
cd /d "%PROJECT_DIR%"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: npm install failed
    exit /b 1
)

echo.
echo [3/5] Generating Android project...
if not exist "%PROJECT_DIR%\android\build.gradle" (
    call npx expo prebuild --platform android
    if errorlevel 1 (
        echo ERROR: Prebuild failed
        exit /b 1
    )
) else (
    echo      Android project already exists
)

echo.
echo [4/5] Building APK (this may take 5-15 minutes)...
cd "%PROJECT_DIR%\android"
call .\gradlew assembleRelease
if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)

echo.
echo [5/5] Copying APK to output directory...
set SOURCE_APK=%PROJECT_DIR%\android\app\build\outputs\apk\release\app-release.apk

if not exist "%SOURCE_APK%" (
    :: Try to find any APK
    for /f "delims=" %%a in ('dir /s /b "%PROJECT_DIR%\android\app\build\outputs\apk\*.apk" 2^>nul') do (
        set SOURCE_APK=%%a
        goto :found_apk
    )
)

:found_apk
if not exist "%SOURCE_APK%" (
    echo ERROR: APK not found after build
    exit /b 1
)

set APK_NAME=SmartSoko-v1.0.0-%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.apk
set APK_NAME=%APK_NAME: =0%

copy /y "%SOURCE_APK%" "%OUTPUT_DIR%\%APK_NAME%"
copy /y "%SOURCE_APK%" "%OUTPUT_DIR%\SmartSoko-latest.apk"

echo.
echo ==========================================
echo   BUILD SUCCESSFUL!
echo ==========================================
echo.
echo APK Location: %OUTPUT_DIR%\%APK_NAME%
echo Standard Name: %OUTPUT_DIR%\SmartSoko-latest.apk
echo.
echo To install on your device:
echo   adb install "%OUTPUT_DIR%\SmartSoko-latest.apk"
echo.

endlocal
