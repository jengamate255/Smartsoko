# SmartSoko Deployment Guide

## Quick Deploy (One Command)

Run the deployment script:
```bash
cd "E:\Project\food delivery\food_delivery_app"
deploy-all.bat
```

---

## Manual Deployment (Platform by Platform)

### 1. Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```
**URL:** https://fooddelievry-dce15.web.app

---

### 2. Vercel
```bash
npm install -g vercel
vercel --prod
```
**Setup:** 
1. Go to https://vercel.com
2. Import your GitHub repo
3. Settings: Framework Preset = Other
4. Build Command: (leave empty)
5. Output Directory: web

---

### 3. Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=web
```
**URL:** Generated after deploy

---

## Current Configuration

| Platform | Config File | Status |
|----------|------------|--------|
| Firebase | firebase.json | ✅ Ready |
| Vercel | vercel.json | ✅ Ready |
| Netlify | netlify.toml | ✅ Ready |

---

## Environment Variables (if needed)

For Firebase functions:
```bash
firebase functions:config:set \
  api.key="your-api-key" \
  api.secret="your-api-secret"
```

---

## Troubleshooting

### Firebase errors
```bash
firebase logout
firebase login
```

### Vercel errors
```bash
vercel --prod --debug
```

### Netlify errors
```bash
netlify deploy --prod --dir=web --verbose
```

---

## Live URLs (after deployment)

- **Firebase:** https://fooddelievry-dce15.web.app
- **Vercel:** (check Vercel dashboard)
- **Netlify:** (check Netlify dashboard)