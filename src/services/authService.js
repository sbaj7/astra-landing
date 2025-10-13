import Cookies from 'js-cookie';
import supabase from './supabaseClient.js';

// API configuration for production Supabase
const AUTH_API_URL = 'https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/auth-management';
const BILLING_API_URL = (import.meta?.env?.VITE_BILLING_API_URL) || 'https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/billing-supabase';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod2l0Zmd0cGZzempqb2N6YnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjY5ODksImV4cCI6MjA2NTg0Mjk4OX0.b8CBToFGkvPUcxwxJL4ZnFIe4tanZigHdGp9BKzLBM8';

const PLAN_PRICE_IDS = {
  plus: import.meta.env.VITE_STRIPE_PLUS_PRICE_ID,
  pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID
};

const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(PLAN_PRICE_IDS)
    .filter(([, priceId]) => Boolean(priceId))
    .map(([planKey, priceId]) => [priceId, planKey])
);

const getPlanPriceId = (planKey) => {
  const priceId = PLAN_PRICE_IDS[planKey];
  if (!priceId) {
    throw new Error(`Missing Stripe price id for plan "${planKey}". Ensure VITE_STRIPE_${planKey?.toUpperCase?.() || planKey}_PRICE_ID is set.`);
  }
  return priceId;
};

console.log('🔧 Auth Service: Production mode');

// Helper function to validate and ensure UUID format
const validateAndFormatUserId = (userId) => {
  if (!userId) return null;

  const userIdStr = String(userId).trim();

  // Check if it's already a valid UUID format (36 chars with hyphens)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userIdStr)) {
    return userIdStr;
  }

  // If it's a Supabase auth user ID, it should already be UUID format
  // Log for debugging what we're getting
  console.warn('🚨 User ID not in UUID format:', userIdStr, 'Length:', userIdStr.length);

  return userIdStr; // Return as-is and let the database handle it
};

class AuthService {
  constructor() {
    this.anonymousId = this.getOrCreateAnonymousId();
    this.currentSession = null;
    this.currentSupabaseUser = null;
    this.cachedSupabaseProfile = null;
  }

  getAnonymousLimitStorageKey() {
    return `astra_limit_${this.anonymousId}`;
  }

  getDefaultAnonymousResetTimestamp() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  normalizeAnonymousLimit(limit) {
    if (!limit) return null;
    let used = 0;
    if (typeof limit.used === 'number' && Number.isFinite(limit.used)) {
      used = limit.used;
    } else if (typeof limit.remaining === 'number' && Number.isFinite(limit.remaining)) {
      used = 5 - limit.remaining;
    }
    used = Math.max(0, Math.min(5, Math.floor(used)));

    let resetAt = typeof limit.reset_at === 'string' ? limit.reset_at : null;
    const resetTime = resetAt ? new Date(resetAt) : null;
    if (!resetAt || Number.isNaN(resetTime?.getTime())) {
      resetAt = this.getDefaultAnonymousResetTimestamp();
    }

    return {
      used,
      remaining: Math.max(0, 5 - used),
      reset_at: resetAt
    };
  }

  _setAnonymousLimitCache(limit) {
    if (typeof window === 'undefined') return this.normalizeAnonymousLimit(limit);
    try {
      const normalized = this.normalizeAnonymousLimit(limit);
      if (!normalized) return null;
      const payload = {
        used: normalized.used,
        reset_at: normalized.reset_at
      };
      localStorage.setItem(this.getAnonymousLimitStorageKey(), JSON.stringify(payload));
      return normalized;
    } catch (error) {
      console.warn('Failed to persist anonymous usage limit', error);
      return this.normalizeAnonymousLimit(limit);
    }
  }

