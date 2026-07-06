/**
 * App Configuration
 * Reused from web app - same Supabase project
 */

// Supabase Configuration (Same as web app)
export const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8';

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://your-production-domain.com/api';

// App Settings
export const APP_NAME = 'SmartSoko';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Cache Settings
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const STALE_WHILE_REVALIDATE = 30 * 60 * 1000; // 30 minutes

// Image Settings
export const IMAGE_QUALITY = 0.8;
export const MAX_IMAGE_WIDTH = 1200;
export const THUMBNAIL_SIZE = 300;

// Feature Flags
export const FEATURES = {
  offlineSupport: true,
  pushNotifications: true,
  chat: true,
  multipleVendors: true,
  promoCodes: true,
  loyaltyProgram: false,
};

// Timeouts
export const API_TIMEOUT = 30000; // 30 seconds
export const NETWORK_RETRY_ATTEMPTS = 3;
