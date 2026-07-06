# SmartSoko - Local Marketplace Platform

A production-ready web-based food delivery and local marketplace application with multi-role support.

## Features

- **Multi-Role Support**: Customer, Merchant, Driver, and Admin dashboards
- **Real-time Order Tracking**: Track deliveries in real-time
- **M-Pesa Payment Integration**: Mobile money payments (Tanzania)
- **Google Maps Integration**: Location-based services
- **Firebase Backend**: Firestore database and authentication
- **PWA Ready**: Progressive Web App with offline support
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Maps**: Google Maps API / Mapbox
- **Payments**: M-Pesa API
- **Icons**: Material Symbols

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Firebase project
- M-Pesa API credentials (for payments)
- Google Maps API key (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd food_delivery_app
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# M-Pesa Configuration (Optional)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback

# Google Maps (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. Build CSS

```bash
npm run build:css
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000/login

## Production Deployment

### Option 1: Traditional Server (VPS/Cloud)

1. Build for production:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Or use PM2 for process management:
   ```bash
   pm2 start server-production.js --name smartsoko
   pm2 save
   pm2 startup
   ```

### Option 2: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```

3. Deploy:
   ```bash
   npm run deploy:firebase
   ```

### Option 3: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   npm run deploy:vercel
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server |
| `npm run build` | Build CSS and optimize |
| `npm run build:css` | Build and minify Tailwind CSS |
| `npm run watch:css` | Watch and rebuild CSS on changes |
| `npm run deploy:firebase` | Deploy to Firebase Hosting |
| `npm run deploy:vercel` | Deploy to Vercel |

## Application URLs

Once running, access these pages:

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Authentication page |
| Home | `/home` | Main dashboard (customers) |
| Customer | `/customer` | Browse sellers and order |
| Merchant | `/merchant` | Seller dashboard |
| Driver | `/driver` | Delivery driver dashboard |
| Admin | `/admin` | Admin panel |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | API status |
| `/api/config` | GET | Public configuration |
| `/api/sellers` | GET | List all sellers |
| `/api/sellers/:id` | GET | Get seller by ID |
| `/api/categories` | GET | List categories |

## Project Structure

```
food_delivery_app/
├── web/                    # Frontend files
│   ├── config/            # Configuration files
│   ├── dist/              # Compiled CSS
│   ├── pwa/               # PWA manifest and icons
│   ├── *.html             # Page templates
│   └── tailwind.css       # Source CSS
├── server-production.js   # Production server
├── server-improved.js     # Development server
├── package.json           # Dependencies and scripts
├── .env.example           # Environment template
├── .env                   # Environment variables (not in git)
├── firebase.json          # Firebase configuration
└── README.md              # This file
```

## Security Features

- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **Rate Limiting**: API protection against abuse
- **Compression**: Gzip compression for faster loads
- **Environment Variables**: Sensitive config not in code
- **Input Validation**: Sanitized user inputs
- **CORS**: Configured for security

## Production Checklist

- [ ] Set up `.env` with production credentials
- [ ] Build CSS: `npm run build:css`
- [ ] Test all pages work correctly
- [ ] Configure Firebase security rules
- [ ] Set up SSL/HTTPS
- [ ] Configure domain and DNS
- [ ] Set up monitoring (health checks)
- [ ] Configure backups
- [ ] Test payment integration
- [ ] Set up error tracking
- [ ] Performance audit
- [ ] Security audit

## Monitoring & Health Checks

The production server includes a health check endpoint:

```bash
curl http://your-domain.com/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0"
}
```

## Troubleshooting

### Port Already in Use
If you get "Port already in use" error:
```bash
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### CSS Not Loading
Rebuild the CSS:
```bash
npm run build:css
```

### Firebase Connection Issues
1. Check your `.env` configuration
2. Verify Firebase project settings
3. Check browser console for errors

## Support

For issues or questions, contact the development team.

## License

Proprietary - All rights reserved.
