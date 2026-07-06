# 🚀 Vercel CLI Setup & Deployment Guide

## Step 1: Install Vercel CLI

### Option A: Using npm (Recommended)
```bash
npm install -g vercel
```

### Option B: Using yarn
```bash
yarn global add vercel
```

### Option C: Using npx (No installation)
```bash
npx vercel --version
```

## Step 2: Login to Vercel

Run the login command:
```bash
vercel login
```

This will:
1. Open your browser
2. Ask you to authenticate with Vercel
3. Provide a CLI token to paste in terminal
4. Confirm successful login

Verify login:
```bash
vercel whoami
```

## Step 3: Navigate to Project

```bash
cd "e:\Project\food delivery\food_delivery_app"
```

## Step 4: Link Project (First Time Only)

If this is your first deployment, link the project:
```bash
vercel link
```

This will:
1. Detect the project settings from `vercel.json`
2. Ask if you want to link to existing project or create new
3. Create `.vercel/project.json` with project ID

## Step 5: Deploy

### Deploy to Preview (for testing)
```bash
vercel
```

### Deploy to Production
```bash
vercel --prod
```

### Deploy with Auto-Confirm
```bash
vercel --prod --yes
```

## 🎯 Quick Deploy Commands

| Command | Description |
|---------|-------------|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel --yes` | Auto-confirm prompts |
| `vercel --debug` | Debug mode |
| `vercel --force` | Force deployment |

## 📁 Project Structure for Vercel

```
food_delivery_app/
├── web/                    # Static files (output directory)
│   ├── main.html          # Landing page
│   ├── customer.html      # Customer app
│   ├── merchant.html      # Merchant dashboard
│   ├── driver.html        # Driver app
│   └── ...
├── vercel.json            # Vercel configuration
├── .vercel/
│   └── project.json       # Project linking
└── vercel-deploy.bat      # Deployment script
```

## ⚙️ Vercel Configuration (`vercel.json`)

Key settings:
- **outputDirectory**: `web` - Where static files are served from
- **buildCommand**: `null` - No build needed (static site)
- **framework**: `null` - No framework (vanilla HTML/CSS/JS)
- **rewrites**: URL routing rules

## 🔧 Environment Variables

If you need to set environment variables:

### Via CLI:
```bash
vercel env add VARIABLE_NAME production
```

### Via Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add your variables

## 🌐 Custom Domain (Optional)

### Via CLI:
```bash
vercel domains add your-domain.com
```

### Via Dashboard:
1. Project Settings → Domains
2. Add your custom domain
3. Update DNS as instructed

## 🚨 Troubleshooting

### Error: "The specified token is not valid"
**Fix:** Run `vercel login` again to generate a new token

### Error: "Command requires confirmation"
**Fix:** Add `--yes` flag: `vercel --yes --prod`

### Error: "Not linked to a project"
**Fix:** Run `vercel link` to link the directory

### Error: "Build failed"
**Fix:** Check `vercel.json` configuration. Ensure `outputDirectory` is set to `web`

### Error: "404 on all pages"
**Fix:** Verify `rewrites` in `vercel.json` match your HTML files

## 📊 Monitoring Deployments

### View Deployment Logs:
```bash
vercel logs
```

### List Deployments:
```bash
vercel list
```

### Open Dashboard:
```bash
vercel open
```

## 🔄 Automatic Deployments

### GitHub Integration:
1. Push code to GitHub
2. Vercel automatically deploys
3. Preview deployments on PRs

### Manual Trigger:
```bash
vercel --prod
```

## 🎉 Success Indicators

After successful deployment, you'll see:
- ✅ Production URL (e.g., `https://smartsoko-marketplace.vercel.app`)
- ✅ Build completed
- ✅ Deployment ready

## 📱 Update Android App

Once deployed, update your Android `MainActivity.java`:

```java
// Change this line:
webView.loadUrl("https://smartsoko-marketplace.vercel.app/customer.html");
```

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentation**: https://vercel.com/docs
- **CLI Reference**: https://vercel.com/docs/cli
- **Project Settings**: https://vercel.com/dashboard/(your-project)/settings

---

## 🎯 One-Command Deploy

After setup, just run:

### Windows:
```bash
vercel-deploy.bat
```

### Cross-platform:
```bash
npx vercel --prod --yes
```

**Happy Deploying! 🚀**
