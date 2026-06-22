-- Completed QBank sets, per user, so history follows the account across devices.
create table if not exists public.qbank_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  started_at  timestamptz not null,
  finished_at timestamptz not null default now(),
  step        text,
  mode        text,
  difficulty  text,
  total       int  not null default 0,
  correct     int  not null default 0,
  answers     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists qbank_sessions_user_idx
  on public.qbank_sessions (user_id, started_at desc);

alter table public.qbank_sessions enable row level security;

drop policy if exists qbank_sessions_own on public.qbank_sessions;
create policy qbank_sessions_own on public.qbank_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
