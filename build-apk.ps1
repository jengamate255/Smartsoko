# SmartSoko APK Build Script for Windows
# This script builds a native Android APK on your PC

param(
    [switch]$Clean,
    [switch]$DevClient
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  SmartSoko Mobile - APK Builder" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Set paths
$ProjectRoot = "e:\Project\food delivery\food_delivery_app\mobile"
$OutputDir = "e:\Project\food delivery\APK-Builds"

# Check if we're in the right directory
if (-not (Test-Path "$ProjectRoot\package.json")) {
    Write-Error "Cannot find package.json in $ProjectRoot"
    Write-Host "Please run this script from the project root" -ForegroundColor Red
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Yellow
}

# Step 1: Navigate to project
Write-Host "Step 1: Navigating to project directory..." -ForegroundColor Cyan
Set-Location $ProjectRoot
Write-Host "  Working in: $(Get-Location)" -ForegroundColor Gray

# Step 2: Check Node.js
Write-Host "Step 2: Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Node.js is not installed or not in PATH"
    exit 1
}
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray

# Step 3: Install dependencies if needed
Write-Host "Step 3: Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "$ProjectRoot\node_modules") -or $Clean) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps 2>&1 | ForEach-Object { "    $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
} else {
    Write-Host "  Dependencies already installed" -ForegroundColor Gray
}

# Step 4: Check if we need to prebuild
Write-Host "Step 4: Checking Android project setup..." -ForegroundColor Cyan
if (-not (Test-Path "$ProjectRoot\android\build.gradle")) {
    Write-Host "  Android folder not found. Running prebuild..." -ForegroundColor Yellow
    
    # Install expo prebuild if needed
    npx expo prebuild --platform android --clean 2>&1 | ForEach-Object { "    $_" }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Prebuild failed"
        exit 1
    }
} else {
    Write-Host "  Android project already configured" -ForegroundColor Gray
}

# Step 5: Build APK
Write-Host "Step 5: Building APK..." -ForegroundColor Cyan
Write-Host "  This may take 5-15 minutes depending on your system..." -ForegroundColor Yellow

$gradleCmd = "$ProjectRoot\android\gradlew.bat"
if (-not (Test-Path $gradleCmd)) {
    # Try with .cmd extension
    $gradleCmd = "$ProjectRoot\android\gradlew"
}

if (-not (Test-Path $gradleCmd)) {
    Write-Error "Gradle wrapper not found at $gradleCmd"
    exit 1
}

# Clean build if requested
if ($Clean) {
    Write-Host "  Cleaning previous build..." -ForegroundColor Yellow
    & $gradleCmd -p "$ProjectRoot\android" clean 2>&1 | ForEach-Object { "    $_" }
}

# Build the APK
& $gradleCmd -p "$ProjectRoot\android" assembleRelease 2>&1 | ForEach-Object { "    $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed! Check the errors above."
    exit 1
}

# Step 6: Copy APK to output directory
Write-Host "Step 6: Copying APK to output directory..." -ForegroundColor Cyan

$sourceApk = "$ProjectRoot\android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $sourceApk)) {
    # Try alternative paths
    $sourceApk = Get-ChildItem -Path "$ProjectRoot\android\app\build\outputs\apk" -Recurse -Filter "*.apk" | Select-Object -First 1 | ForEach-Object { $_.FullName }
}

if (-not (Test-Path $sourceApk)) {
    Write-Error "APK not found after build!"
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$apkName = "SmartSoko-v1.0.0-$timestamp.apk"
$destApk = "$OutputDir\$apkName"

Copy-Item -Path $sourceApk -Destination $destApk -Force

# Also copy to standard name
$standardApk = "$OutputDir\SmartSoko-latest.apk"
Copy-Item -Path $sourceApk -Destination $standardApk -Force

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK Location: $destApk" -ForegroundColor White
Write-Host "Standard Name: $standardApk" -ForegroundColor White
Write-Host ""
Write-Host "APK Details:" -ForegroundColor Cyan
$apkSize = (Get-Item $destApk).Length / 1MB
Write-Host "  Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Gray
Write-Host "  Created: $(Get-Date)" -ForegroundColor Gray
Write-Host ""
Write-Host "To install on device:" -ForegroundColor Yellow
Write-Host "  adb install '$destApk'" -ForegroundColor Gray
Write-Host ""

exit 0
