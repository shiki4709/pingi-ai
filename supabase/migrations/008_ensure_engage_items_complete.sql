-- Ensure x_engage_items has all columns the code depends on.
-- The table was created manually; these may or may not already exist.

ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS source_value TEXT;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS reply_tweet_id TEXT;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS reply_likes INTEGER DEFAULT 0;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS reply_replies INTEGER DEFAULT 0;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS reply_retweets INTEGER DEFAULT 0;
ALTER TABLE x_engage_items ADD COLUMN IF NOT EXISTS metrics_checked_at TIMESTAMPTZ;

-- Backfill: set posted_at = created_at for items already marked as posted
UPDATE x_engage_items SET posted_at = created_at WHERE status = 'posted' AND posted_at IS NULL;
