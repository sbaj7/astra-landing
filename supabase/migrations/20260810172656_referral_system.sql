create table public.referral_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.referral_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  commission_type text not null check (commission_type in ('fixed', 'percentage')),
  commission_amount_cents integer,
  commission_rate_bps integer,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  hold_days integer not null default 30 check (hold_days between 0 and 180),
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_amount_cents integer,
  discount_percent integer,
  payout_method text not null default 'manual',
  payout_contact text,
  notes text,
  stripe_coupon_id text unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (commission_type = 'fixed' and commission_amount_cents > 0 and commission_rate_bps is null)
    or
    (commission_type = 'percentage' and commission_rate_bps between 1 and 10000 and commission_amount_cents is null)
  ),
  check (
    (discount_type = 'fixed' and discount_amount_cents > 0 and discount_percent is null)
    or
    (discount_type = 'percentage' and discount_percent between 1 and 100 and discount_amount_cents is null)
  )
);

create unique index referral_partners_email_lower_idx
  on public.referral_partners (lower(email));

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.referral_partners(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9-]{3,40}$'),
  status text not null default 'active' check (status in ('active', 'paused')),
  stripe_promotion_code_id text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index referral_codes_code_lower_idx
  on public.referral_codes (lower(code));
create index referral_codes_partner_idx
  on public.referral_codes (partner_id, created_at desc);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.referral_partners(id) on delete restrict,
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  supabase_user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text not null unique,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text unique,
  stripe_promotion_code_id text not null,
  first_paid_invoice_id text unique,
  attributed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referral_attributions_partner_idx
  on public.referral_attributions (partner_id, attributed_at desc);

