-- Baseline stats: snapshot of a user's email habits from their first 30 days of history.
-- Calculated once during onboarding when Gmail is connected.

create table baseline_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_label text not null,              -- which Gmail account, e.g. "alice@gmail.com"
  period_start timestamptz not null,
  period_end timestamptz not null,
  emails_received int not null default 0,
  emails_replied int not null default 0,
  emails_missed int not null default 0,
  avg_response_time_hours numeric(6,2),
  response_rate_pct numeric(5,2),
  busiest_day text,                         -- e.g. "Monday"
  busiest_hour int check (busiest_hour between 0 and 23),
  created_at timestamptz not null default now(),

  unique (user_id, account_label)
);

alter table baseline_stats enable row level security;

create trigger trg_baseline_stats_updated_at
  before update on baseline_stats for each row execute function set_updated_at();

-- Weekly reports: generated every Monday for the prior week.
-- Covers all platforms (Gmail, X, LinkedIn), not just email.

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,                 -- Monday of the reported week
  items_received int not null default 0,
  items_replied int not null default 0,
  items_skipped int not null default 0,
  avg_response_time_hours numeric(6,2),
  response_rate_pct numeric(5,2),
  leads_engaged int not null default 0,     -- items with context = BUSINESS_OPPORTUNITY replied
  fastest_reply_minutes numeric(8,2),
  slowest_reply_hours numeric(6,2),
  streak_days int not null default 0,       -- consecutive days with ≥1 reply
  created_at timestamptz not null default now(),

  unique (user_id, week_start)
);

alter table weekly_reports enable row level security;

create trigger trg_weekly_reports_updated_at
  before update on weekly_reports for each row execute function set_updated_at();
