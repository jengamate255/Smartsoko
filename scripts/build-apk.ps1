# Build APK script for Flutter project
param(
    [ValidateSet("debug", "profile", "release")][string]$Mode = "debug",
    [switch]$CleanFirst = $true,
    [string]$FlutterRoot = "C:\sdk\flutter"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Android APK ($Mode mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Flutter is in PATH
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Flutter not found in PATH." -ForegroundColor Red
    Write-Host "Please ensure you've installed Flutter and run:" -ForegroundColor Yellow
    Write-Host "  cd $FlutterRoot" -ForegroundColor Cyan
    Write-Host "  flutter doctor --android-license-agree" -ForegroundColor Cyan
    exit 1
}

# Repo root = parent of this scripts\ folder
$repoRoot   = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $repoRoot "food_delivery_app\android"

if (-not (Test-Path $androidDir)) {
    Write-Host "ERROR: Android wrapper not found at food_delivery_app\android" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Flutter first:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
    Write-Host "  2. Extract to $FlutterRoot" -ForegroundColor Cyan
    Write-Host "  3. Run: flutter create --platforms=android android" -ForegroundColor Cyan
    exit 1
}

Set-Location $androidDir

# Step 1: clean (optional)
if ($CleanFirst) {
    Write-Host "[1/2] Cleaning previous builds..." -ForegroundColor Green
    & .\gradlew.bat clean
} else {
    Write-Host "[1/2] Skipping clean..." -ForegroundColor Gray
}

# Step 2: build the variant matching -Mode
$task = @{
    debug   = "assembleDebug"
    profile = "assembleProfile"
    release = "assembleRelease"
}[$Mode]

Write-Host "[2/2] Building $Mode APK ($task)..." -ForegroundColor Cyan
& .\gradlew.bat $task

if ($LASTEXITCODE -ne 0) {
    Write-Error "Gradle build failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

$outputDir = Join-Path $androidDir "app\build\outputs\apk\$Mode"

if (Test-Path $outputDir) {
    $APK_PATH = Get-ChildItem -Path $outputDir -Filter "*.apk" | Select-Object -Last 1

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! APK Built:" -ForegroundColor Green
    Write-Host "   Location: $($APK_PATH.FullName)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Install onto your device with:" -ForegroundColor Cyan
    Write-Host "  adb install `"$($APK_PATH.FullName)`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Or copy to device via USB and install manually."
} else {
    Write-Error "APK build succeeded but output not found at $outputDir. Check gradle output."
}
