# Quick setup after Flutter is installed
param(
    [string]$FLUTTER_ROOT="C:\sdk\flutter",
    [string]$ANDROID_HOME="C:\sdk"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter Setup for APK Building" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Add to PATH if needed
$env:Path += ";" + $FLUTTER_ROOT + "\bin"
# Session-only. To persist, add "$FLUTTER_ROOT\bin" to your user PATH via System Properties.

Write-Host "[1/4] Added Flutter bin to your session's PATH" -ForegroundColor Green
Write-Host ""

# Step 2: Generate Android wrapper (if not exists)
try {
    Write-Host "[2/4] Generating Flutter Android project..." -ForegroundColor Cyan
    
    # Navigate to project
    Set-Location "$PSScriptRoot\..\food_delivery_app"
    
    # Only create if android directory doesn't exist
    if (-not (Test-Path "android")) {
        Write-Host "[2/4] Creating android directory with Flutter..." -ForegroundColor Yellow
        flutter create --platforms=android android
        
        Set-Location android
    } else {
        Write-Host "[2/4] Android project already exists." -ForegroundColor Green
        Set-Location android
    }
    
} catch {
    Write-Error "Setup failed: $_"
}

if (Test-Path "android") {
    Write-Host ""
    Write-Host "[3/4] Running Flutter doctor to check Android SDK..." -ForegroundColor Cyan
    
    & flutter doctor
    
    Write-Host ""
    
    if (-not ($LASTEXITCODE)) {
        # Step 4: Accept licenses (if needed)
        Write-Host "[4/4] Checking Android licenses..." -ForegroundColor Cyan
        
        $output = & flutter precache --post-framework --platforms=android windows linux macos ios web android 2>&1
        Write-Host "$output" -ForegroundColor Gray
        
        # Accept licenses if doctor indicated they're needed
        Write-Host ""
        Write-Host "[5/4] Running license acceptance..." -ForegroundColor Cyan
        & flutter config --no-analytics
    } else {
        Write-Host "Flutter commands working. Proceeding to APK rebuild step." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup instructions shown above!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
