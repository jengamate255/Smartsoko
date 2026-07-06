# Get APK info
Get-ChildItem "E:\Project\food delivery\food_delivery_app\APK-Builds\*.apk" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 1)
    Write-Host "$($_.Name) - $size MB - $($_.LastWriteTime)"
}

Write-Host ""
Write-Host "Admin Panel: http://127.0.0.1:3000/admin-panel.html"
Write-Host "Build scripts available in root folder"