-- Performance indexes for faster queries
-- Run this in your Supabase SQL Editor

-- Swipes table indexes
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target_user_id ON swipes(target_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_user_target ON swipes(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON swipes(created_at DESC);

-- Matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_matches_users_created 
ON matches(user1_id, user2_id, created_at DESC);
