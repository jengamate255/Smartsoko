# 🌐 Food Delivery App - Live Links

## 🚀 **Local Server (Running Now)**

### **📡 Local Development Server**
- **Server Status**: ✅ RUNNING on port 8080
- **Base URL**: http://localhost:8080

### **📱 Local App Links**
```
🏠 Admin Dashboard:     http://localhost:8080/index.html
🍔 Customer App:        http://localhost:8080/customer.html
🏪 Restaurant Panel:    http://localhost:8080/restaurant.html
🔧 Supabase Admin:      http://localhost:8080/supabase.html
🧪 Connection Test:     http://localhost:8080/test-supabase.html
🤖 Android Bridge Test: http://localhost:8080/test-android-bridge.html
```

---

## 🌍 **Deployment Links (Primary)**

### **🔥 Firebase Hosting (Recommended & Active)**
```
🌐 Main URL: https://fooddelievry-dce15.web.app
🍔 Customer: https://fooddelievry-dce15.web.app/customer.html
🏠 Admin: https://fooddelievry-dce15.web.app/index.html
🏪 Restaurant: https://fooddelievry-dce15.web.app/restaurant.html
🔧 Supabase: https://fooddelievry-dce15.web.app/supabase.html
🧪 Test: https://fooddelievry-dce15.web.app/test-supabase.html
🚚 Driver: https://fooddelievry-dce15.web.app/driver.html
```

**Quick Deploy:**
`firebase deploy --only hosting`

---

## 🌍 **Legacy Deployment Links**

### **🚀 Vercel (May require redeployment)**
```
🌐 Deploy URL: https://food-delivery-smartsoko.vercel.app
🍔 Customer: https://food-delivery-smartsoko.vercel.app/customer.html
🏠 Admin: https://food-delivery-smartsoko.vercel.app/index.html
🏪 Restaurant: https://food-delivery-smartsoko.vercel.app/restaurant.html
🔧 Supabase: https://food-delivery-smartsoko.vercel.app/supabase.html
🧪 Test: https://food-delivery-smartsoko.vercel.app/test-supabase.html
```

**Note**: If you see "DEPLOYMENT_NOT_FOUND", please run `vercel --prod` to redeploy.

---

### **📱 GitHub Pages (Free)**
```
🌐 Your URL: https://your-site-name.netlify.app
🍔 Customer: https://your-site-name.netlify.app/customer
🏠 Admin: https://your-site-name.netlify.app/
🏪 Restaurant: https://your-site-name.netlify.app/restaurant
🔧 Supabase: https://your-site-name.netlify.app/supabase
🧪 Test: https://your-site-name.netlify.app/test-supabase
```

**To Enable GitHub Pages:**
1. Go to https://github.com/jengamate255/Smartsoko
2. Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: "master"
5. Click Save

---

### **🔥 Netlify**
```
🌐 Your URL: https://your-site-name.netlify.app
🍔 Customer: https://your-site-name.netlify.app/customer
🏠 Admin: https://your-site-name.netlify.app/
🏪 Restaurant: https://your-site-name.netlify.app/restaurant
🔧 Supabase: https://your-site-name.netlify.app/supabase
🧪 Test: https://your-site-name.netlify.app/test-supabase
```

---

## 📱 **Mobile App Integration**

### **🤖 Android App URLs**
Update `MainActivity.java` with your chosen deployment URL:

```java
// For local testing
webView.loadUrl("http://10.0.2.2:8080/customer.html");

// For Firebase deployment (Recommended)
webView.loadUrl("https://fooddelievry-dce15.web.app/customer.html");

// For Vercel deployment
webView.loadUrl("https://food-delivery-smartsoko.vercel.app/customer.html");

// For GitHub Pages
webView.loadUrl("https://jengamate255.github.io/Smartsoko/customer.html");

// For Netlify
webView.loadUrl("https://your-site-name.netlify.app/customer.html");
```

---

## 🎯 **What to Test First**

### **🧪 Start Here: Connection Test**
1. **Local**: http://localhost:8080/test-supabase.html
2. **Deployed**: Your chosen platform + `/test-supabase.html`

**Expected Result**: ✅ "Connection successful! Found 5 restaurants"

### **🍔 Then Test: Customer App**
1. **Local**: http://localhost:8080/customer.html
2. **Deployed**: Your chosen platform + `/customer.html`

**Features to Test**:
- Browse 5 restaurants
- View 20 menu items
- Test promotions (WELCOME10, FREESHIP, etc.)
- Try sign up/sign in
- Place test order

### **🏠 Then Test: Admin Dashboard**
1. **Local**: http://localhost:8080/index.html
2. **Deployed**: Your chosen platform + `/index.html`

**Features to Test**:
- View all restaurants
- Manage orders
- View analytics
- Driver management

---

## 🔧 **Backend Connection**

### **🗄️ Supabase Details**
```
🌐 Supabase URL: https://vonkqyiczeqhuqhahsxm.supabase.co
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8
📊 Database: 5 restaurants, 20 menu items, 4 promotions
🔒 Security: RLS policies enabled
```

---

## 📊 **Feature Checklist**

### **✅ What's Working**
- [ ] **5 Restaurants** with full menus
- [ ] **20 Menu Items** across all restaurants
- [ ] **4 Active Promotions** (WELCOME10, FREESHIP, WEEKEND20, LOYALTY15)
- [ ] **User Authentication** (sign up/sign in)
- [ ] **Order Management** (create, track, history)
- [ ] **Real-time Updates** (order status changes)
- [ ] **Mobile PWA** (installable on phones)
- [ ] **Admin Dashboard** (complete management)
- [ ] **Restaurant Panel** (menu/order management)
- [ ] **Driver System** (tracking and dispatch)
- [ ] **Analytics** (sales, trends, reports)

---

## 🚀 **Recommended Deployment Order**

### **1. Test Locally First**
- Use http://localhost:8080 links
- Verify all features work
- Test Supabase connection

### **2. Deploy to Vercel (Easiest)**
- Quick drag-and-drop deployment
- Global CDN
- Custom domain support

### **3. Update Android App**
- Change MainActivity.java URL
- Rebuild APK
- Test with live backend

### **4. Share with Users**
- Share your live URL
- Gather feedback
- Monitor performance

---

## 🎉 **You're All Set!**

### **🌐 Server Running**: http://localhost:8080 ✅
### **📱 Multiple Deployment Options** ✅
### **🔗 All Links Ready** ✅
### **🗄️ Backend Connected** ✅

**Start testing locally, then deploy to your preferred platform!** 🍔🚀
