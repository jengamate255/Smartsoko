// Build the native driver app
// Using gradle-8.9-bin.zip extracted to project root

@echo off
cd /d "%~dp0"
call gradle-8.9\bin\gradle wrapper clean assembleDebug --console=plain

if %errorlevel% neq 0 (
    echo Build failed with error code: %errorlevel%
    exit /b %errorlevel%
)

echo Build successful! APK located at:
native-driver-app\\app\\build\\outputs\\apk\\debug\\app-debug.apk

pause
