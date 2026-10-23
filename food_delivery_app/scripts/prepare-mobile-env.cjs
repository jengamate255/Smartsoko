const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Only public client settings belong in an APK. Never copy the server .env.
const publicKeys = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MAPBOX_TOKEN', 'GOOGLE_MAPS_API_KEY',
  'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID',
  'FIREBASE_DATABASE_URL', 'SKIP_FIREBASE',
];

function publicMobileEnv(source) {
  return publicKeys.filter(key => source[key] !== undefined)
    .map(key => `${key}=${JSON.stringify(source[key])}`).join('\n') + '\n';
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const source = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
  if (!source.SUPABASE_URL || !source.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for mobile builds');
  }
  const destination = path.join(root, 'assets/config/.env');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, publicMobileEnv(source));
  console.log('Prepared public mobile configuration (server secrets excluded).');
}

module.exports = { publicMobileEnv };
