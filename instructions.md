# 🚀 Astra Complete Auth Implementation Guide
## Local Docker Testing → Production Deployment

---

## ⚠️ CRITICAL: READ AFTER EACH TASK
**Main Goal:** Implement server-side user management with Auth0, 10 free chats for anonymous users, and complete Supabase integration. Test everything locally with Docker first, then deploy to production.

---

## 🏗️ Complete Architecture

```
Development Flow:
1. Local Supabase (Docker) → Test everything
2. Verify working → Deploy to production
3. Frontend connects based on environment

System Components:
├── Frontend (React + Vite)
│   ├── Auth0 integration
│   ├── Chat counter UI (top-right)
│   └── Paywall modal
├── Edge Functions (Supabase)
│   ├── /quick-api (existing medical AI)
│   ├── /auth-management (NEW)
│   └── /trials-function (existing)
└── Database (PostgreSQL)
    ├── auth_users
    ├── user_chat_sessions
    ├── usage_tracking
    └── anonymous_limits
```

## 📋 Task Checklist
- [ ] 1. Initialize local Supabase with Docker
- [ ] 2. Create environment configuration files
- [ ] 3. Set up database schema locally
- [ ] 4. Create auth-management edge function
- [ ] 5. Serve edge functions locally
- [ ] 6. Install frontend dependencies
- [ ] 7. Create auth service module
- [ ] 8. Build Auth0 Provider wrapper
- [ ] 9. Create AuthButton component
- [ ] 10. Build PaywallModal component
- [ ] 11. Update AstraApp with auth integration
- [ ] 12. Test complete flow locally
- [ ] 13. Deploy to production Supabase
- [ ] 14. Configure production environment
- [ ] 15. Final production testing

---

## 📁 PHASE 1: LOCAL DEVELOPMENT SETUP

### TASK 1: Initialize Local Supabase

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Initialize Supabase in project root
supabase init

# Start local Supabase (Docker containers)
supabase start

# Save the output! You'll see:
# API URL: http://localhost:54321
# GraphQL URL: http://localhost:54321/graphql/v1
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# Inbucket URL: http://localhost:54324
# JWT secret: [local-jwt-secret]
# anon key: [local-anon-key]
# service_role key: [local-service-key]
```

**✅ Verify Docker is running and save these URLs**

---

### TASK 2: Create Environment Files

```bash
# Backup existing env
cp .env .env.production.backup 2>/dev/null || true

# Create local environment file
cat > .env.local << 'EOF'
# === LOCAL DEVELOPMENT ===
VITE_ENV=local

# Local Supabase (replace with your actual keys from supabase start)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=YOUR_LOCAL_ANON_KEY
VITE_SUPABASE_SERVICE_KEY=YOUR_LOCAL_SERVICE_KEY

# Local Edge Functions
VITE_API_URL=http://localhost:54321/functions/v1/quick-api
VITE_AUTH_API_URL=http://localhost:54321/functions/v1/auth-management
VITE_BILLING_API_URL=http://localhost:54321/functions/v1/billing

# Stripe Billing (replace with your test keys)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_STARTER_PRICE_ID=price_starter
STRIPE_PRO_PRICE_ID=price_pro
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise

# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-74p1zsj1zkoleg03.us.auth0.com
VITE_AUTH0_CLIENT_ID=iS1Afbo1gjnodhp8Xo4YQrunEQ29XSQV
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
VITE_AUTH0_AUDIENCE=https://dev-74p1zsj1zkoleg03.us.auth0.com/api/v2/
EOF

# Create production environment file
cat > .env.production << 'EOF'
# === PRODUCTION ===
VITE_ENV=production

# Production Supabase
VITE_SUPABASE_URL=https://shwitfgtpfszjjoczbxp.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Production Edge Functions
VITE_API_URL=https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/quick-api
VITE_AUTH_API_URL=https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/auth-management
VITE_BILLING_API_URL=https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/billing

