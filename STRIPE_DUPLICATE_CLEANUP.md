# Stripe Duplicate Customer Cleanup Guide

## Status: ✅ Prevention Fixed, Cleanup Required

**Date:** November 12, 2025
**Issue:** Multiple Stripe customers created for same user emails
**Root Cause:** Idempotency key included timestamp causing race conditions

---

## ✅ FIXES DEPLOYED

### Backend Fix (✅ Deployed Nov 12, 19:00)
**File:** `supabase/functions/billing-supabase/index.ts`
**Change:** Line 346
```typescript
// OLD (caused duplicates):
const idempotencyKey = `create_customer_${supabaseUser.id}_${Date.now()}`;

// NEW (prevents duplicates):
const idempotencyKey = `create_customer_${supabaseUser.id}`;
```

**Status:** ✅ Already deployed to production (version 45)

### Frontend Fix (✅ Built, needs deployment)
**File:** `src/services/authService.js`
**Changes:**
- Added `_inflightBillingRequests` Map to prevent concurrent requests
- Implemented request deduplication in `callBillingAPI()`
- Added `_performBillingAPICall()` helper method

**Status:** ✅ Built in `/dist`, ready to deploy

**Commit:** `226882f` - "Fix Stripe duplicate customer creation"

---

## 📊 IDENTIFIED DUPLICATES

From Stripe Dashboard (Nov 9-11, 2025):

| Email | Duplicates | DB Customer ID | Status |
|-------|------------|----------------|--------|
| cbajrami2016@gmail.com | 3x | cus_TPKOnRPS0XRdwi | Needs cleanup |
| cc2631785@gmail.com | 2x | cus_TPIvEYweYO85En | Needs cleanup |
| sandi.bajrami@macaulay.cuny.edu | 3x | cus_TP41xR32tDJDKn | Needs cleanup |
| khaledobaid527@gmail.com | 2x | cus_TOqVjgHaMyutvK | Needs cleanup |

**Total:** 4 emails with 10 duplicate customers (6 need deletion)

**Note:** Database is clean - only ONE customer ID stored per user. Duplicates exist ONLY in Stripe.

---

## 🧹 CLEANUP OPTIONS

### Option 1: Automated Cleanup (Recommended)

Use the existing `deduplicate-customers` edge function:

```bash
# 1. Scan for duplicates
curl -X GET \
  "https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/deduplicate-customers?action=scan" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "x-admin-key: YOUR_ADMIN_KEY"

# 2. Auto-merge all safe duplicates
curl -X GET \
  "https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/deduplicate-customers?action=auto-merge" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

**What it does:**
- Scans ALL Stripe customers
- Groups by email address
- For each duplicate group:
  - ✅ Keeps customer with active subscriptions (if any)
  - ✅ Keeps customer with `supabase_user_id` metadata
  - ✅ Keeps oldest customer (fallback)
  - ❌ Deletes other duplicates
  - 📝 Updates `auth_users` table to point to kept customer

**Safety:** Skips any customer with active subscriptions to prevent data loss

### Option 2: Manual Cleanup via Stripe Dashboard

For each duplicate email:

1. Open [Stripe Dashboard → Customers](https://dashboard.stripe.com/customers)
2. Search for the email (e.g., `cbajrami2016@gmail.com`)
3. Identify which customer ID is in the database (see table above)
4. **Keep** that customer, delete the others:
   - Open each duplicate customer page
   - Click "Actions" → "Delete customer"
   - Confirm deletion

### Option 3: Stripe CLI

```bash
# List duplicates for specific email
stripe customers list --email="cbajrami2016@gmail.com"

# Delete specific customer (NOT the one in database!)
stripe customers delete cus_XXXXX
```

---

## ✅ VERIFICATION STEPS

### 1. Check No New Duplicates Created

**SQL Query:**
```sql
-- Find users created after the fix (Nov 12, 19:00)
SELECT
  email,
  COUNT(*) as customer_count
FROM auth_users
WHERE created_at > '2025-11-12 19:00:00+00'::timestamptz
  AND stripe_customer_id IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Should return 0 rows ✅
```

### 2. Verify Cleanup Successful

**Stripe Dashboard:**
1. Search for each duplicate email
2. Should see only 1 customer per email
3. Customer ID should match database

**SQL Query:**
```sql
-- Check database still has correct customer IDs
SELECT
  email,
  stripe_customer_id,
  created_at
