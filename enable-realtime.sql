-- Enable Realtime for the messages table
-- This allows real-time subscriptions to work

-- First, make sure the publication exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add the messages table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify it's added (optional - just for checking)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