create table public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.referral_partners(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null default 'paid' check (status in ('paid', 'void')),
  payout_method text not null,
  payout_reference text not null,
  notes text,
  paid_at timestamptz not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index referral_payouts_reference_idx
  on public.referral_payouts (payout_method, payout_reference);
create index referral_payouts_partner_idx
  on public.referral_payouts (partner_id, paid_at desc);

create table public.referral_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.referral_partners(id) on delete restrict,
  referral_code_id uuid references public.referral_codes(id) on delete restrict,
  attribution_id uuid references public.referral_attributions(id) on delete restrict,
  entry_type text not null check (entry_type in ('commission', 'reversal', 'payout')),
  amount_cents integer not null check (amount_cents <> 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  available_at timestamptz not null,
  stripe_event_id text unique,
  stripe_invoice_id text,
  stripe_charge_id text,
  reverses_entry_id uuid unique references public.referral_ledger_entries(id) on delete restrict,
  payout_id uuid unique references public.referral_payouts(id) on delete restrict,
  description text,
  created_at timestamptz not null default now(),
  check (
    (entry_type = 'commission' and amount_cents > 0 and attribution_id is not null and payout_id is null and reverses_entry_id is null)
    or
    (entry_type = 'reversal' and amount_cents < 0 and reverses_entry_id is not null and payout_id is null)
    or
    (entry_type = 'payout' and amount_cents < 0 and payout_id is not null and attribution_id is null and reverses_entry_id is null)
  )
);

create unique index referral_ledger_first_invoice_idx
  on public.referral_ledger_entries (stripe_invoice_id)
  where entry_type = 'commission' and stripe_invoice_id is not null;
create index referral_ledger_partner_available_idx
  on public.referral_ledger_entries (partner_id, available_at, created_at desc);

create table public.referral_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  stripe_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index referral_audit_stripe_action_idx
  on public.referral_audit_events (stripe_event_id, action)
  where stripe_event_id is not null;
create index referral_audit_created_idx
  on public.referral_audit_events (created_at desc);

alter table public.referral_admins enable row level security;
alter table public.referral_partners enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_payouts enable row level security;
alter table public.referral_ledger_entries enable row level security;
alter table public.referral_audit_events enable row level security;

revoke all on table public.referral_admins from anon, authenticated;
revoke all on table public.referral_partners from anon, authenticated;
revoke all on table public.referral_codes from anon, authenticated;
revoke all on table public.referral_attributions from anon, authenticated;
revoke all on table public.referral_payouts from anon, authenticated;
revoke all on table public.referral_ledger_entries from anon, authenticated;
revoke all on table public.referral_audit_events from anon, authenticated;

grant all on table public.referral_admins to service_role;
grant all on table public.referral_partners to service_role;
grant all on table public.referral_codes to service_role;
grant all on table public.referral_attributions to service_role;
grant all on table public.referral_payouts to service_role;
grant all on table public.referral_ledger_entries to service_role;
grant all on table public.referral_audit_events to service_role;

create or replace function public.record_referral_commission(
  p_attribution_id uuid,
  p_stripe_event_id text,
  p_stripe_invoice_id text,
  p_stripe_charge_id text,
  p_gross_amount_cents integer,
  p_commission_amount_cents integer,
  p_currency text,
  p_available_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attribution public.referral_attributions%rowtype;
  v_entry_id uuid;
begin
  if p_gross_amount_cents <= 0 or p_commission_amount_cents <= 0 then
    raise exception 'Commission and gross amounts must be positive';
  end if;

  select * into v_attribution
  from public.referral_attributions
  where id = p_attribution_id
  for update;

  if not found then
    raise exception 'Referral attribution not found';
  end if;

  if v_attribution.first_paid_invoice_id is not null then
    select id into v_entry_id
    from public.referral_ledger_entries
    where attribution_id = p_attribution_id and entry_type = 'commission'
    limit 1;
    return v_entry_id;
  end if;

  update public.referral_attributions
  set first_paid_invoice_id = p_stripe_invoice_id,
      updated_at = now()
  where id = p_attribution_id;

  insert into public.referral_ledger_entries (
    partner_id,
    referral_code_id,
    attribution_id,
    entry_type,
    amount_cents,
    currency,
    available_at,
    stripe_event_id,
    stripe_invoice_id,
    stripe_charge_id,
    description
  ) values (
    v_attribution.partner_id,
    v_attribution.referral_code_id,
    v_attribution.id,
    'commission',
    p_commission_amount_cents,
    lower(p_currency),
    p_available_at,
    p_stripe_event_id,
    p_stripe_invoice_id,
    p_stripe_charge_id,
    format('One-time referral commission on %s cents paid', p_gross_amount_cents)
  )
  returning id into v_entry_id;

  insert into public.referral_audit_events (
    action, entity_type, entity_id, stripe_event_id, metadata
  ) values (
    'commission.created',
    'ledger_entry',
    v_entry_id,
    p_stripe_event_id,
    jsonb_build_object(
      'invoice_id', p_stripe_invoice_id,
      'gross_amount_cents', p_gross_amount_cents,
      'commission_amount_cents', p_commission_amount_cents
    )
  );

  return v_entry_id;
end;
$$;

create or replace function public.reverse_referral_commission(
  p_stripe_event_id text,
  p_stripe_invoice_id text,
  p_stripe_charge_id text,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original public.referral_ledger_entries%rowtype;
  v_entry_id uuid;
begin
  select * into v_original
  from public.referral_ledger_entries
  where entry_type = 'commission'
    and (
      (p_stripe_invoice_id is not null and stripe_invoice_id = p_stripe_invoice_id)
      or
      (p_stripe_charge_id is not null and stripe_charge_id = p_stripe_charge_id)
    )
  order by created_at asc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  select id into v_entry_id
  from public.referral_ledger_entries
  where reverses_entry_id = v_original.id;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  insert into public.referral_ledger_entries (
    partner_id,
    referral_code_id,
    attribution_id,
    entry_type,
    amount_cents,
    currency,
    available_at,
    stripe_event_id,
    stripe_invoice_id,
    stripe_charge_id,
    reverses_entry_id,
    description
  ) values (
    v_original.partner_id,
    v_original.referral_code_id,
    v_original.attribution_id,
    'reversal',
    -v_original.amount_cents,
    v_original.currency,
    now(),
    p_stripe_event_id,
    coalesce(p_stripe_invoice_id, v_original.stripe_invoice_id),
    coalesce(p_stripe_charge_id, v_original.stripe_charge_id),
    v_original.id,
    coalesce(nullif(trim(p_reason), ''), 'Refund or dispute reversal')
  )
  returning id into v_entry_id;

  insert into public.referral_audit_events (
    action, entity_type, entity_id, stripe_event_id, metadata
  ) values (
    'commission.reversed',
    'ledger_entry',
    v_entry_id,
    p_stripe_event_id,
    jsonb_build_object('reverses_entry_id', v_original.id, 'reason', p_reason)
  );

  return v_entry_id;
end;
$$;

create or replace function public.record_referral_payout(
  p_partner_id uuid,
  p_amount_cents integer,
  p_currency text,
  p_payout_method text,
  p_payout_reference text,
  p_notes text,
  p_paid_at timestamptz,
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payable_cents bigint;
  v_payout_id uuid;
begin
  if p_amount_cents <= 0 then
    raise exception 'Payout amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_partner_id::text, 0));

  select coalesce(sum(amount_cents), 0) into v_payable_cents
  from public.referral_ledger_entries
  where partner_id = p_partner_id
    and currency = lower(p_currency)
    and available_at <= now();

  if p_amount_cents > v_payable_cents then
    raise exception 'Payout exceeds available balance';
  end if;

  insert into public.referral_payouts (
    partner_id,
    amount_cents,
    currency,
    payout_method,
    payout_reference,
    notes,
    paid_at,
    recorded_by
  ) values (
    p_partner_id,
    p_amount_cents,
    lower(p_currency),
    trim(p_payout_method),
    trim(p_payout_reference),
    nullif(trim(p_notes), ''),
    p_paid_at,
    p_actor_user_id
  )
  returning id into v_payout_id;

  insert into public.referral_ledger_entries (
    partner_id,
    entry_type,
    amount_cents,
    currency,
    available_at,
    payout_id,
    description
  ) values (
    p_partner_id,
    'payout',
    -p_amount_cents,
    lower(p_currency),
    p_paid_at,
    v_payout_id,
    format('Manual payout via %s (%s)', trim(p_payout_method), trim(p_payout_reference))
  );

  insert into public.referral_audit_events (
    actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_actor_user_id,
    'payout.recorded',
    'payout',
    v_payout_id,
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'currency', lower(p_currency),
      'method', trim(p_payout_method),
      'reference', trim(p_payout_reference)
    )
  );

  return v_payout_id;
end;
$$;

revoke all on function public.record_referral_commission(uuid, text, text, text, integer, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function public.reverse_referral_commission(text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_referral_payout(uuid, integer, text, text, text, text, timestamptz, uuid) from public, anon, authenticated;

grant execute on function public.record_referral_commission(uuid, text, text, text, integer, integer, text, timestamptz) to service_role;
grant execute on function public.reverse_referral_commission(text, text, text, text) to service_role;
grant execute on function public.record_referral_payout(uuid, integer, text, text, text, text, timestamptz, uuid) to service_role;

insert into public.referral_admins (user_id)
select id
from auth.users
where lower(email) in ('sbajrami19@gmail.com', 'shonshmushkevich@gmail.com')
on conflict (user_id) do nothing;
