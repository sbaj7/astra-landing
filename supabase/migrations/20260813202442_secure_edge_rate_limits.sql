-- Atomic, service-only metering for public Edge Functions. Scope keys are
-- server-side HMACs; raw user IDs, network addresses, and browser tokens are not
-- stored in this table.

create table if not exists public.api_rate_limits (
  scope_key text not null,
  bucket text not null,
  request_count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope_key, bucket),
  constraint api_rate_limits_scope_key_length check (char_length(scope_key) between 32 and 128),
  constraint api_rate_limits_bucket_length check (char_length(bucket) between 1 and 64),
  constraint api_rate_limits_request_count_nonnegative check (request_count >= 0)
);

alter table public.api_rate_limits enable row level security;
revoke all privileges on public.api_rate_limits from public, anon, authenticated;
grant all privileges on public.api_rate_limits to service_role;

create index if not exists api_rate_limits_reset_at_idx
  on public.api_rate_limits (reset_at);

create or replace function public.consume_api_rate_limit(
  p_scope_key text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_count integer;
  current_reset timestamptz;
begin
  if p_scope_key is null or char_length(p_scope_key) not between 32 and 128 then
    raise exception 'invalid rate-limit scope';
  end if;
  if p_bucket is null or char_length(p_bucket) not between 1 and 64 then
    raise exception 'invalid rate-limit bucket';
  end if;
  if p_limit < 1 or p_limit > 1000000 then
    raise exception 'invalid rate limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'invalid rate-limit window';
  end if;

  insert into public.api_rate_limits as current_limit (
    scope_key,
    bucket,
    request_count,
    reset_at,
    updated_at
  ) values (
    p_scope_key,
    p_bucket,
    1,
    statement_timestamp() + make_interval(secs => p_window_seconds),
    statement_timestamp()
  )
  on conflict (scope_key, bucket) do update
    set request_count = case
          when current_limit.reset_at <= statement_timestamp() then 1
          else current_limit.request_count + 1
        end,
        reset_at = case
          when current_limit.reset_at <= statement_timestamp()
            then statement_timestamp() + make_interval(secs => p_window_seconds)
          else current_limit.reset_at
        end,
        updated_at = statement_timestamp()
    where current_limit.reset_at <= statement_timestamp()
       or current_limit.request_count < p_limit
  returning current_limit.request_count, current_limit.reset_at
    into current_count, current_reset;

  if found then
    return query select
      true,
      current_count,
      greatest(p_limit - current_count, 0),
      current_reset;
    return;
  end if;

  select limits.request_count, limits.reset_at
    into current_count, current_reset
  from public.api_rate_limits as limits
  where limits.scope_key = p_scope_key and limits.bucket = p_bucket;

  return query select
    false,
    coalesce(current_count, p_limit),
    0,
    coalesce(current_reset, statement_timestamp() + make_interval(secs => p_window_seconds));
end;
$$;

create or replace function public.get_api_rate_limit(
  p_scope_key text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_count integer := 0;
  current_reset timestamptz := statement_timestamp() + make_interval(secs => p_window_seconds);
begin
  if p_scope_key is null or char_length(p_scope_key) not between 32 and 128 then
    raise exception 'invalid rate-limit scope';
  end if;
  if p_bucket is null or char_length(p_bucket) not between 1 and 64 then
    raise exception 'invalid rate-limit bucket';
  end if;
  if p_limit < 1 or p_limit > 1000000 then
    raise exception 'invalid rate limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'invalid rate-limit window';
  end if;

  select
    case when limits.reset_at <= statement_timestamp() then 0 else limits.request_count end,
    case
      when limits.reset_at <= statement_timestamp()
        then statement_timestamp() + make_interval(secs => p_window_seconds)
      else limits.reset_at
    end
  into current_count, current_reset
  from public.api_rate_limits as limits
  where limits.scope_key = p_scope_key and limits.bucket = p_bucket;

  current_count := coalesce(current_count, 0);
  current_reset := coalesce(
    current_reset,
    statement_timestamp() + make_interval(secs => p_window_seconds)
  );
  return query select
    current_count < p_limit,
    current_count,
    greatest(p_limit - current_count, 0),
    current_reset;
end;
$$;

revoke execute on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.get_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;
grant execute on function public.get_api_rate_limit(text, text, integer, integer)
  to service_role;
