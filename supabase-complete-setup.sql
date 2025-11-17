/*
  # Complete Database Setup for KodoBashke
  # Run this ENTIRE file in your Supabase SQL Editor
  
  This includes:
  1. All tables with RLS policies
  2. Performance indexes
  3. Triggers and functions
  4. Security improvements
*/

-- ============================================
-- STEP 1: CREATE TABLES
-- ============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  bio text DEFAULT '',
  skills text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  github_url text DEFAULT '',
  portfolio_url text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Swipes table
CREATE TABLE IF NOT EXISTS swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  is_like boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (user1_id < user2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users cannot delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (false);

-- Swipes policies
CREATE POLICY "Users can view their own swipes"
  ON swipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own swipes"
  ON swipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- ============================================
-- STEP 4: CREATE FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp on profile updates
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

-- Auto-create match when both users like each other
CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_like = true THEN
    IF EXISTS (
      SELECT 1 FROM swipes
      WHERE user_id = NEW.target_user_id
      AND target_user_id = NEW.user_id
      AND is_like = true
    ) THEN
      INSERT INTO matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.user_id, NEW.target_user_id),
        GREATEST(NEW.user_id, NEW.target_user_id)
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_match_on_mutual_like ON swipes;
CREATE TRIGGER trigger_create_match_on_mutual_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_mutual_like();

-- ============================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- ============================================

-- Swipes table indexes
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target_user_id ON swipes(target_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_user_target ON swipes(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON swipes(created_at DESC);

-- Matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_users_created ON matches(user1_id, user2_id, created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================
-- DONE! Your database is now production-ready
-- ============================================
