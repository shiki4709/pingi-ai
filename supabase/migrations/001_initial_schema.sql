-- Pingi AI — Initial Schema
-- Paste this into the Supabase SQL Editor to create all tables.
-- RLS is disabled for now; enable per-table once auth is wired up.

-- ─── Extensions ───
create extension if not exists "pgcrypto";

-- ─── Enums ───
create type platform as enum ('gmail', 'twitter', 'linkedin');
create type urgency as enum ('red', 'amber', 'green');
create type item_status as enum ('pending', 'sent', 'skipped');
create type context_category as enum (
  'BUSINESS_OPPORTUNITY',
  'PROFESSIONAL_NETWORK',
  'AUDIENCE_ENGAGEMENT',
  'KNOWLEDGE_EXCHANGE',
  'OPERATIONAL',
  'PERSONAL'
);

-- ─── Users ───
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  telegram_chat_id bigint unique,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;
-- RLS policies: none for now (service key bypasses RLS)

-- ─── Connected Accounts ───
-- One row per platform account per user. Stores OAuth tokens.
-- Users can connect multiple accounts on the same platform (e.g. two Gmail addresses).
create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform platform not null,
  platform_user_id text,                -- their ID on the platform
  platform_username text,               -- display handle
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, platform)
);

alter table connected_accounts enable row level security;

-- ─── Voice Profiles ───
-- One row per context category per user.
-- Maps to VoiceConfig from TONE_SYSTEM.md.
create table voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  context context_category not null,
  description text,                     -- natural language voice description
  examples text[] not null default '{}', -- 3-10 example replies
  max_length int,                       -- character limit override
  sign_off text,                        -- e.g. "Best," for emails
  avoid_topics text[] not null default '{}',
  always_mention text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, context)
);

alter table voice_profiles enable row level security;

-- ─── Reply Items ───
-- Every engagement item detected by connectors.
create table reply_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform platform not null,
  urgency urgency not null default 'green',
  context context_category,
  priority_score int not null default 5,
  status item_status not null default 'pending',

  -- Author info
  author_name text not null,
  author_handle text,

  -- Message content
  original_text text not null,
  context_text text,                    -- subject line, post title, etc.

  -- Draft
  draft_text text,
  final_draft text,                     -- what was actually sent (may differ from draft)

  -- Timestamps
  detected_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reply_items_user_status on reply_items(user_id, status);
create index idx_reply_items_user_urgency on reply_items(user_id, urgency);
create index idx_reply_items_detected on reply_items(detected_at desc);

alter table reply_items enable row level security;

-- ─── Chat Sessions ───
-- Tracks Telegram bot interaction state per user.
-- Used for edit flow, drip queue position, etc.
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  telegram_chat_id bigint not null,

  -- Edit state
  editing_item_id uuid references reply_items(id) on delete set null,
  edit_started_at timestamptz,

  -- Drip queue: ordered list of item IDs waiting to be pushed
  drip_queue uuid[] not null default '{}',
  last_drip_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id),
  unique (telegram_chat_id)
);

alter table chat_sessions enable row level security;

-- ─── Updated-at trigger ───
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users for each row execute function set_updated_at();

create trigger trg_connected_accounts_updated_at
  before update on connected_accounts for each row execute function set_updated_at();

create trigger trg_voice_profiles_updated_at
  before update on voice_profiles for each row execute function set_updated_at();

create trigger trg_reply_items_updated_at
  before update on reply_items for each row execute function set_updated_at();

create trigger trg_chat_sessions_updated_at
  before update on chat_sessions for each row execute function set_updated_at();
