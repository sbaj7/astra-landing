import Cookies from 'js-cookie';

// API configuration for production Supabase
const AUTH_API_URL = 'https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/auth-management';
const BILLING_API_URL = (import.meta?.env?.VITE_BILLING_API_URL) || `${import.meta?.env?.VITE_SUPABASE_URL || 'https://shwitfgtpfszjjoczbxp.supabase.co'}/functions/v1/billing`;
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod2l0Zmd0cGZzempqb2N6YnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjY5ODksImV4cCI6MjA2NTg0Mjk4OX0.b8CBToFGkvPUcxwxJL4ZnFIe4tanZigHdGp9BKzLBM8';

console.log('🔧 Auth Service: Production mode');

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
      used = 10 - limit.remaining;
    }
    used = Math.max(0, Math.min(10, Math.floor(used)));

    let resetAt = typeof limit.reset_at === 'string' ? limit.reset_at : null;
    const resetTime = resetAt ? new Date(resetAt) : null;
    if (!resetAt || Number.isNaN(resetTime?.getTime())) {
      resetAt = this.getDefaultAnonymousResetTimestamp();
    }

    return {
      used,
      remaining: Math.max(0, 10 - used),
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
    const nextUsed = Math.min(10, (cached?.used || 0) + 1);
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

  async callBillingAPI(action, data = {}) {
    if (!BILLING_API_URL) {
      throw new Error('Billing API is not configured');
    }

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
      if (!response.ok) {
        throw new Error(payload?.error || 'Billing API error');
      }
      return payload;
    } catch (error) {
      console.error('Billing API call failed:', error);
      throw error;
    }
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
      return fresh || { used: 0, remaining: 10, reset_at: this.getDefaultAnonymousResetTimestamp() };
    }

    if (endpoint === 'increment-usage') {
      const updated = this._bumpAnonymousLimitCache();
      return updated || { used: 1, remaining: 9, reset_at: this.getDefaultAnonymousResetTimestamp() };
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

  async createCheckoutSession(plan, supabaseUser, returnUrl) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    return await this.callBillingAPI('create_checkout_session', {
      plan,
      return_url: returnUrl,
      supabase_user: normalizedUser,
      auth0_user: {
        sub: normalizedUser.id,
        email: normalizedUser.email,
        name: normalizedUser.full_name,
        picture: normalizedUser.avatar_url
      }
    });
  }

  async createPortalSession(supabaseUser, returnUrl) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    return await this.callBillingAPI('create_portal_session', {
      return_url: returnUrl,
      supabase_user: normalizedUser,
      auth0_user: {
        sub: normalizedUser.id,
        email: normalizedUser.email,
        name: normalizedUser.full_name,
        picture: normalizedUser.avatar_url
      }
    });
  }

  async getSubscriptionStatus(supabaseUser) {
    const normalizedUser = this.normalizeSupabaseUser(supabaseUser);
    if (!normalizedUser) throw new Error('Supabase user required for billing');

    return await this.callBillingAPI('get_subscription', {
      supabase_user: normalizedUser,
      auth0_user: {
        sub: normalizedUser.id,
        email: normalizedUser.email,
        name: normalizedUser.full_name,
        picture: normalizedUser.avatar_url
      }
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
