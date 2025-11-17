-- First, let's manually create the match that should have been created
INSERT INTO matches (user1_id, user2_id)
VALUES (
  LEAST('c9efb0f4-2464-454a-a7bb-33964e84b2ab'::uuid, '52456027-0d7a-4d77-86cd-ca0e1d5a5630'::uuid),
  GREATEST('c9efb0f4-2464-454a-a7bb-33964e84b2ab'::uuid, '52456027-0d7a-4d77-86cd-ca0e1d5a5630'::uuid)
)
ON CONFLICT DO NOTHING;

-- Now let's recreate the trigger function with better logic
DROP TRIGGER IF EXISTS trigger_create_match_on_mutual_like ON swipes;
DROP FUNCTION IF EXISTS create_match_on_mutual_like();

CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  match_exists boolean;
BEGIN
  -- Only proceed if this is a like
  IF NEW.is_like = true THEN
    -- Check if the other user also liked
    IF EXISTS (
      SELECT 1 FROM swipes
      WHERE user_id = NEW.target_user_id
      AND target_user_id = NEW.user_id
      AND is_like = true
    ) THEN
      -- Check if match already exists
      SELECT EXISTS (
        SELECT 1 FROM matches
        WHERE (user1_id = LEAST(NEW.user_id, NEW.target_user_id) 
        AND user2_id = GREATEST(NEW.user_id, NEW.target_user_id))
      ) INTO match_exists;
      
      -- Create match if it doesn't exist
      IF NOT match_exists THEN
        INSERT INTO matches (user1_id, user2_id)
        VALUES (
          LEAST(NEW.user_id, NEW.target_user_id),
          GREATEST(NEW.user_id, NEW.target_user_id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the swipe
    RAISE WARNING 'Error creating match: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_create_match_on_mutual_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_mutual_like();

-- Also add a policy to allow the trigger to insert matches
DROP POLICY IF EXISTS "System can create matches" ON matches;
CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);