# Stripe Billing (replace with live keys before launch)
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_STARTER_PRICE_ID=price_starter_live
STRIPE_PRO_PRICE_ID=price_pro_live
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_live

# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-74p1zsj1zkoleg03.us.auth0.com
VITE_AUTH0_CLIENT_ID=iS1Afbo1gjnodhp8Xo4YQrunEQ29XSQV
VITE_AUTH0_REDIRECT_URI=https://astramd.org
VITE_AUTH0_AUDIENCE=https://dev-74p1zsj1zkoleg03.us.auth0.com/api/v2/
EOF
```

**⚠️ Replace YOUR_LOCAL_ANON_KEY and YOUR_LOCAL_SERVICE_KEY with values from Task 1**

---

### TASK 3: Create Database Schema

Create file: `supabase/migrations/20240101000000_auth_management.sql`

```sql
-- Auth Management Schema
CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  mode TEXT DEFAULT 'search', -- 'search', 'reason', 'write'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  action_type TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.anonymous_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT UNIQUE NOT NULL,
  chats_used INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_auth_users_auth0_id ON public.auth_users(auth0_id);
CREATE INDEX idx_auth_users_email ON public.auth_users(email);
CREATE INDEX idx_user_chat_sessions_user_id ON public.user_chat_sessions(user_id);
CREATE INDEX idx_user_chat_sessions_anonymous_id ON public.user_chat_sessions(anonymous_id);
CREATE INDEX idx_anonymous_limits_anonymous_id ON public.anonymous_limits(anonymous_id);
CREATE INDEX idx_anonymous_limits_reset_at ON public.anonymous_limits(reset_at);

-- Enable RLS
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_limits ENABLE ROW LEVEL SECURITY;

