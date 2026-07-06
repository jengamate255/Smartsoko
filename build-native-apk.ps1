# SmartSoko NATIVE APK Build Script
# Builds a TRUE React Native APK (not WebView wrapper)

param(
    [switch]$SkipInstall = $false,
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Colors
function Write-Color($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

Write-Color "==========================================" "Green"
Write-Color "  SmartSoko NATIVE APK Builder" "Green"
Write-Color "  True React Native (NOT WebView!)" "Yellow"
Write-Color "==========================================" "Green"
Write-Host ""

$ProjectDir = "e:\Project\food delivery\food_delivery_app\mobile"
$OutputDir = "e:\Project\food delivery\APK-Builds"

# Verify project exists
if (!(Test-Path "$ProjectDir\package.json")) {
    Write-Color "ERROR: Mobile project not found!" "Red"
    exit 1
}

# Create output dir
New-Item -ItemType Directory -Path $OutputDir -Force -ErrorAction SilentlyContinue | Out-Null

# Change to project directory
Set-Location $ProjectDir
Write-Color "Working directory: $(Get-Location)" "Gray"
Write-Host ""

# Step 1: Check Node.js
Write-Color "[Step 1] Checking Node.js..." "Cyan"
try {
    $nodeVer = node --version
    Write-Color "  ✓ Node.js $nodeVer" "Green"
} catch {
    Write-Color "  ✗ Node.js not found! Install from nodejs.org" "Red"
    exit 1
}
Write-Host ""

# Step 2: Install dependencies
if (!$SkipInstall) {
    Write-Color "[Step 2] Installing dependencies (this may take 5-10 minutes)..." "Cyan"
    
    # Check if already installed
    if ((Test-Path "node_modules") -and !$Clean) {
        Write-Color "  Dependencies already installed. Use -Clean to reinstall." "Yellow"
    } else {
        Write-Color "  Running npm install..." "Gray"
        
        # Remove old node_modules if clean requested
        if ($Clean -and (Test-Path "node_modules")) {
            Write-Color "  Cleaning old dependencies..." "Yellow"
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        }
        
        # Install with progress
        npm install --legacy-peer-deps 2>&1 | ForEach-Object {
            if ($_ -match "added|packages|npm warn|npm ERR") {
                Write-Color "    $_" "Gray"
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Color "  ✗ npm install failed!" "Red"
            exit 1
        }
        Write-Color "  ✓ Dependencies installed" "Green"
    }
} else {
    Write-Color "[Step 2] Skipping install (-SkipInstall flag)" "Cyan"
}
Write-Host ""

# Step 3: Prebuild Android
Write-Color "[Step 3] Setting up Android project..." "Cyan"
if (!(Test-Path "android\build.gradle")) {
    Write-Color "  Generating native Android project..." "Yellow"
    npx expo prebuild --platform android 2>&1 | ForEach-Object {
        if ($_ -match "done|success|error|Error|fail|Fail") {
            Write-Color "    $_" "Gray"
        }
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Color "  ✗ Prebuild failed!" "Red"
        exit 1
    }
    Write-Color "  ✓ Android project created" "Green"
} else {
    Write-Color "  ✓ Android project already exists" "Green"
}
Write-Host ""

# Step 4: Build APK
Write-Color "[Step 4] Building APK (this will take 10-20 minutes)..." "Cyan"
Write-Color "  Compiling React Native code..." "Yellow"
Write-Color "  Please be patient - this is a full native build!" "Yellow"
Write-Host ""

cd android

# Clean if requested
if ($Clean) {
    Write-Color "  Cleaning previous build..." "Gray"
    .\gradlew.bat clean 2>&1 | ForEach-Object { "    $_" }
}

# Build release APK
Write-Color "  Starting Gradle build..." "Cyan"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

.\gradlew.bat assembleRelease --console=plain --warning-mode=none 2>&1 | ForEach-Object {
    $line = $_
    if ($line -match "BUILD|FAILURE|SUCCESS|error:|Error|task|Task") {
        Write-Color "    $line" "Gray"
    }
}

$buildExit = $LASTEXITCODE
cd ..

if ($buildExit -ne 0) {
    Write-Color "  ✗ Build failed!" "Red"
    Write-Color "  Common fixes:" "Yellow"
    Write-Color "    1. Make sure Android Studio is installed" "Gray"
    Write-Color "    2. Check that ANDROID_SDK_ROOT is set" "Gray"
    Write-Color "    3. Run with -Clean flag to rebuild" "Gray"
    exit 1
}

Write-Color "  ✓ Build successful!" "Green"
Write-Host ""

# Step 5: Copy APK
Write-Color "[Step 5] Copying APK to output folder..." "Cyan"

$sourcePaths = @(
    "android\app\build\outputs\apk\release\app-release.apk",
    "android\app\build\outputs\apk\release\app-release-unsigned.apk"
)

$sourceApk = $null
foreach ($path in $sourcePaths) {
    if (Test-Path $path) {
        $sourceApk = $path
        break
    }
}

if (!$sourceApk) {
    # Find any APK
    $found = Get-ChildItem -Path "android\app\build\outputs\apk" -Recurse -Filter "*.apk" | Select-Object -First 1
    if ($found) {
        $sourceApk = $found.FullName
    }
}

if (!$sourceApk) {
    Write-Color "  ✗ APK not found!" "Red"
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$apkName = "SmartSoko-Native-v1.0.0-$timestamp.apk"
$destPath = "$OutputDir\$apkName"

copy $sourceApk $destPath
copy $sourceApk "$OutputDir\SmartSoko-Native-latest.apk"

Write-Color "  ✓ APK copied successfully" "Green"
Write-Host ""

# Final output
$apkSize = (Get-Item $destPath).Length / 1MB
$sizeStr = [math]::Round($apkSize, 2)

Write-Color "==========================================" "Green"
Write-Color "  BUILD COMPLETE!" "Green"
Write-Color "==========================================" "Green"
Write-Host ""
Write-Color "Output APK: $destPath" "White"
Write-Color "Size: $sizeStr MB" "White"
Write-Color "Backup: $OutputDir\SmartSoko-Native-latest.apk" "Gray"
Write-Host ""
Write-Color "To install on Android device:" "Yellow"
Write-Color "  adb install '$destPath'" "Cyan"
Write-Host ""
Write-Color "Or copy the APK to your phone and tap to install" "Gray"
Write-Host ""

exit 0
