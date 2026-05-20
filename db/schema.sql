create table if not exists channel_spaces (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_sources_type_name unique (type, name)
);

create table if not exists channel_sources (
  id uuid primary key default gen_random_uuid(),
  channel_space_id uuid not null references channel_spaces(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  enabled boolean not null default true,
  fetch_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_channel_sources_space_source unique (channel_space_id, source_id)
);

create index if not exists ix_channel_sources_space_enabled
  on channel_sources(channel_space_id, enabled);

create table if not exists source_states (
  id uuid primary key default gen_random_uuid(),
  channel_source_id uuid not null references channel_sources(id) on delete cascade,
  cursor jsonb not null default '{}'::jsonb,
  next_fetch_at timestamptz,
  consecutive_failures int not null default 0,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint uq_source_states_channel_source unique (channel_source_id)
);

create index if not exists ix_source_states_next_fetch_at
  on source_states(next_fetch_at);

create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  channel_space_id uuid not null references channel_spaces(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  source_item_id text not null,
  source_item_url text,
  published_at timestamptz,
  content jsonb not null default '{}'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  constraint uq_raw_items_source_item unique (source_id, source_item_id)
);

create index if not exists ix_raw_items_space_published
  on raw_items(channel_space_id, published_at desc);

create table if not exists processed_news (
  id uuid primary key default gen_random_uuid(),
  channel_space_id uuid not null references channel_spaces(id) on delete cascade,
  raw_item_id uuid not null references raw_items(id) on delete cascade,
  title text not null,
  summary text not null,
  language varchar(20) not null default 'zh',
  source_refs jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  bullets jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  importance_score numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_processed_news_raw_item unique (raw_item_id)
);

create index if not exists ix_processed_news_space_published
  on processed_news(channel_space_id, published_at desc);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  channel_space_id uuid not null references channel_spaces(id) on delete cascade,
  channel_source_id uuid references channel_sources(id) on delete cascade,
  raw_item_id uuid references raw_items(id) on delete cascade,
  status text not null default 'queued',
  priority int not null default 0,
  run_after timestamptz not null default now(),
  attempt int not null default 0,
  max_attempts int not null default 5,
  locked_by text,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_tasks_queue
  on tasks(status, run_after, priority desc);

create index if not exists ix_tasks_locked_at
  on tasks(locked_at);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  channel_space_id uuid not null references channel_spaces(id) on delete cascade,
  type text not null,
  severity text not null default 'warning',
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_alerts_space_created
  on alerts(channel_space_id, created_at desc);

