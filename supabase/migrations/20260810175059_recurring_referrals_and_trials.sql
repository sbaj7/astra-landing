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

  select id into v_entry_id
  from public.referral_ledger_entries
  where entry_type = 'commission'
    and (
      stripe_event_id = p_stripe_event_id
      or stripe_invoice_id = p_stripe_invoice_id
    )
  limit 1;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_attribution
  from public.referral_attributions
  where id = p_attribution_id
  for update;

  if not found then
    raise exception 'Referral attribution not found';
  end if;

  update public.referral_attributions
  set first_paid_invoice_id = coalesce(first_paid_invoice_id, p_stripe_invoice_id),
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
    format('Recurring referral commission on %s cents paid', p_gross_amount_cents)
  )
  on conflict do nothing
  returning id into v_entry_id;

  if v_entry_id is null then
    select id into v_entry_id
    from public.referral_ledger_entries
    where entry_type = 'commission'
      and (
        stripe_event_id = p_stripe_event_id
        or stripe_invoice_id = p_stripe_invoice_id
      )
    limit 1;
    return v_entry_id;
  end if;

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
      'commission_amount_cents', p_commission_amount_cents,
      'recurring', true
    )
  )
  on conflict do nothing;

  return v_entry_id;
end;
$$;

revoke all on function public.record_referral_commission(uuid, text, text, text, integer, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_referral_commission(uuid, text, text, text, integer, integer, text, timestamptz) to service_role;
