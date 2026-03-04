-- Allow multiple accounts per platform per user (e.g. two Gmail addresses).
-- The unique key moves from (user_id, platform) → (user_id, platform, platform_username).

-- Drop old constraint
alter table connected_accounts
  drop constraint connected_accounts_user_id_platform_key;

-- platform_username must be NOT NULL going forward so the unique key is meaningful.
-- Back-fill any existing rows that have NULL platform_username with a placeholder
-- so the ALTER succeeds. These will be overwritten on next OAuth refresh.
update connected_accounts
  set platform_username = 'unknown'
  where platform_username is null;

alter table connected_accounts
  alter column platform_username set not null;

-- New composite unique
alter table connected_accounts
  add constraint connected_accounts_user_platform_handle_key
  unique (user_id, platform, platform_username);

-- Track which connected account a reply_item came from (e.g. "alice@gmail.com")
alter table reply_items
  add column account_label text;
