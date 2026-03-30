@echo off
REM Food Delivery App Deployment Script for Windows
echo 🍔 Food Delivery App Deployment Script
echo =====================================

REM Check if we're in the right directory
if not exist "web" (
    echo ❌ Error: web directory not found. Please run from project root.
    pause
    exit /b 1
)

REM Create deployment directory
echo 📁 Creating deployment directory...
if exist dist rmdir /s /q dist
mkdir dist

REM Copy web files
echo 📋 Copying web files...
xcopy /E /I /Y web\* dist\

REM Update Supabase URLs for production
echo 🔧 Updating Supabase URLs for production...
powershell -Command "Get-ChildItem -Path dist -Filter '*.html' -Recurse | ForEach-Object { (Get-Content $_.FullName) -replace 'http://localhost:8080', 'https://vonkqyiczeqhuqhahsxm.supabase.co' | Set-Content $_.FullName }"

REM Create .nojekyll file for GitHub Pages
echo. > dist\.nojekyll

REM Create 404 page
echo 📄 Creating 404 page...
echo ^<!DOCTYPE html^> > dist\404.html
echo ^<html^> >> dist\404.html
echo ^<head^> >> dist\404.html
echo     ^<meta charset="utf-8"^> >> dist\404.html
echo     ^<title^>Food Delivery - Page Not Found^</title^> >> dist\404.html
echo     ^<meta http-equiv="refresh" content="0; url=/index.html"^> >> dist\404.html
echo ^</head^> >> dist\404.html
echo ^<body^> >> dist\404.html
echo     ^<p^>Redirecting to main page...^</p^> >> dist\404.html
echo ^</body^> >> dist\404.html
echo ^</html^> >> dist\404.html

echo ✅ Deployment ready in 'dist' directory!
echo.
echo 🚀 Choose your deployment method:
echo.
echo 1. Vercel: vercel --prod
echo 2. Netlify: Drag 'dist' folder to Netlify dashboard
echo 3. Firebase: firebase deploy --only hosting
echo 4. GitHub Pages: Push to GitHub and enable Pages
echo 5. Docker: docker-compose up --build
echo.
echo 📊 Files ready for deployment:
dir dist /b | find /c /v ""

pause
