@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║          🚀 SmartSoko Vercel Deployment Script               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Vercel CLI not found. Installing...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Vercel CLI
        echo.
        echo Please install manually:
        echo   npm install -g vercel
        pause
        exit /b 1
    )
)

echo ✅ Vercel CLI is installed
vercel --version
echo.

:: Check if already logged in
vercel whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔐 You need to login to Vercel first.
    echo Please run: vercel login
    echo.
    echo This will open a browser to authenticate.
    pause
    call vercel login
)

echo ✅ Logged in as:
vercel whoami
echo.

:: Navigate to project directory
cd /d "%~dp0"
echo 📁 Project directory: %CD%
echo.

:: Check if project is linked
if not exist ".vercel\project.json" (
    echo 🔗 Project not linked to Vercel.
    echo Running: vercel link
    echo.
    call vercel link
)

echo ✅ Project is linked to Vercel
echo.

:: Deploy to production
echo 🚀 Deploying to Vercel Production...
echo.
call vercel --prod --yes
echo.

if %errorlevel% equ 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════════╗
    echo ║               ✅ Deployment Successful!                       ║
    echo ╚═══════════════════════════════════════════════════════════════╝
    echo.
    echo Your SmartSoko Marketplace is now live on Vercel!
    echo.
    echo Next steps:
    echo   1. Visit your Vercel dashboard to see the live URL
    echo   2. Configure custom domain if needed
    echo   3. Update your Android app with the new URL
    echo.
) else (
    echo.
    echo ╔═══════════════════════════════════════════════════════════════╗
    echo ║               ❌ Deployment Failed                             ║
    echo ╚═══════════════════════════════════════════════════════════════╝
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo   - Not logged in: Run 'vercel login'
    echo   - No project linked: Run 'vercel link'
    echo   - Build errors: Check vercel.json configuration
    echo.
)

pause
