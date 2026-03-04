-- Add external_id (text) for platform-specific message IDs (e.g. "gmail-19cb7ff38c276ae6").
-- The uuid primary key stays as the internal row ID.

alter table reply_items
  add column external_id text;

-- Prevent duplicate imports of the same platform message
create unique index idx_reply_items_external_id
  on reply_items(user_id, platform, external_id)
  where external_id is not null;
