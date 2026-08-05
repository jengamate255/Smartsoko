Start-Process -NoNewWindow -FilePath "node.exe" -ArgumentList "server-production.js" -WorkingDirectory "E:\Project\notsmartsoko\Smartsoko\food_delivery_app" -RedirectStandardOutput "server.log" -RedirectStandardError "server-error.log"
Start-Sleep 3
Get-Content "server.log"