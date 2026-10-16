# Start SmartSoko production server via WMI (survives parent exit).
# NODE_ENV=production is REQUIRED: without it server-production.js skips
# Firebase Admin init (SKIP_FIREBASE path) and no ID token can verify.
# Output captured to server-wmi.log via cmd redirection.
$workdir = 'E:\\Project\\notsmartsoko\\Smartsoko\\food_delivery_app'
$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine      = 'cmd /c "set NODE_ENV=production&& node .\\server\\server-production.js > server-wmi.log 2>&1"'
  CurrentDirectory = $workdir
}
Write-Output "ReturnValue=$($r.ReturnValue) Pid=$($r.ProcessId)"