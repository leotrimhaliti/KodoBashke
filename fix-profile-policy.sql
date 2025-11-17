-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view profiles they haven't swiped on" ON profiles;

-- Create a new policy that allows viewing profiles you haven't swiped on OR profiles you matched with
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    id NOT IN (
      SELECT target_user_id FROM swipes WHERE user_id = auth.uid()
    ) OR
    id IN (
      SELECT user1_id FROM matches WHERE user2_id = auth.uid()
      UNION
      SELECT user2_id FROM matches WHERE user1_id = auth.uid()
    )
  );
