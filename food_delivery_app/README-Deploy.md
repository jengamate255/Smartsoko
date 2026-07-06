# Food Delivery App - Deployment Guide

## 🚀 Deployment Options

This guide provides multiple deployment options for your Food Delivery app with Supabase backend.

## 📋 Prerequisites

- Supabase project set up and running
- Domain name (optional, for custom domains)
- Git repository (for some platforms)

---

## 🌐 **Option 1: Vercel (Recommended for Static Hosting)**

### **Setup Steps**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd "d:/Project/food delivery/food_delivery_app"
   vercel --prod
   ```

4. **Custom Domain** (optional)
   ```bash
   vercel domains add yourdomain.com
   ```

### **Features**
- ✅ **Free tier** with SSL
- ✅ **Automatic deployments** from Git
- ✅ **Global CDN**
- ✅ **Custom domains**
- ✅ **Analytics**

### **Environment Variables**
Set these in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://vonkqyiczeqhuqhahsxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🔥 **Option 2: Netlify**

### **Setup Steps**

1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub/GitLab/Bitbucket

2. **Drag & Drop Deploy**
   - Compress the `web` folder
   - Drag to Netlify dashboard
   - Or connect Git repository

3. **Configure Site Settings**
   - Go to Site settings > Build & deploy
   - Set build command: `echo "Static build"`
   - Set publish directory: `web`

### **Features**
- ✅ **Free tier** with SSL
- ✅ **Continuous deployment**
- ✅ **Form handling**
- ✅ **Edge functions**
- ✅ **Split testing**

### **Custom Headers**
Already configured in `netlify.toml`

---

## 🔥 **Option 3: Firebase Hosting**

### **Setup Steps**

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase**
   ```bash
   cd "d:/Project/food delivery/food_delivery_app"
   firebase init hosting
   ```

4. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

### **Features**
- ✅ **Free tier** with SSL
- ✅ **Global CDN**
- ✅ **Custom domains**
- ✅ **A/B testing**
- ✅ **Preview channels**

---

## 📦 **Option 4: Docker Deployment**

### **Local Development**
```bash
cd "d:/Project/food delivery/food_delivery_app/deploy"
docker-compose up --build
```

### **Production Deployment**
```bash
# Production with load balancer
docker-compose --profile production up -d --build
```

### **Features**
- ✅ **Self-hosted**
- ✅ **Load balancing**
- ✅ **Redis caching**
- ✅ **SSL termination**
- ✅ **Health checks**

---

## 🐙 **Option 5: GitHub Pages**

### **Setup Steps**

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/food-delivery.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository settings
   - Scroll to "Pages"
   - Select source: "Deploy from a branch"
   - Choose branch: "main"
   - Choose folder: "/ (root)"

3. **Setup GitHub Actions**
   - Copy `deploy/github-pages.yml` to `.github/workflows/`
   - Push to trigger deployment

### **Features**
- ✅ **Free hosting**
- ✅ **Automatic deployment**
- ✅ **Custom domains**
- ✅ **HTTPS**

---

## ☁️ **Option 6: Cloud Platforms**

### **AWS S3 + CloudFront**

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://food-delivery-app
   ```

2. **Enable Static Website Hosting**
   ```bash
   aws s3 website s3://food-delivery-app --index-document index.html
   ```

3. **Upload Files**
   ```bash
   aws s3 sync web/ s3://food-delivery-app --acl public-read
   ```

4. **Create CloudFront Distribution**
   - Use AWS Console
   - Set origin to S3 bucket
   - Configure behaviors

### **Google Cloud Platform**

1. **Create Cloud Storage Bucket**
2. **Enable static website hosting**
3. **Upload files**
4. **Set up Load Balancer** (optional)

### **Azure Static Web Apps**

1. **Create Azure Static Web App**
2. **Connect to GitHub repository**
3. **Configure build settings**
4. **Deploy automatically**

---

## 🔧 **Configuration Files**

### **Environment Variables**
Update these files with your Supabase credentials:

```javascript
// In all HTML files
const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key';
```

### **Domain Configuration**
For custom domains, update:
- DNS records
- SSL certificates
- CDN settings

---

## 📊 **Performance Optimization**

### **Before Deployment**
1. **Minify HTML/CSS/JS**
2. **Optimize images**
3. **Enable compression**
4. **Set proper cache headers**

### **After Deployment**
1. **Test all functionality**
2. **Check mobile responsiveness**
3. **Validate SSL certificates**
4. **Monitor performance**

---

## 🔐 **Security Considerations**

### **CORS Configuration**
Add your domain to Supabase CORS settings:
```javascript
// In Supabase dashboard > Settings > API
Allowed Origins: https://yourdomain.com
```

### **Security Headers**
Already configured in deployment configs:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

### **Environment Variables**
Never expose sensitive data:
- Supabase service role key
- Database passwords
- API secrets

---

## 📱 **PWA Configuration**

### **Service Worker**
Already configured in `/pwa/sw.js`

### **Manifest**
Configured in `/pwa/manifest.json`

### **Install Prompts**
Test on mobile devices for install prompts

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Supabase project is active
- [ ] All credentials are updated
- [ ] Test data is removed (if needed)
- [ ] SSL certificates are ready
- [ ] DNS records are configured

### **Post-Deployment**
- [ ] Test all pages load correctly
- [ ] Verify Supabase connection
- [ ] Test authentication flow
- [ ] Check mobile responsiveness
- [ ] Test PWA installation
- [ ] Monitor error logs

---

## 📈 **Monitoring & Analytics**

### **Free Options**
- Vercel Analytics
- Netlify Analytics
- Google Analytics
- Supabase Analytics

### **Paid Options**
- Datadog
- New Relic
- Sentry (error tracking)

---

## 🔄 **CI/CD Pipeline**

### **GitHub Actions**
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🆘 **Troubleshooting**

### **Common Issues**
1. **CORS errors** - Update Supabase CORS settings
2. **404 errors** - Check routing configuration
3. **SSL issues** - Verify certificate configuration
4. **Slow loading** - Optimize images and enable compression

### **Debug Tools**
- Browser DevTools
- Vercel/Netlify logs
- Supabase logs
- Network tab for API calls

---

## 📞 **Support**

### **Documentation**
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Firebase Docs](https://firebase.google.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### **Community**
- Discord servers
- Stack Overflow
- GitHub discussions

---

## 🎯 **Recommended Option**

**For most users: Vercel**
- Easiest setup
- Best performance
- Free tier available
- Automatic deployments
- Global CDN

**For enterprise: Docker + Cloud**
- Full control
- Scalability
- Custom configurations
- Advanced security

Choose the option that best fits your needs and technical requirements!
