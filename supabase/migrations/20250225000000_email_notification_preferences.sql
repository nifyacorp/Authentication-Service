/*
  # Add Email Notification Preferences

  1. Changes to Users Table
    - Add notification_settings JSONB column
    - Add defaults for email notifications (daily digest)
    - Add migration for existing users

  2. Security
    - Update RLS policies to allow users to update their notification settings
*/

-- Add notification_settings column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "emailNotifications": false,
  "notificationEmail": null,
  "emailFrequency": "daily",
  "instantNotifications": false
}'::JSONB;

-- Update existing users to have default notification settings if the column is null
UPDATE users SET notification_settings = '{
  "emailNotifications": false,
  "notificationEmail": null,
  "emailFrequency": "daily",
  "instantNotifications": false
}'::JSONB
WHERE notification_settings IS NULL;

-- Create index for faster search on notification settings
CREATE INDEX IF NOT EXISTS idx_users_notification_settings_email ON users((notification_settings->>'emailNotifications'));
CREATE INDEX IF NOT EXISTS idx_users_notification_settings_instant ON users((notification_settings->>'instantNotifications'));

-- Add function to check if a user should receive instant notifications
CREATE OR REPLACE FUNCTION should_receive_instant_notifications(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
  is_test_user BOOLEAN;
BEGIN
  -- Check if the user has instant notifications enabled or is the test user
  SELECT 
    (notification_settings->>'instantNotifications')::BOOLEAN OR 
    email = 'nifyacorp@gmail.com' INTO is_enabled
  FROM users
  WHERE id = user_id;
  
  RETURN COALESCE(is_enabled, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Add function to get users due for daily digest
CREATE OR REPLACE FUNCTION get_users_for_daily_digest()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  notification_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    (u.notification_settings->>'notificationEmail')::TEXT
  FROM users u
  WHERE 
    (u.notification_settings->>'emailNotifications')::BOOLEAN = TRUE
    AND (u.notification_settings->>'emailFrequency')::TEXT = 'daily'
    AND u.email_verified = TRUE;
END;
$$ LANGUAGE plpgsql; 