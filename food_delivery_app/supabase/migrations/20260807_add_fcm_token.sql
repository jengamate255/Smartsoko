-- Add FCM push token column for driver push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
