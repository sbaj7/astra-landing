-- Migration: Add manual subscription management columns
-- Description: Enables administrators to manually grant Pro/Plus subscriptions to specific users
-- Author: Astra MD Admin System
-- Date: 2025-01-08

-- Add columns for manual subscription management to auth_users table
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS manual_subscription_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_subscription_plan TEXT CHECK (manual_subscription_plan IN ('plus', 'pro', NULL)),
ADD COLUMN IF NOT EXISTS manual_subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_subscription_granted_by TEXT,
ADD COLUMN IF NOT EXISTS manual_subscription_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_subscription_notes TEXT,
ADD COLUMN IF NOT EXISTS manual_subscription_stripe_synced BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on manual subscriptions
CREATE INDEX IF NOT EXISTS idx_auth_users_manual_subscription
ON auth_users(manual_subscription_enabled)
WHERE manual_subscription_enabled = TRUE;

-- Create index for expiration checks
CREATE INDEX IF NOT EXISTS idx_auth_users_manual_subscription_expires
ON auth_users(manual_subscription_expires_at)
WHERE manual_subscription_expires_at IS NOT NULL;

-- Add comment explaining the manual subscription system
COMMENT ON COLUMN auth_users.manual_subscription_enabled IS 'When TRUE, this user has been manually granted a subscription by an administrator';
COMMENT ON COLUMN auth_users.manual_subscription_plan IS 'The manually granted plan type: plus or pro';
COMMENT ON COLUMN auth_users.manual_subscription_expires_at IS 'Optional expiration date for the manual subscription';
COMMENT ON COLUMN auth_users.manual_subscription_granted_by IS 'Email or ID of the administrator who granted this subscription';
COMMENT ON COLUMN auth_users.manual_subscription_granted_at IS 'Timestamp when the manual subscription was granted';
COMMENT ON COLUMN auth_users.manual_subscription_notes IS 'Admin notes explaining why this subscription was manually granted';
COMMENT ON COLUMN auth_users.manual_subscription_stripe_synced IS 'Whether this manual subscription has been synced to Stripe with a 100% discount';

-- Create audit log table for tracking subscription changes
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('grant', 'revoke', 'expire', 'sync_stripe')),
    plan_type TEXT,
    performed_by TEXT NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    metadata JSONB
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_subscription_audit_log_user_id ON subscription_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_log_performed_at ON subscription_audit_log(performed_at DESC);

-- Function to automatically expire manual subscriptions
CREATE OR REPLACE FUNCTION check_manual_subscription_expiration()
RETURNS void AS $$
BEGIN
    -- Update expired manual subscriptions
    UPDATE auth_users
    SET
        manual_subscription_enabled = FALSE,
        subscription_status = 'free',
        updated_at = NOW()
    WHERE
        manual_subscription_enabled = TRUE
        AND manual_subscription_expires_at IS NOT NULL
        AND manual_subscription_expires_at < NOW();

    -- Log expirations to audit log
    INSERT INTO subscription_audit_log (user_id, action, plan_type, performed_by, notes)
    SELECT
        id,
        'expire',
        manual_subscription_plan,
        'system',
        'Automatic expiration of manual subscription'
    FROM auth_users
    WHERE
        manual_subscription_enabled = FALSE
        AND manual_subscription_expires_at IS NOT NULL
        AND manual_subscription_expires_at < NOW()
        AND updated_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to the service role
GRANT ALL ON subscription_audit_log TO service_role;
GRANT EXECUTE ON FUNCTION check_manual_subscription_expiration TO service_role;

-- Add RLS policies for subscription_audit_log (admin only access)
ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert audit logs
CREATE POLICY service_role_insert_audit_log ON subscription_audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- Policy: Only service role can read audit logs
CREATE POLICY service_role_select_audit_log ON subscription_audit_log
    FOR SELECT
    TO service_role
    USING (TRUE);