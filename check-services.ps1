Get-Service | Where-Object {$_.Name -like "*Store*"} | Select-Object Name, Status, StartType
