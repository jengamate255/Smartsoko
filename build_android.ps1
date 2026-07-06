Set-Location 'e:\Project\food delivery\food_delivery_app\android-customer'
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'
$env:ANDROID_SDK_ROOT='C:\Users\Dave\AppData\Local\Android\Sdk'
$env:ANDROID_HOME='C:\Users\Dave\AppData\Local\Android\Sdk'
$env:PATH='C:\Program Files\Java\jdk-21\bin;' + $env:PATH
Write-Host "Starting build with JDK 21..."
.\gradlew.bat --stop
.\gradlew.bat --no-daemon assembleDebug
