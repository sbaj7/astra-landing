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
    this._inflightBillingRequests = new Map(); // Track in-progress billing requests
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
      used = 3 - limit.remaining;
    }
    used = Math.max(0, Math.min(3, Math.floor(used)));

    let resetAt = typeof limit.reset_at === 'string' ? limit.reset_at : null;
    const resetTime = resetAt ? new Date(resetAt) : null;
    if (!resetAt || Number.isNaN(resetTime?.getTime())) {
      resetAt = this.getDefaultAnonymousResetTimestamp();
    }

    return {
      used,
      remaining: Math.max(0, 3 - used),
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
    const nextUsed = Math.min(3, (cached?.used || 0) + 1);
    return this._setAnonymousLimitCache({ used: nextUsed, reset_at: resetAt });
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
      try {
        Cookies.set('astra_anonymous_id', id, { expires: 365 });
        console.log('🍪 Created new anonymous ID:', id);
      } catch (error) {
        console.error('❌ Failed to set anonymous ID cookie:', error);
        console.warn('⚠️ Cookie blocking may prevent usage tracking');
      }
    } else {
      console.log('🍪 Using existing anonymous ID:', id);
    }
    return id;
  }

  getAnonymousId() {
    // Return the anonymous ID that was created in the constructor
    // This ensures consistency across all methods
    return this.anonymousId;
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
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorDetails)}`);
      }

      try {
        const payload = JSON.parse(responseText);
        if (endpoint === 'check-limit') {
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

  /**
   * Calls billing API with retry logic and improved error handling
   * @param {string} action - The billing action to perform
   * @param {object} data - Request data
   * @param {number} retries - Number of retry attempts (default: 3)
   * @returns {Promise<object>} Response payload
   */
  async callBillingAPI(action, data = {}, retries = 3) {
    if (!BILLING_API_URL) {
      throw new Error('Billing API is not configured');
    }

    // Create a cache key based on the action and user ID to prevent duplicate requests
    const userId = data.supabase_user?.id;
    const cacheKey = userId ? `${action}_${userId}` : `${action}_anonymous`;

    // If there's already a request in progress for this action+user, return it
    if (this._inflightBillingRequests.has(cacheKey)) {
      console.log(`🔄 Returning existing in-flight billing request for: ${cacheKey}`);
      return this._inflightBillingRequests.get(cacheKey);
    }

    // Create a new request and store it in the map
    const requestPromise = this._performBillingAPICall(action, data, retries);

    this._inflightBillingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the cache entry when the request completes (success or failure)
      this._inflightBillingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal method that performs the actual billing API call with retry logic
   * @private
   */
  async _performBillingAPICall(action, data = {}, retries = 3) {
    console.log(`💳 Calling Billing API: ${action}`, BILLING_API_URL);

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(BILLING_API_URL, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            action,
            ...data
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const payload = await response.json();
        console.log(`📥 Billing Response from ${action}:`, response.status, payload);

        if (!response.ok) {
          const errorMessage = payload?.error || 'Billing API error';

          // Don't retry on client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(errorMessage);
          }

          // Server errors or rate limits should be retried
          if (attempt < retries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
            console.warn(`⚠️ Billing API error (attempt ${attempt + 1}/${retries + 1}), retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(errorMessage);
        }

        // Success!
        return payload;

      } catch (error) {
        lastError = error;

        // Handle timeout errors
        if (error.name === 'AbortError') {
          console.error(`⏱️ Billing API timeout on attempt ${attempt + 1}/${retries + 1}`);
          if (attempt < retries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('Billing API request timed out. Please try again.');
        }

        // Handle network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          console.error(`🌐 Network error on attempt ${attempt + 1}/${retries + 1}:`, error.message);
          if (attempt < retries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('Network error occurred. Please check your connection and try again.');
        }

        // For other errors, don't retry
        console.error('💳 Billing API call failed:', error);
        throw error;
      }
    }

    // If we get here, all retries failed
    console.error('💳 All billing API retry attempts failed');
    throw lastError || new Error('Billing API call failed after multiple attempts');
  }

  async checkAnonymousLimit() {
    return await this.callAuthAPI('check-limit', {
      anonymous_id: this.anonymousId
    });
  }

  async incrementAnonymousUsage() {
    return await this.callAuthAPI('increment-usage', {
      anonymous_id: this.anonymousId
    });
  }

  /**
   * Check usage limit for authenticated users
   * @param {string} userId - The authenticated user's ID (optional)
   * @returns {Promise<{remaining: number, used: number, reset_at: string}>}
   */
  async checkUserLimit(userId) {
    return await this.callAuthAPI('check-limit', {
      user_id: userId || undefined,
      anonymous_id: this.getAnonymousId()
    });
  }

  /**
   * Increment usage counter for authenticated or anonymous users
   * @param {string} userId - The authenticated user's ID (optional for anonymous users)
   * @returns {Promise<{success: boolean}>}
   */
  async incrementUserUsage(userId) {
    const payload = {};

    if (userId) {
      payload.user_id = userId;
    } else {
      const anonId = this.getAnonymousId();
      if (!anonId) {
        console.error('❌ No valid user_id or anonymous_id available for incrementUserUsage');
        throw new Error('Cannot increment usage: no valid identifier (user_id or anonymous_id)');
      }
      payload.anonymous_id = anonId;
    }

    return await this.callAuthAPI('increment-usage', payload);
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
      const cached = this._getAnonymousLimitCache();
      if (cached) return cached;
      const fresh = this._setAnonymousLimitCache({ used: 0, reset_at: this.getDefaultAnonymousResetTimestamp() });
      return fresh || { used: 0, remaining: 3, reset_at: this.getDefaultAnonymousResetTimestamp() };
    }

    if (endpoint === 'increment-usage') {
      const updated = this._bumpAnonymousLimitCache();
      return updated || { used: 1, remaining: 2, reset_at: this.getDefaultAnonymousResetTimestamp() };
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

  /**
   * Check if an email exists in Supabase Auth
   * Used for two-step authentication flow to determine sign-in vs sign-up
   * @param {string} email - Email address to check
   * @returns {Promise<{exists: boolean}>}
   */
  async checkEmailExists(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Valid email required');
    }

    console.log('📧 Checking if email exists:', email);

    try {
      const response = await fetch(
        'https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/check-email',
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ email })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        throw new Error('Failed to check email');
      }

      const data = await response.json();
      console.log('✅ Email check result:', data);
      return data;
    } catch (error) {
      console.error('❌ Email check failed:', error);
      // On error, default to showing sign-up to be safe
      return { exists: false };
    }
  }

  // ================= Manual Subscription Management =================
  // These functions allow administrators to manually grant/revoke subscriptions

  async grantManualSubscription(userEmail, plan, options = {}) {
    const { expiresAt, notes, grantedBy, syncToStripe = false } = options;

    console.log(`🎁 Granting manual ${plan} subscription to ${userEmail}`);

    const adminApiUrl = import.meta.env.VITE_ADMIN_SUBSCRIPTION_API_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-subscription-manager`;

    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY;

    if (!adminApiKey) {
      throw new Error('Admin API key not configured');
    }

    try {
      const response = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': adminApiKey
        },
        body: JSON.stringify({
          action: 'grant',
          userEmail,
          plan,
          expiresAt,
          notes,
          grantedBy: grantedBy || 'admin',
          syncToStripe
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to grant manual subscription');
      }

      const result = await response.json();
      console.log('✅ Manual subscription granted:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to grant manual subscription:', error);
      throw error;
    }
  }

  async revokeManualSubscription(userEmail, grantedBy = 'admin') {
    console.log(`🚫 Revoking manual subscription for ${userEmail}`);

    const adminApiUrl = import.meta.env.VITE_ADMIN_SUBSCRIPTION_API_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-subscription-manager`;

    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY;

    if (!adminApiKey) {
      throw new Error('Admin API key not configured');
    }

    try {
      const response = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': adminApiKey
        },
        body: JSON.stringify({
          action: 'revoke',
          userEmail,
          grantedBy
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke manual subscription');
      }

      const result = await response.json();
      console.log('✅ Manual subscription revoked:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to revoke manual subscription:', error);
      throw error;
    }
  }

  async listAllSubscriptions(page = 1, limit = 50) {
    console.log(`📋 Listing all subscriptions (page ${page})`);

    const adminApiUrl = import.meta.env.VITE_ADMIN_SUBSCRIPTION_API_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-subscription-manager`;

    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY;

    if (!adminApiKey) {
      throw new Error('Admin API key not configured');
    }

    try {
      const response = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': adminApiKey
        },
        body: JSON.stringify({
          action: 'list',
          page,
          limit
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list subscriptions');
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.data.length} subscriptions`);
      return result;
    } catch (error) {
      console.error('❌ Failed to list subscriptions:', error);
      throw error;
    }
  }

  async syncManualSubscriptionToStripe(userEmail) {
    console.log(`🔄 Syncing manual subscription to Stripe for ${userEmail}`);

    const adminApiUrl = import.meta.env.VITE_ADMIN_SUBSCRIPTION_API_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-subscription-manager`;

    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY;

    if (!adminApiKey) {
      throw new Error('Admin API key not configured');
    }

    try {
      const response = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': adminApiKey
        },
        body: JSON.stringify({
          action: 'sync_stripe',
          userEmail
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync to Stripe');
      }

      const result = await response.json();
      console.log('✅ Manual subscription synced to Stripe:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to sync to Stripe:', error);
      throw error;
    }
  }

  // Check if current user has a manual subscription
  hasManualSubscription(profile) {
    if (!profile) return false;

    const hasManual = profile.manual_subscription_enabled;
    const expiresAt = profile.manual_subscription_expires_at;

    // Check if manual subscription is valid (not expired)
    if (hasManual) {
      if (!expiresAt) return true; // No expiration
      return new Date(expiresAt) > new Date(); // Check if not expired
    }

    return false;
  }

  // Get subscription display info (for UI)
  getSubscriptionDisplayInfo(profile) {
    if (!profile) {
      return { type: 'free', plan: null, source: null };
    }

    // Check manual subscription first (takes precedence)
    if (this.hasManualSubscription(profile)) {
      return {
        type: 'paid',
        plan: profile.manual_subscription_plan,
        source: 'manual',
        grantedBy: profile.manual_subscription_granted_by,
        expiresAt: profile.manual_subscription_expires_at,
        notes: profile.manual_subscription_notes
      };
    }

    // Check Stripe subscription
    const stripeStatus = profile.subscription_status;
    const stripePlan = profile.subscription?.plan_key || profile.subscription_plan;

    if ((stripeStatus === 'active' || stripeStatus === 'trialing') &&
        (stripePlan === 'pro' || stripePlan === 'plus')) {
      return {
        type: 'paid',
        plan: stripePlan,
        source: 'stripe',
        renewsAt: profile.subscription?.current_period_end
      };
    }

    return { type: 'free', plan: null, source: null };
  }
}

const authService = new AuthService();

/**
 * Send images to Vision API for analysis
 * @param {Object} params
 * @param {string} params.query - User's text query (can be empty)
 * @param {Array<{data: string, type: string}>} params.images - Images with base64 data URLs and MIME types
 * @param {string} params.mode - Chat mode (search, reason, write, standard)
 * @param {AbortSignal} [params.signal] - Optional abort signal for cancellation
 * @returns {Promise<Response>} - Fetch Response object with streaming body
 */
export async function sendVisionRequest({ query, images, mode, signal }) {
  const url = import.meta.env.VITE_VISION_API_URL;

  if (!url) {
    throw new Error('VITE_VISION_API_URL not configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      query: query || '',
      images: images.map(img => ({
        data: img.data,
        type: img.type
      })),
      mode: mode || 'standard'
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Vision API error: ${response.status}`);
  }

  return response;
}

export default authService;
