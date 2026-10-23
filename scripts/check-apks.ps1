# Get APK info
Get-ChildItem (Join-Path (Split-Path -Parent $PSScriptRoot) "APK-Builds\*.apk") | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 1)
    Write-Host "$($_.Name) - $size MB - $($_.LastWriteTime)"
}

Write-Host ""
Write-Host "Admin Panel: http://127.0.0.1:3000/admin-panel.html"
Write-Host "Build scripts available in scripts\"