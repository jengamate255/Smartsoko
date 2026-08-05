$sourceZip = "E:\\Project\\notsmartsoko\\Smartsoko\\gradle-8.9-all.zip"
$destDir = "E:\\Project\\notsmartsoko\\Smartsoko\\gradle-8.9"

if (-not (Test-Path $sourceZip)) {
    Write-Host "ERROR: gradle-8.9-all.zip not found in Smartsoko directory"
    Write-Host "Available gradle files:"
    Get-ChildItem "E:\Project\notsmartsoko\Smartsoko" | Where-Object { $_.Name -like "*gradle*" } | Select-Object Name
    exit 1
}

if (Test-Path $destDir) {
    Write-Host "WARNING: gradle-8.9 directory already exists, skipping extraction"
} else {
    Write-Host "Extracting gradle-8.9..."
    Expand-Archive -Path $sourceZip -DestinationPath "E:\Project\notsmartsoko\Smartsoko"
    Write-Host "Gradle extracted successfully"
}

if (Test-Path "$destDir\bin\gradle.bat") {
    Write-Host "Gradle binary found, setting up path..."
    $env:PATH += ";E:\Project\notsmartsoko\Smartsoko\gradle-8.9\bin"
    
    Write-Host "Building native driver app..."
    cd "E:\Project\notsmartsoko\Smartsoko\native-driver-app"
    & gradle wrapper clean assembleDebug
    
    if (Test-Path "app\build\outputs\apk\debug\app-debug.apk") {
        Write-Host "Build successful! APK located at:"
        Write-Host "native-driver-app\\app\\build\\outputs\\apk\\debug\\app-debug.apk"
    } else {
        Write-Host "Build may have failed - APK not found in expected location"
    }
} else {
    Write-Host "ERROR: gradle.bat not found after extraction"
    exit 1
}
