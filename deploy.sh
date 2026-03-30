#!/bin/bash

# Food Delivery App Deployment Script
echo "🍔 Food Delivery App Deployment Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -d "web" ]; then
    echo "❌ Error: web directory not found. Please run from project root."
    exit 1
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p dist
rm -rf dist/*

# Copy web files
echo "📋 Copying web files..."
cp -r web/* dist/

# Update Supabase URLs for production
echo "🔧 Updating Supabase URLs for production..."
find dist -name "*.html" -type f -exec sed -i 's|http://localhost:8080|https://vonkqyiczeqhuqhahsxm.supabase.co|g' {} \;

# Create .nojekyll file for GitHub Pages
touch dist/.nojekyll

# Create 404 page
cat > dist/404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Food Delivery - Page Not Found</title>
    <meta http-equiv="refresh" content="0; url=/index.html">
</head>
<body>
    <p>Redirecting to main page...</p>
</body>
</html>
EOF

echo "✅ Deployment ready in 'dist' directory!"
echo ""
echo "🚀 Choose your deployment method:"
echo ""
echo "1. Vercel: vercel --prod"
echo "2. Netlify: Drag 'dist' folder to Netlify dashboard"
echo "3. Firebase: firebase deploy --only hosting"
echo "4. GitHub Pages: Push to GitHub and enable Pages"
echo "5. Docker: docker-compose up --build"
echo ""
echo "📊 Files ready for deployment:"
ls -la dist/ | head -10
echo "..."
echo "Total files: $(find dist -type f | wc -l)"
