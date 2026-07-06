# Build all SmartSoko APKs (Customer, Driver, Merchant)
$ErrorActionPreference = "Continue"

$baseDir = "e:\Project\food delivery\food_delivery_app"
$outputDir = "e:\Project\food delivery\APK-Builds"

# Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$apps = @(
    @{ Name = "Customer"; Dir = "android-customer"; Package = "com.fooddelivery.customer"; OutputName = "SmartSoko-Customer-new.apk" },
    @{ Name = "Driver"; Dir = "android-driver"; Package = "com.fooddelivery.driver"; OutputName = "SmartSoko-Driver-new.apk" },
    @{ Name = "Merchant"; Dir = "android-merchant"; Package = "com.fooddelivery.merchant"; OutputName = "SmartSoko-Merchant-new.apk" }
)

$successCount = 0

function Build-SmartSokoApk {
    param($app)
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Building $($app.Name) APK..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $appDir = Join-Path $baseDir $app.Dir
    $apkSource = Join-Path $appDir "app\build\outputs\apk\release\app-release-unsigned.apk"
    $apkDest = Join-Path $outputDir $app.OutputName
    
    Set-Location $appDir
    
    Write-Host "Running Gradle build..." -ForegroundColor Yellow
    $buildResult = & .\gradlew.bat clean assembleRelease --console=plain 2>&1
    $buildResult | ForEach-Object { 
        if ($_ -match "BUILD") { 
            Write-Host $_ -ForegroundColor $(if ($_ -match "SUCCESSFUL") { "Green" } else { "Red" }) 
        } 
    }
    
    if ((Test-Path $apkSource) -and ($LASTEXITCODE -eq 0)) {
        Copy-Item $apkSource $apkDest -Force
        Write-Host "OK: $($app.Name) APK built!" -ForegroundColor Green
        $script:successCount++
    } else {
        Write-Host "FAILED: $($app.Name) APK" -ForegroundColor Red
    }
}

foreach ($app in $apps) {
    Build-SmartSokoApk $app
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "BUILD COMPLETE: $successCount / 3 apps" -ForegroundColor $(if ($successCount -eq 3) { "Green" } else { "Yellow" })
Write-Host "APK location: $outputDir" -ForegroundColor Gray

Set-Location $PSScriptRoot
