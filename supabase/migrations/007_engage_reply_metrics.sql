-- Track engagement metrics on posted replies
ALTER TABLE x_engage_items
  ADD COLUMN IF NOT EXISTS reply_tweet_id TEXT,
  ADD COLUMN IF NOT EXISTS reply_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reply_replies INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reply_retweets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics_checked_at TIMESTAMPTZ;
