# 🚀 Deploy to Vercel - Step by Step Guide

## 📋 **Option 1: Vercel Web Interface (Easiest)**

### **Step 1: Go to Vercel**
1. Open your browser and go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Login"**
3. Login with **GitHub** (recommended since your repo is on GitHub)

### **Step 2: Import Project**
1. Click **"New Project"** or **"Add New..." → "Project"
2. Click **"Import Git Repository"**
3. Find your repository: **jengamate255/Smartsoko**
4. Click **"Import"**

### **Step 3: Configure Project**
```
Project Name: food-delivery-smartsoko
Framework Preset: Other
Root Directory: ./
Build Command: echo "Static build complete"
Output Directory: web
Install Command: echo "No dependencies needed"
```

### **Step 4: Environment Variables**
Add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://vonkqyiczeqhuqhahsxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8
```

### **Step 5: Deploy**
1. Click **"Deploy"**
2. Wait for deployment to complete (usually 1-2 minutes)
3. Your app will be live at: `https://food-delivery-smartsoko.vercel.app`

---

## 📋 **Option 2: Vercel CLI (If CLI works)**

### **Step 1: Install Vercel CLI**
```bash
# Using npm (if it works)
npm install -g vercel

# Or using yarn
yarn global add vercel

# Or using npx (no installation needed)
npx vercel --version
```

### **Step 2: Login to Vercel**
```bash
vercel login
```

### **Step 3: Deploy**
```bash
cd "d:/Project/food delivery/food_delivery_app"
vercel --prod
```

---

## 📋 **Option 3: Drag & Drop (Quick Test)**

### **Step 1: Prepare Files**
1. Create a zip file of the `web` folder
2. Include all HTML, CSS, JS files

### **Step 2: Upload**
1. Go to [vercel.com](https://vercel.com)
2. Click **"Deploy"** → **"Browse"**
3. Select your zip file
4. Upload and wait for deployment

---

## 🔧 **After Deployment**

### **Test Your Live App**
1. Open your Vercel URL
2. Test these pages:
   - `/` - Admin dashboard
   - `/customer.html` - Customer app
   - `/restaurant.html` - Restaurant dashboard
   - `/supabase.html` - Supabase admin
   - `/test-supabase.html` - Connection test

### **Update Android App**
Update your MainActivity.java to use the live URL:
```java
// Change this line in MainActivity.java
webView.loadUrl("https://food-delivery-smartsoko.vercel.app/customer.html");
```

### **Custom Domain (Optional)**
1. Go to Vercel project settings
2. Click **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed

---

## 🎯 **Expected Results**

### **✅ What You'll Get**
- **Live URL**: `https://food-delivery-smartsoko.vercel.app`
- **HTTPS**: Automatic SSL certificate
- **CDN**: Global edge network
- **Auto-deploy**: Updates when you push to GitHub
- **Analytics**: Built-in performance monitoring

### **📱 Mobile Features**
- **PWA Support**: Installable on mobile
- **Responsive Design**: Works on all devices
- **Fast Loading**: Optimized CDN delivery
- **Offline Support**: Service worker caching

### **🔧 Backend Integration**
- **Supabase Connection**: Live database access
- **Authentication**: User sign up/sign in
- **Real-time Updates**: Live order tracking
- **Data Persistence**: All features working

---

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Build fails**: Check that all files are in `web` folder
2. **404 errors**: Verify file paths in vercel.json
3. **CORS errors**: Update Supabase CORS settings
4. **Slow loading**: Check image sizes and caching

### **Fix CORS in Supabase**
1. Go to Supabase dashboard
2. Settings → API → CORS
3. Add your Vercel URL: `https://food-delivery-smartsoko.vercel.app`
4. Add `localhost:8080` for local testing

### **Check Deployment Logs**
1. Go to Vercel dashboard
2. Click on your project
3. View deployment logs for errors
4. Check build output and runtime logs

---

## 📈 **Next Steps**

### **1. Deploy Now**
Choose Option 1 (Web Interface) for the easiest deployment

### **2. Test Everything**
- Verify all pages load correctly
- Test Supabase connection
- Try authentication flow
- Check mobile responsiveness

### **3. Update Android App**
- Change MainActivity.java URL to live Vercel URL
- Rebuild and test APK

### **4. Share Your App**
- Share the Vercel URL with users
- Test on different devices
- Gather feedback and iterate

---

## 🎉 **Success!**

Once deployed, your Food Delivery app will be:
- **Live on the internet** 🌐
- **Accessible worldwide** 🌍
- **Mobile-optimized** 📱
- **Backend-connected** 🔗
- **Production-ready** 🚀

**Ready to deploy? Let's go live!** 🍔✨
