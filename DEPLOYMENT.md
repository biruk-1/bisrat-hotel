# 🚀 Deployment Guide

This guide will help you deploy your POS System with the backend on Render and frontend on Vercel.

## 📋 Prerequisites

1. GitHub account
2. Render account (free tier available)
3. Vercel account (free tier available)
4. Your code pushed to a GitHub repository

## 🔧 Backend Deployment (Render)

### Step 1: Prepare Your Repository
1. Push your code to GitHub if you haven't already
2. Make sure all the deployment files are committed:
   - `render.yaml`
   - `server/env.example`

### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `pos-system-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

### Step 3: Set Environment Variables
In Render dashboard, go to Environment tab and add:
```
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Note your backend URL: `https://your-app-name.onrender.com`

## 🎨 Frontend Deployment (Vercel)

### Step 1: Update API Configuration
1. Create a `.env.production` file in the `client` folder:
```env
VITE_API_BASE_URL=https://your-backend-app.onrender.com
```

### Step 2: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables
In Vercel dashboard, go to Settings → Environment Variables:
```
VITE_API_BASE_URL=https://your-backend-app.onrender.com
```

### Step 4: Deploy
- Click "Deploy"
- Wait for deployment to complete
- Note your frontend URL: `https://your-app.vercel.app`

## 🔄 Update CORS Settings

After both deployments:
1. Go back to Render dashboard
2. Update the `CORS_ORIGIN` environment variable with your actual Vercel URL
3. Redeploy the backend service

## 🧪 Testing Your Deployment

1. Visit your frontend URL
2. Try logging in with default credentials:
   - Admin: `admin` / `admin123`
   - Cashier: Phone `1234567890` / `cashier123`
   - Waiter: PIN `123456`

## 🔧 Alternative: Netlify Frontend Deployment

If you prefer Netlify over Vercel:

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Configure:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
5. Set environment variables in Site settings → Environment variables

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure CORS_ORIGIN matches your frontend URL exactly
2. **Build Failures**: Check that all dependencies are in package.json
3. **Database Issues**: SQLite will be created automatically on first run
4. **API Connection**: Verify VITE_API_BASE_URL is set correctly

### Logs:
- **Render**: Check logs in the Render dashboard
- **Vercel**: Check function logs in Vercel dashboard
- **Netlify**: Check deploy logs in Netlify dashboard

## 📱 Default Login Credentials

| Role | Username | Password | Phone | PIN |
|------|----------|----------|-------|-----|
| Admin | admin | admin123 | - | - |
| Cashier | cashier1 | cashier123 | 1234567890 | - |
| Waiter | waiter1 | - | - | 123456 |
| Kitchen | kitchen1 | kitchen123 | - | - |
| Bartender | bartender1 | bartender123 | - | - |

## 🔒 Security Notes

1. Change the JWT_SECRET to a secure random string
2. Consider using PostgreSQL instead of SQLite for production
3. Set up proper monitoring and logging
4. Enable HTTPS (automatically handled by Render/Vercel)

## 💰 Cost Estimation

- **Render**: Free tier includes 750 hours/month
- **Vercel**: Free tier includes 100GB bandwidth
- **Total**: $0/month for small usage

Happy deploying! 🎉
