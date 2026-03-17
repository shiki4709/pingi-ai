-- Add columns that the auth callback and bot code depend on
-- but were never migrated when the billing/trial logic was added.

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sign_off TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_bot_chat_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_auth_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_ct0 TEXT;
