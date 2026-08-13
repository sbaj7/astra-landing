import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.39.5";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { PLAN_DEFINITIONS } from "../_shared/stripePlans.ts";
import { normalizeReferralCode } from "../_shared/referrals.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("Referral admin configuration is incomplete");
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

type CommissionType = "fixed" | "percentage";
type DiscountType = "fixed" | "percentage";

type AdminRequest = {
  action?: "get_dashboard" | "create_partner" | "set_code_status" | "record_payout";
  partner?: {
    name?: string;
    email?: string;
    code?: string;
    commissionType?: CommissionType;
    commissionValue?: number;
    discountType?: DiscountType;
    discountValue?: number;
    holdDays?: number;
    payoutMethod?: string;
    payoutContact?: string;
    notes?: string;
  };
  codeId?: string;
  active?: boolean;
  payout?: {
    partnerId?: string;
    amountCents?: number;
    currency?: string;
    method?: string;
    reference?: string;
    notes?: string;
    paidAt?: string;
  };
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

async function requireReferralAdmin(req: Request): Promise<User> {
  const authorization = req.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) throw new ResponseError(401, "Authentication required");

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new ResponseError(401, "Invalid or expired session");

  const { data: admin, error: adminError } = await supabase
    .from("referral_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError) throw adminError;
  if (!admin) throw new ResponseError(403, "Referral management access required");
  return data.user;
}

class ResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function validatePartner(input: NonNullable<AdminRequest["partner"]>) {
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const code = normalizeReferralCode(input.code);
  const commissionType = input.commissionType;
  const discountType = input.discountType;
  const commissionValue = Number(input.commissionValue);
  const discountValue = Number(input.discountValue);
  const holdDays = Number.isInteger(input.holdDays) ? Number(input.holdDays) : 30;

  if (name.length < 2) throw new ResponseError(400, "Influencer name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ResponseError(400, "Valid influencer email is required");
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new ResponseError(400, "Code must be 3-40 letters, numbers, or dashes");
  if (!(["fixed", "percentage"] as string[]).includes(commissionType || "")) throw new ResponseError(400, "Invalid commission type");
  if (!(["fixed", "percentage"] as string[]).includes(discountType || "")) throw new ResponseError(400, "Invalid discount type");
  if (!Number.isFinite(commissionValue) || commissionValue <= 0) throw new ResponseError(400, "Commission must be greater than zero");
  if (!Number.isFinite(discountValue) || discountValue <= 0) throw new ResponseError(400, "Discount must be greater than zero");
  if (commissionType === "percentage" && commissionValue > 100) throw new ResponseError(400, "Commission percentage cannot exceed 100%");
  if (discountType === "percentage" && discountValue > 100) throw new ResponseError(400, "Discount percentage cannot exceed 100%");
  if (holdDays < 0 || holdDays > 180) throw new ResponseError(400, "Hold period must be between 0 and 180 days");

  return {
    name,
    email,
    code,
    commissionType: commissionType as CommissionType,
    commissionValue,
    discountType: discountType as DiscountType,
    discountValue,
    holdDays,
    payoutMethod: cleanText(input.payoutMethod, 80) || "manual",
    payoutContact: cleanText(input.payoutContact, 254) || email,
    notes: cleanText(input.notes, 2000) || null
  };
}

async function createPartner(admin: User, input: NonNullable<AdminRequest["partner"]>) {
  const data = validatePartner(input);

  const { data: existingCode, error: codeLookupError } = await supabase
    .from("referral_codes")
    .select("id")
    .ilike("code", data.code)
    .maybeSingle();
  if (codeLookupError) throw codeLookupError;
  if (existingCode) throw new ResponseError(409, "That referral code already exists");

  const { data: existingPartner, error: partnerLookupError } = await supabase
    .from("referral_partners")
    .select("id")
    .ilike("email", data.email)
    .maybeSingle();
  if (partnerLookupError) throw partnerLookupError;
  if (existingPartner) throw new ResponseError(409, "An influencer with that email already exists");

  const partnerId = crypto.randomUUID();
  const coupon = await stripe.coupons.create({
    duration: "forever",
    name: `${data.code} influencer discount`,
    ...(data.discountType === "fixed"
      ? { amount_off: Math.round(data.discountValue * 100), currency: "usd" }
      : { percent_off: data.discountValue }),
    applies_to: {
      products: [PLAN_DEFINITIONS.plus.productId, PLAN_DEFINITIONS.pro.productId]
    },
    metadata: {
      referral_partner_id: partnerId,
      referral_code: data.code
    }
  });

  let promotionCode: Stripe.PromotionCode | null = null;
  try {
    promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: data.code,
      restrictions: { first_time_transaction: true },
      metadata: {
        referral_partner_id: partnerId,
        referral_code: data.code
      }
    });

    const { data: partner, error: partnerError } = await supabase
      .from("referral_partners")
      .insert({
        id: partnerId,
        name: data.name,
        email: data.email,
        commission_type: data.commissionType,
        commission_amount_cents: data.commissionType === "fixed" ? Math.round(data.commissionValue * 100) : null,
        commission_rate_bps: data.commissionType === "percentage" ? Math.round(data.commissionValue * 100) : null,
        discount_type: data.discountType,
        discount_amount_cents: data.discountType === "fixed" ? Math.round(data.discountValue * 100) : null,
        discount_percent: data.discountType === "percentage" ? Math.round(data.discountValue) : null,
        hold_days: data.holdDays,
        payout_method: data.payoutMethod,
        payout_contact: data.payoutContact,
        notes: data.notes,
        stripe_coupon_id: coupon.id,
        created_by: admin.id
      })
      .select("*")
      .single();
    if (partnerError) throw partnerError;

    const { data: referralCode, error: referralCodeError } = await supabase
      .from("referral_codes")
      .insert({
        partner_id: partnerId,
        code: data.code,
        stripe_promotion_code_id: promotionCode.id,
        created_by: admin.id
      })
      .select("*")
      .single();
    if (referralCodeError) throw referralCodeError;

    await supabase.from("referral_audit_events").insert({
      actor_user_id: admin.id,
      action: "partner.created",
      entity_type: "partner",
      entity_id: partnerId,
      metadata: {
        code: data.code,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promotionCode.id
      }
    });

    return { partner, code: referralCode };
  } catch (error) {
    if (promotionCode) await stripe.promotionCodes.update(promotionCode.id, { active: false }).catch(() => undefined);
    await stripe.coupons.del(coupon.id).catch(() => undefined);
    throw error;
  }
}

