@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-21
cd /d "E:\Project\notsmartsoko\Smartsoko\food_delivery_app\android-merchant-fullnative"
call gradlew.bat assembleDebug --no-daemon > build_result.txt 2>&1
echo BUILD_COMPLETE >> build_result.txt
