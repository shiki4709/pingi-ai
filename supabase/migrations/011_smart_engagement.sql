-- User niche profiles for goal-based engagement
CREATE TABLE IF NOT EXISTS user_niche_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  goal_text TEXT,
  target_icp TEXT,
  niche_keywords TEXT[] NOT NULL DEFAULT '{}',
  trending_queries TEXT[] NOT NULL DEFAULT '{}',
  suggested_accounts TEXT[] NOT NULL DEFAULT '{}',
  x_handle TEXT,
  x_follower_count INT DEFAULT 0,
  milestones_sent TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend weekly_reports with coaching columns
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS conversations INT NOT NULL DEFAULT 0;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS top_niche TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS top_account TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS trending_replies INT NOT NULL DEFAULT 0;
