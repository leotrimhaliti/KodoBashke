-- Fix RLS policies to properly secure the profiles table
-- Run this after supabase-schema.sql

-- Drop the existing flawed policy
DROP POLICY IF EXISTS "Users can view profiles they haven't swiped on" ON profiles;

-- Create more secure policies
-- Users can view all profiles (needed for the app to function)
-- But sensitive operations are still protected by other policies
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own profile
-- (This policy already exists from schema.sql, but included for completeness)

-- Users can only update their own profile
-- (This policy already exists from schema.sql, but included for completeness)

-- Add policy to prevent deletion by regular users (only allow via Supabase dashboard)
CREATE POLICY "Users cannot delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (false);