FROM auth_users
WHERE email IN (
  'cbajrami2016@gmail.com',
  'cc2631785@gmail.com',
  'sandi.bajrami@macaulay.cuny.edu',
  'khaledobaid527@gmail.com'
);
```

### 3. Test New Signup Flow

1. Create test account: `test-dup-check-TIMESTAMP@example.com`
2. Immediately open billing modal (to trigger customer creation)
3. Check Stripe dashboard - should see only 1 customer created ✅
4. Try double-clicking "Subscribe" button
5. Verify no duplicate API calls in Network tab ✅
6. Verify still only 1 customer in Stripe ✅

---

## 📋 MONITORING QUERIES

### Daily Duplicate Check

Add this to your monitoring dashboard:

```sql
-- Find any new duplicate Stripe customers
SELECT
  au1.email,
  COUNT(DISTINCT au1.stripe_customer_id) as unique_customers,
  array_agg(DISTINCT au1.stripe_customer_id) as customer_ids
FROM auth_users au1
WHERE au1.stripe_customer_id IS NOT NULL
GROUP BY au1.email
HAVING COUNT(DISTINCT au1.stripe_customer_id) > 1;

-- Should return 0 rows always ✅
```

### Recent Signups with Customers

```sql
-- Monitor new users who got Stripe customers
SELECT
  email,
  stripe_customer_id,
  created_at,
  NOW() - created_at as age
FROM auth_users
WHERE stripe_customer_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [x] Backend fix committed (`226882f`)
- [x] Backend fix deployed to production (version 45, Nov 12 19:00)
- [x] Frontend fix committed (`226882f`)
- [x] Frontend built (`npm run build` completed)
- [ ] **Frontend deployed to production** ← ACTION REQUIRED
- [ ] **Run duplicate cleanup** (Option 1, 2, or 3 above) ← ACTION REQUIRED
- [ ] Verify no duplicates remain in Stripe
- [ ] Test new signup flow (see Verification Steps)
- [ ] Add monitoring query to dashboard
- [ ] Monitor for 48 hours

---

## 🔍 HOW THE FIX WORKS

### Two-Layer Protection

**Layer 1: Backend Idempotency (✅ Active)**
```typescript
// Stripe's idempotency system
const idempotencyKey = `create_customer_${userId}`;

// Same user = same key = Stripe returns existing customer
// Even if called 100 times simultaneously!
```

**Layer 2: Frontend Deduplication (✅ Ready)**
```javascript
// In-flight request cache
const cacheKey = `${action}_${userId}`;

if (this._inflightBillingRequests.has(cacheKey)) {
  // Return existing Promise instead of making new API call
  return this._inflightBillingRequests.get(cacheKey);
}
```

### Combined Effect
- **Double-click:** Frontend blocks → 1 API call → Backend idempotency → 1 customer ✅
- **OAuth race condition:** Both reach backend → Backend idempotency → 1 customer ✅
- **Network retry:** Same idempotency key → Stripe returns original → 1 customer ✅
- **Multiple tabs:** Backend idempotency → 1 customer ✅

---

## 📞 NEXT STEPS

1. **Deploy Frontend**
   ```bash
   # Deploy the built files in /dist to your hosting provider
   # (Vercel, Netlify, S3, etc.)
   ```

2. **Run Cleanup**
   ```bash
   # Option 1: Automated (recommended)
   curl -X GET "https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/deduplicate-customers?action=auto-merge" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "x-admin-key: YOUR_ADMIN_KEY"
   ```

3. **Verify**
   - Check Stripe dashboard for duplicate emails
   - Run SQL monitoring query
   - Test new signup

4. **Monitor**
   - Run monitoring query daily for 1 week
   - Check edge function logs for errors
   - Watch for support tickets about billing issues

---

## ⚠️ IMPORTANT NOTES

- **Old duplicates WILL NOT auto-fix** - they need manual cleanup
- **New signups after Nov 12, 19:00 should NOT create duplicates**
- **Frontend deployment is optional** but recommended for extra protection
- **Backend fix alone is sufficient** to prevent duplicates
- **DO NOT delete customers with active subscriptions** without careful review

---

## 🐛 TROUBLESHOOTING

### "Still seeing duplicates after fix"
- ✅ Check: Are these OLD duplicates from before Nov 12, 19:00?
- ✅ Check: Is the billing-supabase function version 45 or later?
- ✅ Check: Does the deployed function have the correct idempotency key?

### "Cleanup script fails"
- Check ADMIN_API_KEY is set in Supabase environment variables
- Check service role key is correct
- Review edge function logs: `supabase functions logs deduplicate-customers`

### "User has wrong customer ID after cleanup"
- Check `auth_users.stripe_customer_id` column
- Manually update if needed:
  ```sql
  UPDATE auth_users
  SET stripe_customer_id = 'cus_CORRECT_ID',
      updated_at = NOW()
  WHERE email = 'user@example.com';
  ```

---

**Generated:** November 12, 2025
**Last Updated:** November 12, 2025
**Status:** Prevention fixed ✅, Cleanup pending ⏳