  _getAnonymousLimitCache() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.getAnonymousLimitStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const normalized = this.normalizeAnonymousLimit(parsed);
      if (!normalized) return null;
      const resetTime = new Date(normalized.reset_at);
      if (Number.isNaN(resetTime.getTime()) || resetTime <= new Date()) {
        localStorage.removeItem(this.getAnonymousLimitStorageKey());
        return null;
      }
      return normalized;
    } catch (error) {
      console.warn('Failed to read cached anonymous usage limit', error);
      return null;
    }
  }

  _bumpAnonymousLimitCache() {
    const cached = this._getAnonymousLimitCache();
    const resetAt = cached?.reset_at && new Date(cached.reset_at) > new Date()
      ? cached.reset_at
      : this.getDefaultAnonymousResetTimestamp();
    const nextUsed = Math.min(5, (cached?.used || 0) + 1);
    return this._setAnonymousLimitCache({ used: nextUsed, reset_at: resetAt });
  }

  buildUsagePayload(supabaseUser = this.currentSupabaseUser) {
    if (supabaseUser && supabaseUser.id) {
      const payload = {
        supabase_user: supabaseUser
      };
      const normalizedId = validateAndFormatUserId(this.cachedSupabaseProfile?.id);
      if (normalizedId) {
        payload.user_id = normalizedId;
      }
      return payload;
    }
    return { anonymous_id: this.anonymousId };
  }

  getCachedAnonymousLimitState() {
    return this._getAnonymousLimitCache();
  }

  setCachedAnonymousLimitState(limit) {
    return this._setAnonymousLimitCache(limit);
  }

  incrementCachedAnonymousUsage() {
    return this._bumpAnonymousLimitCache();
  }

  updateAuthContext({ session, user }) {
    this.currentSession = session || null;
    this.currentSupabaseUser = user || null;
    if (!user) {
      this.cachedSupabaseProfile = null;
    }
  }

  getAuthHeaders() {
    const bearerToken = this.currentSession?.access_token || API_KEY;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`,
      apikey: API_KEY
    };
  }

  normalizeSupabaseUser(supabaseUser = this.currentSupabaseUser) {
    if (!supabaseUser) return null;

    const metadata =
      (supabaseUser.user_metadata && typeof supabaseUser.user_metadata === 'object'
        ? supabaseUser.user_metadata
        : {}) || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      full_name:
        metadata.full_name ||
        metadata.name ||
        supabaseUser.email ||
        'User',
      avatar_url: metadata.avatar_url || metadata.picture || null,
      metadata
    };
  }

  getOrCreateAnonymousId() {
    let id = Cookies.get('astra_anonymous_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      Cookies.set('astra_anonymous_id', id, { expires: 365 });
    }
    return id;
  }

  async callAuthAPI(endpoint, data = {}) {
    const url = `${AUTH_API_URL}/${endpoint}`;

    console.log(`📡 Calling API: ${endpoint}`, url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const responseText = await response.text();
      console.log(`📥 Response from ${endpoint}:`, response.status, responseText);

      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
          console.error(`❌ API Error Details:`, errorDetails);
        } catch (e) {
          errorDetails = { error: responseText };
        }
        const error = new Error(`API error: ${response.status} - ${JSON.stringify(errorDetails)}`);
        error.status = response.status;
        error.details = errorDetails;
        throw error;
      }

      try {
        const payload = JSON.parse(responseText);
        if (endpoint === 'check-limit' && data?.anonymous_id) {
          this._setAnonymousLimitCache(payload);
        }
        return payload;
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error(`❌ Failed to call ${endpoint}:`, error);
      // Fallback to localStorage for anonymous users
      return this.handleLocalFallback(endpoint, data);
    }
  }

  async callBillingAPI(action, data = {}) {
    if (!BILLING_API_URL) {
      throw new Error('Billing API is not configured');
    }

    console.log(`💳 Calling Billing API: ${action}`, BILLING_API_URL);

    try {
      const response = await fetch(BILLING_API_URL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action,
          ...data
        })
      });

      const payload = await response.json();
      console.log(`📥 Billing Response from ${action}:`, response.status, payload);

      if (!response.ok) {
        throw new Error(payload?.error || 'Billing API error');
      }
      return payload;
    } catch (error) {
      console.error('💳 Billing API call failed:', error);
      throw error;
    }
  }

  async checkUsageLimit(supabaseUser = this.currentSupabaseUser) {
    const payload = this.buildUsagePayload(supabaseUser);
    const result = await this.callAuthAPI('check-limit', payload);
    return result;
  }

  async incrementUsage(supabaseUser = this.currentSupabaseUser) {
    const payload = this.buildUsagePayload(supabaseUser);
    try {
      return await this.callAuthAPI('increment-usage', payload);
    } catch (error) {
      if (error?.status === 429) {
        error.code = 'LIMIT_REACHED';
      }
      throw error;
    }
  }

  async checkAnonymousLimit() {
    return await this.checkUsageLimit(null);
  }

  async incrementAnonymousUsage() {
    return await this.incrementUsage(null);
  }

  async syncUserWithSupabase(supabaseUser = this.currentSupabaseUser) {
    if (!supabaseUser) return null;

    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);

    console.log('🔄 Syncing Supabase user with backend:', normalizedUser);

    try {
      const response = await this.callAuthAPI('sync-user', {
        supabase_user: normalizedUser,
        anonymous_id: this.anonymousId
      });

      console.log('✅ User sync successful:', response);
      if (response?.user) {
        this.cachedSupabaseProfile = response.user;
      }
      return response.user || this.cachedSupabaseProfile;
    } catch (error) {
      console.error('❌ User sync failed:', error);
      console.error('Supabase user object:', normalizedUser);
      return this.cachedSupabaseProfile;
    }
  }

  async saveChatSession(title, messages, mode, supabaseUser) {
    let userId = null;
    if (supabaseUser) {
      const user = await this.syncUserWithSupabase(supabaseUser);
      userId = user?.id;
    }

    return await this.callAuthAPI('save-session', {
      title,
      messages,
      mode,
      user_id: userId,
      anonymous_id: !userId ? this.anonymousId : null
    });
  }

  async getChatSessions(supabaseUser, limit = 20) {
    let userId = null;
    if (supabaseUser) {
      const user = await this.syncUserWithSupabase(supabaseUser);
      userId = user?.id;
    }

    const response = await this.callAuthAPI('get-sessions', {
      user_id: userId,
      anonymous_id: !userId ? this.anonymousId : null,
      limit
    });

    return response.sessions || [];
  }

  async deleteChatSession(sessionId, supabaseUser) {
    if (!sessionId) {
      throw new Error('sessionId required for deletion');
    }

    let userId = null;
    if (supabaseUser) {
      const user = await this.syncUserWithSupabase(supabaseUser);
      userId = user?.id;
    }

    return await this.callAuthAPI('delete-session', {
      session_id: sessionId,
      user_id: userId,
      anonymous_id: !userId ? this.anonymousId : null
    });
  }

  // Local storage fallbacks for when API is unavailable
  handleLocalFallback(endpoint, data) {
    const now = new Date();

    // Handle sync-user endpoint
    if (endpoint === 'sync-user') {
      console.warn('⚠️ User sync failed - edge function may not be deployed or accessible');
      console.warn('Please ensure auth-management function is deployed to Supabase');
      // Return a dummy response to prevent crashes
      return {
        user: {
          id: 'local_' + Math.random().toString(36).substr(2, 9),
          email: data.supabase_user?.email,
          supabase_id: data.supabase_user?.id
        }
      };
    }

    if (endpoint === 'check-limit') {
      if (data?.supabase_user?.id || data?.user_id) {
        return {
          plan: 'free',
          limit: 10,
          remaining: 10,
          used: 0,
          reset_at: this.getDefaultAnonymousResetTimestamp(),
          is_unlimited: false
        };
      }
      const cached = this._getAnonymousLimitCache();
      if (cached) return cached;
      const fresh = this._setAnonymousLimitCache({ used: 0, reset_at: this.getDefaultAnonymousResetTimestamp() });
      return fresh || { used: 0, remaining: 5, reset_at: this.getDefaultAnonymousResetTimestamp(), plan: 'guest', limit: 5, is_unlimited: false };
    }

    if (endpoint === 'increment-usage') {
      if (data?.supabase_user?.id || data?.user_id) {
        return {
          success: true,
          plan: 'free',
          limit: 10,
          remaining: Math.max(0, 9),
          used: 1,
          reset_at: this.getDefaultAnonymousResetTimestamp(),
          is_unlimited: false
        };
      }
      const updated = this._bumpAnonymousLimitCache();
      return updated || { used: 1, remaining: 4, reset_at: this.getDefaultAnonymousResetTimestamp(), plan: 'guest', limit: 5, is_unlimited: false };
    }

    return {};
  }

  getTimeUntilReset(resetAt) {
    const resetTime = new Date(resetAt);
    const now = new Date();
    const diff = resetTime - now;

    if (diff <= 0) return 'Now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  async createCheckoutSession(planKey, supabaseUser, returnUrl) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    console.log('💳 Creating checkout session for plan:', planKey);

    const baseReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    return await this.callBillingAPI('create_checkout_session', {
      supabase_user: normalizedUser,
      planKey: planKey,
      return_url: baseReturnUrl
    });
  }

  async createPortalSession(supabaseUser, returnUrl) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    console.log('🚪 Creating portal session for user');

    const baseReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    return await this.callBillingAPI('create_portal_session', {
      supabase_user: normalizedUser,
      return_url: baseReturnUrl
    });
  }

  async getSubscriptionStatus(supabaseUser) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    console.log('📊 Getting subscription status for user');

    return await this.callBillingAPI('get_subscription', {
      supabase_user: normalizedUser
    });
  }

  async updateUserProfile(supabaseUser, updates = {}) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for profile updates');

    return await this.callAuthAPI('update-profile', {
      supabase_user: normalizedUser,
      ...updates
    });
  }
}

export default new AuthService();
