-- Track which topic or watched account each engage item came from
alter table x_engage_items
  add column if not exists source_type text,      -- 'account' or 'topic'
  add column if not exists source_value text;      -- handle or topic string

create index if not exists idx_engage_source
  on x_engage_items (user_id, source_type, source_value);
