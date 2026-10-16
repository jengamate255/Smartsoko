require('dotenv').config({ path: __dirname + '/../../.env' });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Feature flags
  features: {
    sentry: !!process.env.SENTRY_DSN,
    firebase: !process.env.SKIP_FIREBASE,
    pesapal: !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
    ntzs: !!process.env.NTZS_API_KEY,
    mapbox: !!process.env.MAPBOX_TOKEN,
    supabase: !!process.env.SUPABASE_URL,
    smartmove: !!process.env.SMARTMOVE_ENABLED,
  },

  // External service URLs
  services: {
    pesapal: {
      baseUrl: process.env.PESAPAL_BASE_URL || 'https://api.pesapal.com',
      consumerKey: process.env.PESAPAL_CONSUMER_KEY,
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
      ipnUrl: process.env.PESAPAL_IPN_URL,
      callbackUrl: process.env.PESAPAL_CALLBACK_URL,
    },
    ntzs: {
      apiKey: process.env.NTZS_API_KEY,
      webhookSecret: process.env.NTZS_WEBHOOK_SECRET,
      baseUrl: 'https://www.ntzs.co.tz/api/v1',
      cardRedirectUrl: process.env.NTZS_CARD_REDIRECT_URL,
      cardCancelUrl: process.env.NTZS_CARD_CANCEL_URL,
    },
    mapbox: {
      accessToken: process.env.MAPBOX_TOKEN,
      geocodingUrl: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
      anonKey: process.env.SUPABASE_ANON_KEY,
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
  },

  // Rate limiting tiers
  rateLimit: {
    auth: { windowMs: 60 * 1000, max: 5 },
    api: { windowMs: 15 * 60 * 1000, max: 200 },
    public: { windowMs: 15 * 60 * 1000, max: 1000 },
  },

  // Cache TTL
  cache: {
    api: 60 * 1000,
    config: 300 * 1000,
  },

  // Security
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    forceHttps: process.env.FORCE_HTTPS !== 'false',
    hstsMaxAge: 31536000,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 5,
    maxSize: 5242880,
  },

  // Idempotency
  idempotency: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    header: 'Idempotency-Key',
  },

  // WebSocket
  websocket: {
    path: '/ws',
    heartbeatInterval: 30000,
  },
};