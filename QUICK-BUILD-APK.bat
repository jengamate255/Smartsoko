@echo off
echo ==========================================
echo   SMARTSOKO NATIVE APK BUILD
echo   (True React Native - NOT WebView!)
echo ==========================================
echo.

set PROJECT=e:\Project\food delivery\food_delivery_app\mobile
set OUTPUT=e:\Project\food delivery\APK-Builds

cd /d "%PROJECT%"

echo Step 1: Installing dependencies...
echo (This will take 5-10 minutes on first run)
call npm install --legacy-peer-deps
if errorlevel 1 goto :error

echo.
echo Step 2: Generating Android project...
if not exist "android\build.gradle" (
    call npx expo prebuild --platform android
    if errorlevel 1 goto :error
) else (
    echo Android project already exists
)

echo.
echo Step 3: Building APK...
echo This will take 10-20 minutes. Please wait...
cd android
call .\gradlew.bat assembleRelease --console=plain
cd ..
if errorlevel 1 goto :error

echo.
echo Step 4: Copying APK...
if not exist "%OUTPUT%" mkdir "%OUTPUT%"
copy /y "android\app\build\outputs\apk\release\app-release.apk" "%OUTPUT%\SmartSoko-Native-latest.apk"

echo.
echo ==========================================
echo   BUILD SUCCESSFUL!
echo ==========================================
echo.
echo Your native APK is ready at:
echo %OUTPUT%\SmartSoko-Native-latest.apk
echo.
echo To install:
echo   adb install "%OUTPUT%\SmartSoko-Native-latest.apk"
echo.
pause
exit /b 0

:error
echo.
echo BUILD FAILED!
echo Check the error messages above.
pause
exit /b 1
