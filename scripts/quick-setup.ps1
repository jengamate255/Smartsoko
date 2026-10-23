# Quick setup after Flutter is installed
param(
    [string]$FLUTTER_ROOT="C:\sdk\flutter",
    [string]$ANDROID_HOME="C:\sdk"
)

Write-Host "Flutter Setup - Automated Script" -ForegroundColor Cyan
Write-Host ""

# Add to PATH if needed
$env:Path += ";$FLUTTER_ROOT\bin"
# Session-only. To persist, add "$FLUTTER_ROOT\bin" to your user PATH via System Properties.

Write-Host "[1/4] Added Flutter bin to your session's PATH" -ForegroundColor Green

# Step 2: Generate Android wrapper (if not exists)
try {
    Write-Host "[2/4] Generating Flutter Android project..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\..\food_delivery_app"
    
    # Only create if android directory doesn't exist
    if (-not (Test-Path "android")) {
        Write-Host "Creating... android directory" -ForegroundColor Yellow
        flutter create --platforms=android android
        
        Set-Location android
    } else {
        Write-Host "Android project already exists." -ForegroundColor Green
    }
} catch {
    Write-Error "Setup failed: $_"
}
