-- Avoid loading pages of Auth users into an Edge Function just to determine
-- which sign-in form to display. The lookup remains service-role-only.

create or replace function public.auth_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select case
    when p_email is null or char_length(p_email) > 254 then false
    else exists (
      select 1
      from auth.users
      where lower(email) = lower(trim(p_email))
    )
  end;
$$;

revoke execute on function public.auth_email_exists(text)
  from public, anon, authenticated;
grant execute on function public.auth_email_exists(text)
  to service_role;
