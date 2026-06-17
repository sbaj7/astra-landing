-- Astra USMLE Q-bank schema
-- items: every generated question (persisted for the calibration flywheel + reuse)
-- responses: one row per answered item
-- user_skill: per-(step, axis, value) mastery for the dynamic dashboard

create table if not exists public.qbank_items (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  step              text not null,
  system            text,
  specialty         text,
  task              text,
  difficulty        text,
  vignette          text not null,
  lead_in           text not null,
  options           jsonb not null,        -- [{ text, correct, rationale }]
  teaching_point    text,
  citations         jsonb default '[]'::jsonb,
  content_hash      text unique,
  generator_version text,
  status            text not null default 'live'
);
create index if not exists qbank_items_step_idx on public.qbank_items (step);
create index if not exists qbank_items_tags_idx on public.qbank_items (step, system, specialty, task, difficulty);

create table if not exists public.qbank_responses (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users (id) on delete set null,
  anon_id      text,
  item_id      uuid references public.qbank_items (id) on delete set null,
  step         text not null,
  system       text,
  specialty    text,
  task         text,
  difficulty   text,
  chosen_index int,
  correct      boolean not null,
  latency_ms   int,
  confidence   text
);
create index if not exists qbank_responses_user_idx on public.qbank_responses (user_id);

create table if not exists public.qbank_user_skill (
  user_id     uuid references auth.users (id) on delete cascade,
  anon_id     text,
  step        text not null,
  axis        text not null,   -- 'systems' | 'specialties' | 'tasks'
  axis_value  text not null,
  correct     int not null default 0,
  attempts    int not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, anon_id, step, axis, axis_value)
);

-- RLS
alter table public.qbank_items enable row level security;
alter table public.qbank_responses enable row level security;
alter table public.qbank_user_skill enable row level security;

-- Items are readable by everyone; only the service role (edge function) writes them.
drop policy if exists qbank_items_read on public.qbank_items;
create policy qbank_items_read on public.qbank_items for select using (true);

-- Users read/write only their own responses and skill rows.
drop policy if exists qbank_responses_own on public.qbank_responses;
create policy qbank_responses_own on public.qbank_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists qbank_user_skill_own on public.qbank_user_skill;
create policy qbank_user_skill_own on public.qbank_user_skill
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
