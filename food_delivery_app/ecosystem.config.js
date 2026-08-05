module.exports = {
  apps: [{
    name: 'smartsoko-api',
    script: 'server-production.js',
    cwd: 'E:\\Project\\notsmartsoko\\Smartsoko\\food_delivery_app',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=4096',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      FIREBASE_SERVICE_ACCOUNT_BASE64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'fooddelievry-dce15.firebaseapp.com',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'fooddelievry-dce15',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'fooddelievry-dce15.firebasestorage.app',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '727819507148',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '1:727819507148:web:372bee2608d5c7a9587969',
      PESAPAL_CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY,
      PESAPAL_CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET,
      PESAPAL_ENV: process.env.PESAPAL_ENV || 'sandbox',
      PESAPAL_CALLBACK_BASE: process.env.PESAPAL_CALLBACK_BASE || 'http://localhost:3000',
      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
      DELIVERY_FEE: '2000',
      TAX_RATE: '0.18',
      CURRENCY: 'TSh',
      LOG_LEVEL: 'info'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    watch: false,
    kill_timeout: 10000,
    listen_timeout: 8000,
    shutdown_with_message: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};