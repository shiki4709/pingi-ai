-- invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- users table additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'organic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_id UUID REFERENCES invite_codes(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sent_expiry_warning BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sent_expiry_notice BOOLEAN NOT NULL DEFAULT false;