-- Open policies for local development (will be restricted in production)
CREATE POLICY "Allow all for development" ON public.auth_users FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON public.user_chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON public.usage_tracking FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON public.anonymous_limits FOR ALL USING (true);
```

Run migration:
```bash
supabase db reset  # This applies all migrations
# Or visit http://localhost:54323 and run the SQL manually
```

---

### TASK 4: Create Auth Management Edge Function

Create: `supabase/functions/auth-management/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.split('/').pop();
    
    // Initialize Supabase with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    console.log(`[auth-management] Handling: ${pathname}`, body);

    // Route to handlers
    switch (pathname) {
      case "check-limit":
        return await handleCheckLimit(body, supabase);
      
      case "increment-usage":
        return await handleIncrementUsage(body, supabase);
      
      case "sync-user":
        return await handleSyncUser(body, supabase);
      
      case "save-session":
        return await handleSaveSession(body, supabase);
      
      case "get-sessions":
        return await handleGetSessions(body, supabase);
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown endpoint: ${pathname}` }),
          { 
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
    }
  } catch (error) {
    console.error("[auth-management] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Check anonymous user's remaining chats
async function handleCheckLimit(body: any, supabase: any) {
  const { anonymous_id } = body;
  
  if (!anonymous_id) {
    return new Response(
      JSON.stringify({ error: "anonymous_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get or create limit record
  let { data: limitRecord } = await supabase
    .from("anonymous_limits")
    .select("*")
    .eq("anonymous_id", anonymous_id)
    .single();

  const now = new Date();
  
  if (!limitRecord) {
    // Create new record with 10 free chats
    const newRecord = {
      anonymous_id,
      chats_used: 0,
      reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    const { data } = await supabase
      .from("anonymous_limits")
      .insert(newRecord)
      .select()
      .single();
    
    limitRecord = data;
  }
  
  // Check if reset needed (24 hours passed)
  const resetTime = new Date(limitRecord.reset_at);
  if (resetTime < now) {
    const { data } = await supabase
      .from("anonymous_limits")
      .update({
        chats_used: 0,
        reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now.toISOString()
      })
      .eq("anonymous_id", anonymous_id)
      .select()
      .single();
    
    limitRecord = data;
  }

  const remaining = Math.max(0, 10 - (limitRecord.chats_used || 0));
  
  return new Response(
    JSON.stringify({
      used: limitRecord.chats_used || 0,
      remaining,
      can_send: remaining > 0,
      reset_at: limitRecord.reset_at
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

// Increment usage after successful chat
async function handleIncrementUsage(body: any, supabase: any) {
  const { anonymous_id } = body;
  
  if (!anonymous_id) {
    return new Response(
      JSON.stringify({ error: "anonymous_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get current usage
  let { data: current } = await supabase
    .from("anonymous_limits")
    .select("*")
    .eq("anonymous_id", anonymous_id)
    .single();

  if (current && current.chats_used >= 10) {
    return new Response(
      JSON.stringify({ 
        error: "Free chat limit reached",
        used: current.chats_used,
        remaining: 0 
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (current) {
    // Update existing
    const { data } = await supabase
      .from("anonymous_limits")
      .update({
        chats_used: current.chats_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq("anonymous_id", anonymous_id)
      .select()
      .single();

    const remaining = Math.max(0, 10 - data.chats_used);
    
    // Also track in usage_tracking
    await supabase.from("usage_tracking").insert({
      anonymous_id,
      action_type: "chat_query",
      created_at: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        used: data.chats_used,
        remaining,
        reset_at: data.reset_at
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    // Create new with 1 usage
    const { data } = await supabase
      .from("anonymous_limits")
      .insert({
        anonymous_id,
        chats_used: 1,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    return new Response(
      JSON.stringify({
        used: 1,
        remaining: 9,
        reset_at: data.reset_at
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Sync Auth0 user with Supabase
async function handleSyncUser(body: any, supabase: any) {
  const { auth0_user, anonymous_id } = body;
  
  if (!auth0_user || !auth0_user.sub) {
    return new Response(
      JSON.stringify({ error: "auth0_user required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user exists
  let { data: existingUser } = await supabase
    .from("auth_users")
    .select("*")
    .eq("auth0_id", auth0_user.sub)
    .single();

  if (existingUser) {
    // Update last seen
    await supabase
      .from("auth_users")
      .update({ 
        updated_at: new Date().toISOString(),
        metadata: {
          ...existingUser.metadata,
          last_login: new Date().toISOString(),
          picture: auth0_user.picture
        }
      })
      .eq("id", existingUser.id);
    
    return new Response(
      JSON.stringify({ user: existingUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from("auth_users")
    .insert({
      auth0_id: auth0_user.sub,
      email: auth0_user.email,
      full_name: auth0_user.name || auth0_user.email?.split('@')[0] || 'User',
      metadata: {
        picture: auth0_user.picture,
        email_verified: auth0_user.email_verified,
        first_login: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Migrate anonymous sessions if provided
  if (anonymous_id && newUser) {
    // Transfer chat sessions
    await supabase
      .from("user_chat_sessions")
      .update({ 
        user_id: newUser.id, 
        anonymous_id: null 
      })
      .eq("anonymous_id", anonymous_id);

    // Delete anonymous limit record
    await supabase
      .from("anonymous_limits")
      .delete()
      .eq("anonymous_id", anonymous_id);
  }

  return new Response(
    JSON.stringify({ user: newUser }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Save chat session
async function handleSaveSession(body: any, supabase: any) {
  const { title, messages, mode, user_id, anonymous_id } = body;
  
  if (!title || !messages) {
    return new Response(
      JSON.stringify({ error: "title and messages required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("user_chat_sessions")
    .insert({
      user_id: user_id || null,
      anonymous_id: !user_id ? anonymous_id : null,
      title: title.substring(0, 100),
      messages,
      mode: mode || 'search',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ session: data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get chat sessions
async function handleGetSessions(body: any, supabase: any) {
  const { user_id, anonymous_id, limit = 20 } = body;
  
  let query = supabase
    .from("user_chat_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user_id) {
    query = query.eq("user_id", user_id);
  } else if (anonymous_id) {
    query = query.eq("anonymous_id", anonymous_id);
  } else {
    return new Response(
      JSON.stringify({ error: "user_id or anonymous_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getting sessions:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get sessions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ sessions: data || [] }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

### TASK 5: Serve Functions Locally

```bash
# Terminal 1: Keep Supabase running
supabase status

# Terminal 2: Serve edge functions
supabase functions serve --env-file .env.local

# Test the function
curl -X POST http://localhost:54321/functions/v1/auth-management/check-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -d '{"anonymous_id": "test123"}'
```

---

## 📁 PHASE 2: FRONTEND COMPONENTS

### TASK 6: Install Dependencies

```bash
npm install @supabase/supabase-js js-cookie
```

---

### TASK 7: Create Auth Service

Create: `src/services/authService.js`

```javascript
import Cookies from 'js-cookie';

// Environment detection
const isLocal = import.meta.env.VITE_ENV === 'local';

// API configuration based on environment
const AUTH_API_URL = isLocal 
  ? 'http://localhost:54321/functions/v1/auth-management'
  : 'https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/auth-management';

const API_KEY = isLocal
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log(`🔧 Auth Service: ${isLocal ? 'LOCAL' : 'PRODUCTION'} mode`);

class AuthService {
  constructor() {
    this.anonymousId = this.getOrCreateAnonymousId();
    this.isLocal = isLocal;
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
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'apikey': API_KEY
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to call ${endpoint}:`, error);
      // Fallback to localStorage
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

  async syncUserWithSupabase(auth0User) {
    if (!auth0User) return null;
    
    const response = await this.callAuthAPI('sync-user', {
      auth0_user: auth0User,
      anonymous_id: this.anonymousId
    });
    return response.user;
  }

  async saveChatSession(title, messages, mode, auth0User) {
    let userId = null;
    if (auth0User) {
      const user = await this.syncUserWithSupabase(auth0User);
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

  async getChatSessions(auth0User, limit = 20) {
    let userId = null;
    if (auth0User) {
      const user = await this.syncUserWithSupabase(auth0User);
      userId = user?.id;
    }

    const response = await this.callAuthAPI('get-sessions', {
      user_id: userId,
      anonymous_id: !userId ? this.anonymousId : null,
      limit
    });
    
    return response.sessions || [];
  }

  // Local storage fallbacks
  handleLocalFallback(endpoint, data) {
    const key = `astra_limit_${this.anonymousId}`;
    const stored = localStorage.getItem(key);
    const now = new Date();
    
    if (endpoint === 'check-limit') {
      if (!stored) {
        const newLimit = {
          used: 0,
          reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
        localStorage.setItem(key, JSON.stringify(newLimit));
        return { used: 0, remaining: 10, can_send: true, reset_at: newLimit.reset_at };
      }

      const limit = JSON.parse(stored);
      const resetTime = new Date(limit.reset_at);

      if (resetTime < now) {
        const newLimit = {
          used: 0,
          reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
        localStorage.setItem(key, JSON.stringify(newLimit));
        return { used: 0, remaining: 10, can_send: true, reset_at: newLimit.reset_at };
      }

      return {
        used: limit.used || 0,
        remaining: Math.max(0, 10 - (limit.used || 0)),
        can_send: (limit.used || 0) < 10,
        reset_at: limit.reset_at
      };
    }
    
    if (endpoint === 'increment-usage') {
      const limit = stored ? JSON.parse(stored) : { 
        used: 0, 
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
      };
      limit.used = (limit.used || 0) + 1;
      localStorage.setItem(key, JSON.stringify(limit));
      return {
        used: limit.used,
        remaining: Math.max(0, 10 - limit.used),
        reset_at: limit.reset_at
      };
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
}

export default new AuthService();
```

---

### TASKS 8-11: Frontend Components

These will be created in the same structure as the original guide but with environment-aware configuration.

---

## 🧪 PHASE 3: LOCAL TESTING

### TASK 12: Update Main App Components

Create: `src/components/AstraApp.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from './Auth/SupabaseAuthProvider';
import Header from './Header/Header';
import ChatInterface from './Chat/ChatInterface';
import PaywallModal from './Auth/PaywallModal';
import authService from '../services/authService';

const AstraApp = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentMode, setCurrentMode] = useState('search'); // 'search', 'reason', 'write'

  useEffect(() => {
    // Sync user with Supabase on auth change
    if (isAuthenticated && user) {
      authService.syncUserWithSupabase(user);
    }
  }, [isAuthenticated, user]);

  const checkMessageLimit = async () => {
    const limit = isAuthenticated
      ? await authService.checkUserLimit(user.id)
      : await authService.checkAnonymousLimit();
    if (limit.remaining <= 0) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const handleSendMessage = async (query, mode) => {
    // Check limit before sending
    const canSend = await checkMessageLimit();
    if (!canSend) {
      return;
    }

    try {
      // Call your existing quick-api endpoint
      const response = await fetch(import.meta.env.VITE_QUICK_API_URL, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          query,
          mode,
          stream: true,
          isClinical: mode === 'write',
          isReason: mode === 'reason',
          anonymous_id: isAuthenticated ? null : authService.getAnonymousId()
        })
      });

      // Handle the response (your existing logic)
      // ... process streaming response ...

      // quick-api performs the authoritative atomic increment server-side.

      // Save chat session
      const title = query.substring(0, 50) + '...';
      await authService.saveChatSession(
        title,
        [...messages, { role: 'user', content: query }, { role: 'assistant', content: 'Response here' }],
        mode,
        user
      );

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with auth UI */}
      <Header onAuthRequired={() => setShowPaywall(true)} />
      
      {/* Main chat interface - pushed down by header */}
      <div className="flex-1 pt-16">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          disabled={!canSendMessage}
        />
      </div>

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </div>
  );
};

export default AstraApp;
```

Create: `src/components/Themes+Styles.jsx`

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('astraTheme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('astraTheme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

Update: `src/App.jsx`

```jsx
import React from 'react';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import SupabaseAuthProvider from './components/Auth/SupabaseAuthProvider.jsx';
import AstraApp from './components/AstraApp.jsx';
import './App.css';

function App() {
  return (
  <SupabaseAuthProvider>
    <ThemeProvider>
      <AstraApp />
    </ThemeProvider>
  </SupabaseAuthProvider>
  );
}

export default App;
```

---

### TASK 13: Complete Local Testing

```bash
# Verify all services running
docker ps  # Should show Supabase containers

# Check database
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT * FROM anonymous_limits;"

# Test auth endpoint
curl -X POST http://localhost:54321/functions/v1/auth-management/check-limit \
  -H "Content-Type: application/json" \
  -d '{"anonymous_id": "test123"}'

# Start frontend
npm run dev

# Open http://localhost:5173
```

**Testing Checklist:**
- [ ] Anonymous user sees "10 free chats" in header
- [ ] Counter decrements after each query
- [ ] Modal appears when reaching 0
- [ ] Auth0 login works
- [ ] User data syncs to local Supabase
- [ ] Chat history persists

---

## 🚀 PHASE 4: PRODUCTION DEPLOYMENT

### TASK 13: Deploy to Production

```bash
# Link to production
supabase link --project-ref shwitfgtpfszjjoczbxp

# Push schema to production
supabase db push

# Deploy edge function
supabase functions deploy auth-management
```

### TASK 14: Production Environment

Update `.env` for production:
```bash
cp .env.production .env
npm run build
```

### TASK 15: Final Testing

Test production endpoints and verify all features work.

---

## 📝 After Each Task

**STOP AND CHECK:**
1. ✅ Task completed successfully?
2. ✅ No breaking changes?
3. ✅ Local testing passes?
4. ✅ Ready for next task?

**Reference Main Goal:** Server-side auth with 10 free chats, Auth0 integration, complete Supabase persistence, local-first testing.

---

## 🎯 Success Metrics
- Zero friction for first 10 queries
- Smooth Auth0 authentication
- 100% data persistence
- Local testing before production
- Professional medical-grade UX
