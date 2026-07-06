@echo off
echo ========================================
echo   SmartSoko Vercel Deploy Script
echo ========================================
echo.

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if already logged in
echo Checking Vercel login status...
npx vercel whoami >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo NOT LOGGED IN to Vercel!
    echo Please run: npx vercel login
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo Already logged in to Vercel.
echo.

REM Deploy to production
echo Deploying to Vercel...
echo.
npx vercel --prod

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
pause