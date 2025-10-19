#!/bin/bash

# POS System Deployment Script
echo "🚀 POS System Deployment Helper"
echo "================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Check if changes are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for deployment'"
    echo "   git push"
    exit 1
fi

echo "✅ Git repository is ready for deployment"
echo ""

echo "📋 Next Steps:"
echo "1. Backend Deployment (Render):"
echo "   - Go to https://dashboard.render.com/"
echo "   - Create new Web Service from your GitHub repo"
echo "   - Set build command: 'cd server && npm install'"
echo "   - Set start command: 'cd server && npm start'"
echo "   - Add environment variables (see DEPLOYMENT.md)"
echo ""

echo "2. Frontend Deployment (Vercel):"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Import your GitHub repository"
echo "   - Set root directory: 'client'"
echo "   - Set build command: 'npm run build'"
echo "   - Set output directory: 'dist'"
echo "   - Add VITE_API_BASE_URL environment variable"
echo ""

echo "3. Update CORS settings in Render with your Vercel URL"
echo ""

echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo "🎉 Happy deploying!"
