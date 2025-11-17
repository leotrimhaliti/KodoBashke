/*
  # Dev Matcher - Tinder for Project Partners

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `bio` (text)
      - `skills` (text array)
      - `interests` (text array)
      - `github_url` (text, optional)
      - `portfolio_url` (text, optional)
      - `photo_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `swipes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `target_user_id` (uuid, references profiles)
      - `is_like` (boolean)
      - `created_at` (timestamp)
    
    - `matches`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references profiles)
      - `user2_id` (uuid, references profiles)
      - `created_at` (timestamp)
    
    - `messages`
      - `id` (uuid, primary key)
      - `match_id` (uuid, references matches)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can read their own profile and profiles they haven't swiped on
    - Users can create their own swipes
    - Users can only see matches they're part of
    - Users can only send/read messages in their matches
*/

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Swipes table
CREATE TABLE IF NOT EXISTS swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  is_like boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own swipes"
  ON swipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own swipes"
  ON swipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (user1_id < user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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

-- Add profiles SELECT policy after swipes table exists
CREATE POLICY "Users can view profiles they haven't swiped on"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    id NOT IN (
      SELECT target_user_id FROM swipes WHERE user_id = auth.uid()
    )
  );

-- Function to create match when mutual like occurs
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

CREATE TRIGGER trigger_create_match_on_mutual_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_mutual_like();

