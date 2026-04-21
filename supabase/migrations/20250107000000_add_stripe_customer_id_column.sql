-- Migration: Add dedicated stripe_customer_id column to auth_users table
-- Purpose: Fix Stripe customer duplication by enforcing uniqueness constraint
-- Date: 2025-01-07

-- Step 1: Add the new column (nullable initially to handle existing data)
ALTER TABLE public.auth_users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Step 2: Migrate existing stripe_customer_id from metadata JSONB to new column
UPDATE public.auth_users
SET stripe_customer_id = metadata->>'stripe_customer_id'
WHERE metadata->>'stripe_customer_id' IS NOT NULL
  AND metadata->>'stripe_customer_id' != ''
  AND stripe_customer_id IS NULL;

-- Step 3: Add unique constraint to prevent duplicates
-- Note: Use WHERE clause to allow multiple NULL values (for users without Stripe customers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_stripe_customer_id
ON public.auth_users(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Step 4: Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_email_lower
ON public.auth_users(LOWER(email));

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.auth_users.stripe_customer_id IS
'Stripe customer ID - unique identifier from Stripe. Migrated from metadata JSONB field to enforce uniqueness.';

-- Verification query (optional, comment out for production):
-- SELECT
--   COUNT(*) as total_users,
--   COUNT(stripe_customer_id) as users_with_stripe,
--   COUNT(DISTINCT stripe_customer_id) as unique_stripe_customers
-- FROM public.auth_users;
