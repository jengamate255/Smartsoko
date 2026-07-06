#!/bin/bash
# SmartSoko 3-Platform Deployment Script
# Run this to deploy to all 3 platforms

echo "🚀 SmartSoko Deployment"
echo "======================="

cd E:/Project/food\ delivery/food_delivery_app

echo ""
echo "📦 Installing dependencies..."
npm install -g firebase-tools vercel netlify-cli

echo ""
echo "1️⃣ Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "2️⃣ Deploying to Vercel..."
vercel --prod --yes

echo ""
echo "3️⃣ Deploying to Netlify..."
netlify deploy --prod --dir=web --yes

echo ""
echo "✅ All deployments complete!"