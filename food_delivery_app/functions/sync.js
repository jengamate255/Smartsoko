const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Supabase credentials (from AppConfig)
const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Syncs a Firestore document to Supabase
 * @param {string} table Supabase table name
 * @param {Object} data Document data
 * @param {string} id Document ID
 */
async function syncToSupabase(table, data, id) {
  try {
    const syncData = { ...data, id };
    
    // Remove Firebase-specific fields if necessary or convert Timestamps
    for (const key in syncData) {
      if (syncData[key] instanceof admin.firestore.Timestamp) {
        syncData[key] = syncData[key].toDate().toISOString();
      }
    }

    // Map fields if names differ between platforms
    if (table === 'profiles') {
      // Supabase 'profiles' vs Firebase 'users'
      if (syncData.phone && !syncData.phone.startsWith('+')) {
        // Ensure phone format if needed
      }
    }

    const { error } = await supabase
      .from(table)
      .upsert(syncData);

    if (error) {
      console.error(`Sync error for ${table}/${id}:`, error.message);
    } else {
      console.log(`Successfully synced ${table}/${id} to Supabase`);
    }
  } catch (err) {
    console.error(`Critical sync error for ${table}/${id}:`, err);
  }
}

module.exports = { syncToSupabase };
