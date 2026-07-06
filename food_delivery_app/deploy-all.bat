@echo off
REM SmartSoko 3-Platform Deployment Script
REM Run this file to deploy to all 3 platforms

echo 🚀 SmartSoko Deployment
echo =======================

cd /d "%~dp0"

echo.
echo 📦 Installing CLIs...
npm install -g firebase-tools vercel netlify-cli

echo.
echo 1️⃣ Deploying to Firebase...
firebase deploy --only hosting

echo.
echo 2️⃣ Deploying to Vercel...
vercel --prod --yes

echo.
echo 3️⃣ Deploying to Netlify...
netlify deploy --prod --dir=web --yes

echo.
echo ✅ All deployments complete!
echo.
echo 📋 Check your deployment URLs:
echo    - Firebase: https://fooddelievry-dce15.web.app
echo    - Vercel: Check Vercel dashboard
echo    - Netlify: Check Netlify dashboard

pause