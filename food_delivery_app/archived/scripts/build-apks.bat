@echo off
echo.
echo ============================================
echo    SmartSoko APK Build Script
echo    Building Customer, Merchant and Driver Apps
echo ============================================
echo.

set PROJECT_ROOT=%~dp0
set BUILD_OUTPUT=%PROJECT_ROOT%APK-Builds
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Project Root: %PROJECT_ROOT%
echo Output Folder: %BUILD_OUTPUT%
echo Build Time: %TIMESTAMP%
echo.

:: Create output directory
if not exist "%BUILD_OUTPUT%" mkdir "%BUILD_OUTPUT%"

:: ============================================
:: BUILD CUSTOMER APP
:: ============================================
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║  📱 BUILDING CUSTOMER APP                                        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

cd /d "%PROJECT_ROOT%android-customer"

if not exist "gradlew.bat" (
    echo ❌ Customer app gradlew not found. Skipping...
    goto :BUILD_MERCHANT
)

echo 🔧 Cleaning previous build...
call gradlew.bat clean 2>nul

echo 🔨 Building Customer APK (Release)...
call gradlew.bat assembleRelease --no-daemon --console=plain

if %errorlevel% equ 0 (
    echo ✅ Customer APK build successful!
    
    :: Copy APK to output folder
    for /r "app\build\outputs\apk\release" %%f in (*.apk) do (
        copy "%%f" "%BUILD_OUTPUT%\SmartSoko-Customer-%TIMESTAMP%.apk" >nul
        echo 📋 Copied: %%~nxf ^-^> SmartSoko-Customer-%TIMESTAMP%.apk
    )
) else (
    echo ❌ Customer APK build failed!
)

:: ============================================
:: BUILD MERCHANT APP
:: ============================================
:BUILD_MERCHANT
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║  🏪 BUILDING MERCHANT APP                                        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

cd /d "%PROJECT_ROOT%android-merchant"

if not exist "gradlew.bat" (
    echo ❌ Merchant app gradlew not found. Skipping...
    goto :BUILD_DRIVER
)

echo 🔧 Cleaning previous build...
call gradlew.bat clean 2>nul

echo 🔨 Building Merchant APK (Release)...
call gradlew.bat assembleRelease --no-daemon --console=plain

if %errorlevel% equ 0 (
    echo ✅ Merchant APK build successful!
    
    :: Copy APK to output folder
    for /r "app\build\outputs\apk\release" %%f in (*.apk) do (
        copy "%%f" "%BUILD_OUTPUT%\SmartSoko-Merchant-%TIMESTAMP%.apk" >nul
        echo 📋 Copied: %%~nxf ^-^> SmartSoko-Merchant-%TIMESTAMP%.apk
    )
) else (
    echo ❌ Merchant APK build failed!
)

:: ============================================
:: BUILD DRIVER APP
:: ============================================
:BUILD_DRIVER
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║  🚚 BUILDING DRIVER APP                                          ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

cd /d "%PROJECT_ROOT%android-driver"

if not exist "gradlew.bat" (
    echo ❌ Driver app gradlew not found. Skipping...
    goto :BUILD_COMPLETE
)

echo 🔧 Cleaning previous build...
call gradlew.bat clean 2>nul

echo 🔨 Building Driver APK (Release)...
call gradlew.bat assembleRelease --no-daemon --console=plain

if %errorlevel% equ 0 (
    echo ✅ Driver APK build successful!
    
    :: Copy APK to output folder
    for /r "app\build\outputs\apk\release" %%f in (*.apk) do (
        copy "%%f" "%BUILD_OUTPUT%\SmartSoko-Driver-%TIMESTAMP%.apk" >nul
        echo 📋 Copied: %%~nxf ^-^> SmartSoko-Driver-%TIMESTAMP%.apk
    )
) else (
    echo ❌ Driver APK build failed!
)

:: ============================================
:: BUILD COMPLETE
:: ============================================
:BUILD_COMPLETE
cd /d "%PROJECT_ROOT%"

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    ✅ BUILD COMPLETE                             ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo 📦 APK files saved to: %BUILD_OUTPUT%
echo.

dir "%BUILD_OUTPUT%\*.apk" 2>nul | findstr "SmartSoko"

echo.
echo Next steps:
echo   1. Install Android Studio if builds fail
echo   2. Open each android-* folder in Android Studio
echo   3. Sync project with Gradle files
echo   4. Run: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo.
echo 🔗 Live URLs (Firebase):
echo   Customer: https://fooddelievry-dce15.web.app/customer.html
echo   Merchant: https://fooddelievry-dce15.web.app/merchant.html
echo   Driver:   https://fooddelievry-dce15.web.app/driver.html
echo.

pause