async function setCodeStatus(admin: User, codeId: string, active: boolean) {
  const { data: code, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("id", codeId)
    .single();
  if (error || !code) throw new ResponseError(404, "Referral code not found");

  await stripe.promotionCodes.update(code.stripe_promotion_code_id, { active });

  const { data: updated, error: updateError } = await supabase
    .from("referral_codes")
    .update({ status: active ? "active" : "paused", updated_at: new Date().toISOString() })
    .eq("id", codeId)
    .select("*")
    .single();
  if (updateError) throw updateError;

  await supabase.from("referral_audit_events").insert({
    actor_user_id: admin.id,
    action: active ? "code.activated" : "code.paused",
    entity_type: "code",
    entity_id: codeId,
    metadata: { code: code.code }
  });

  return updated;
}

async function recordPayout(admin: User, input: NonNullable<AdminRequest["payout"]>) {
  const partnerId = cleanText(input.partnerId, 60);
  const amountCents = Number(input.amountCents);
  const currency = cleanText(input.currency, 3).toLowerCase() || "usd";
  const method = cleanText(input.method, 80);
  const reference = cleanText(input.reference, 200);
  const notes = cleanText(input.notes, 2000);
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

  if (!partnerId) throw new ResponseError(400, "Influencer is required");
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new ResponseError(400, "Payout amount must be positive");
  if (!/^[a-z]{3}$/.test(currency)) throw new ResponseError(400, "Invalid payout currency");
  if (!method) throw new ResponseError(400, "Payout method is required");
  if (!reference) throw new ResponseError(400, "Transaction reference is required");
  if (Number.isNaN(paidAt.getTime()) || paidAt > new Date()) throw new ResponseError(400, "Invalid payout date");

  const { data, error } = await supabase.rpc("record_referral_payout", {
    p_partner_id: partnerId,
    p_amount_cents: amountCents,
    p_currency: currency,
    p_payout_method: method,
    p_payout_reference: reference,
    p_notes: notes || null,
    p_paid_at: paidAt.toISOString(),
    p_actor_user_id: admin.id
  });
  if (error) throw new ResponseError(400, "Unable to record payout");
  return { payoutId: data };
}

async function getDashboard() {
  const [partnersResult, attributionsResult, ledgerResult, payoutsResult, auditResult] = await Promise.all([
    supabase.from("referral_partners").select("*, referral_codes(*)").order("created_at", { ascending: false }),
    supabase.from("referral_attributions").select("*, referral_partners(name, email), referral_codes(code)").order("attributed_at", { ascending: false }).limit(200),
    supabase.from("referral_ledger_entries").select("*, referral_partners(name), referral_codes(code)").order("created_at", { ascending: false }).limit(500),
    supabase.from("referral_payouts").select("*, referral_partners(name, email)").order("paid_at", { ascending: false }).limit(200),
    supabase.from("referral_audit_events").select("*").order("created_at", { ascending: false }).limit(200)
  ]);

  for (const result of [partnersResult, attributionsResult, ledgerResult, payoutsResult, auditResult]) {
    if (result.error) throw result.error;
  }

  const attributedUserIds = [...new Set(
    (attributionsResult.data || [])
      .map((attribution) => attribution.supabase_user_id)
      .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
  )];
  const attributedUsersResult = attributedUserIds.length > 0
    ? await supabase.from("auth_users").select("auth0_id, email").in("auth0_id", attributedUserIds)
    : { data: [], error: null };
  if (attributedUsersResult.error) throw attributedUsersResult.error;

  const emailByUserId = new Map(
    (attributedUsersResult.data || []).map((user) => [user.auth0_id, user.email])
  );
  const attributions = (attributionsResult.data || []).map((attribution) => ({
    ...attribution,
    customer_email: attribution.supabase_user_id
      ? emailByUserId.get(attribution.supabase_user_id) || null
      : null
  }));

  const now = Date.now();
  const balanceByPartner = new Map<string, { pending: number; payable: number; earned: number; reversed: number; paid: number }>();
  for (const entry of ledgerResult.data || []) {
    const balance = balanceByPartner.get(entry.partner_id) || { pending: 0, payable: 0, earned: 0, reversed: 0, paid: 0 };
    if (entry.entry_type === "commission") balance.earned += entry.amount_cents;
    if (entry.entry_type === "reversal") balance.reversed += Math.abs(entry.amount_cents);
    if (entry.entry_type === "payout") balance.paid += Math.abs(entry.amount_cents);
    if (new Date(entry.available_at).getTime() <= now) balance.payable += entry.amount_cents;
    else balance.pending += entry.amount_cents;
    balanceByPartner.set(entry.partner_id, balance);
  }

  const partners = (partnersResult.data || []).map((partner) => ({
    ...partner,
    balances: balanceByPartner.get(partner.id) || { pending: 0, payable: 0, earned: 0, reversed: 0, paid: 0 }
  }));

  return {
    partners,
    attributions,
    ledger: ledgerResult.data || [],
    payouts: payoutsResult.data || [],
    audit: auditResult.data || [],
    stats: {
      activePartners: partners.filter((partner) => partner.status === "active").length,
      recordedReferrals: attributions.length,
      paidConversions: (ledgerResult.data || []).filter((entry) => entry.entry_type === "commission").length,
      pendingCents: partners.reduce((sum, partner) => sum + Math.max(0, partner.balances.pending), 0),
      payableCents: partners.reduce((sum, partner) => sum + Math.max(0, partner.balances.payable), 0)
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = await requireReferralAdmin(req);
    const body = await req.json() as AdminRequest;

    switch (body.action) {
      case "get_dashboard":
        return json({ dashboard: await getDashboard() });
      case "create_partner":
        if (!body.partner) throw new ResponseError(400, "Influencer details are required");
        return json({ result: await createPartner(admin, body.partner) }, 201);
      case "set_code_status":
        if (!body.codeId || typeof body.active !== "boolean") throw new ResponseError(400, "Code and status are required");
        return json({ code: await setCodeStatus(admin, body.codeId, body.active) });
      case "record_payout":
        if (!body.payout) throw new ResponseError(400, "Payout details are required");
        return json({ result: await recordPayout(admin, body.payout) }, 201);
      default:
        throw new ResponseError(400, "Invalid action");
    }
  } catch (error) {
    const status = error instanceof ResponseError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[referral-admin] request failed", status);
    return json({ error: status === 500 ? "Referral management request failed" : message }, status);
  }
});
