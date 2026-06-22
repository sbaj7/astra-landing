-- Completed QBank sets, per user, so history follows the account across devices.
-- Written/read ONLY via the auth-management edge function (service role), exactly
-- like user_chat_sessions. user_id is the app's synced user id (text), not the
-- auth.users uuid, so it matches the chat-history flow.
drop table if exists public.qbank_sessions;

create table public.qbank_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text,
  anonymous_id text,
  started_at   timestamptz,
  step         text,
  mode         text,
  difficulty   text,
  total        int   not null default 0,
  correct      int   not null default 0,
  answers      jsonb not null default '[]'::jsonb,  -- full per-question payload (topic/specialty/system/task/chosen/correct)
  created_at   timestamptz not null default now()
);

create index if not exists qbank_sessions_user_idx on public.qbank_sessions (user_id, started_at desc);
create index if not exists qbank_sessions_anon_idx on public.qbank_sessions (anonymous_id, started_at desc);

-- RLS enabled with no policies: only the service role (edge function) can access,
-- same as the app's other user-data tables. No direct client access.
alter table public.qbank_sessions enable row level security;
