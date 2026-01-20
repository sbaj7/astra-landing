# External Integrations

**Analysis Date:** 2026-01-19

## Databases

**Supabase PostgreSQL:**
- Connection: Via `@supabase/supabase-js` client
- Client: `/src/services/supabaseClient.js`
- Tables used:
  - `auth_users` — User profiles, subscription status, Stripe customer mapping
  - `anonymous_limits` — Anonymous user chat tracking
  - `user_limits` — Authenticated user chat tracking
  - `user_chat_sessions` — Saved chat history

**Configuration:**
```javascript
// /src/services/supabaseClient.js
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

## Authentication

**Supabase Auth:**
- Provider: `/src/components/Auth/SupabaseAuthProvider.jsx`
- Methods supported:
  - Email/Password signup and signin
  - Magic Link (OTP) email authentication
  - OAuth: Google, GitHub
  - Password reset via email

**Auth Context API:**
```javascript
const {
  user,              // Decorated user object
  rawUser,           // Original Supabase user
  profile,           // Normalized profile data
  isAuthenticated,   // Boolean auth state
  session,           // Supabase session object
  signIn,            // Show auth modal
  signOut,           // Clear session
  signInWithOAuth,   // OAuth provider login
  signInWithPassword // Email/password login
} = useSupabaseAuth();
```

**Session Management:**
- Sessions persisted automatically by Supabase
- Auth state changes trigger `onAuthStateChange` listener
- User sync with backend via `authService.syncUserWithSupabase()`

## External APIs

**Supabase Edge Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `auth-management` | `/functions/v1/auth-management/{action}` | User sync, usage limits, chat sessions |
| `billing-supabase` | `/functions/v1/billing-supabase` | Stripe checkout, portal, subscription status |
| `stripe-webhook` | `/functions/v1/stripe-webhook` | Stripe event processing |
| `check-email` | `/functions/v1/check-email` | Email existence check for auth flow |
| `send-email-hook` | `/functions/v1/send-email-hook` | Custom email templates via Resend |
| `admin-subscription-manager` | `/functions/v1/admin-subscription-manager` | Manual subscription grants |

**Auth Management Endpoints:**
- `POST /check-limit` — Check daily usage limits
- `POST /increment-usage` — Increment chat usage counter
- `POST /sync-user` — Sync Supabase user to auth_users table
- `POST /save-session` — Save chat session
- `POST /get-sessions` — Retrieve chat history
- `POST /delete-session` — Delete chat session
- `POST /update-profile` — Update user profile

**Billing API Actions:**
- `create_checkout_session` — Create Stripe checkout
- `create_portal_session` — Create Stripe billing portal
- `get_subscription` — Get current subscription status

## Payment Processing

**Stripe Integration:**
- SDK: `stripe@14.21.0` (Deno)
- API Version: `2024-04-10`
- Handler: `/supabase/functions/billing-supabase/index.ts`

**Subscription Plans:**
| Plan | Price ID Env Var | Daily Chat Limit |
|------|------------------|------------------|
| Free | N/A | 10 |
| Plus | `STRIPE_PLUS_PRICE_ID` | 24 |
| Pro | `STRIPE_PRO_PRICE_ID` | Unlimited |

**Stripe Webhook Events Handled:**
- `customer.created` / `customer.updated`
- `checkout.session.completed`
- `customer.subscription.created` / `updated` / `deleted`
- `invoice.payment_succeeded` / `invoice.payment_failed`

**Customer Deduplication:**
- Searches by `supabase_user_id` in Stripe metadata
- Falls back to email search
- Uses idempotency keys for creation
- Function: `/supabase/functions/deduplicate-customers/index.ts`

## Email Service

**Resend Integration:**
- SDK: `resend@4.0.1` (Deno)
- Handler: `/supabase/functions/send-email-hook/index.ts`
- Triggered by Supabase Auth Hooks

**Email Types:**
| Type | Template |
|------|----------|
| `signup` / `confirmation` | Verification email |
| `recovery` / `reset` | Password reset |
| `magic_link` | Passwordless sign-in |
| `invite` | User invitation |
| `reauthentication` | Sensitive operation confirmation |

**Configuration:**
```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=ASTRA MD <noreply@yourdomain.com>
SEND_EMAIL_HOOK_SECRET=whsec_xxx
```

## Storage

**Supabase Storage:**
- Bucket: `articles` — Medical article storage (public read)
- Not used for user uploads currently

**Local Article Storage:**
- Location: `/generated_articles/`
- Manifest: `/generated_articles/index.json`
- Copied to `dist/generated_articles/` during build

## Third-party Services

**Web Speech API:**
- Used for voice input in chat interface
- Browser-native, no external service

**Favicon Service:**
- Uses Google's favicon service for citation icons
- URL pattern: `https://www.google.com/s2/favicons?domain=...`

## Monitoring & Observability

**Error Tracking:** Not configured

**Logging:**
- Console logging with emoji prefixes for debugging
- Edge functions log to Supabase dashboard

**Analytics:** Not detected

## Anonymous User Tracking

**Cookie-based Tracking:**
- Cookie: `astra_anonymous_id`
- Format: `anon_{random}_{timestamp}`
- Expires: 365 days
- Library: `js-cookie`

**Usage Tracking:**
- Anonymous: 3 chats/day, tracked in `anonymous_limits` table
- Cached locally in localStorage (`astra_limit_{anonymous_id}`)
- Migrated to user account on signup

## Webhooks & Callbacks

**Incoming Webhooks:**
| Endpoint | Source | Purpose |
|----------|--------|---------|
| `/functions/v1/stripe-webhook` | Stripe | Payment events |
| `/functions/v1/send-email-hook` | Supabase Auth | Email sending |

**Outgoing Webhooks:** None detected

## Security

**Row Level Security (RLS):**
- Enabled on Supabase tables
- Service role key used in edge functions for admin operations

**API Authentication:**
- Supabase anon key for public operations
- Bearer token (session access token) for authenticated requests
- Admin API key for subscription management

**Input Sanitization:**
- `rehype-sanitize` for markdown HTML
- Settings whitelist in auth-management function

## Rate Limiting

**Chat Limits by Tier:**
| Tier | Daily Limit |
|------|-------------|
| Anonymous | 3 |
| Free | 10 |
| Plus | 24 |
| Pro | Unlimited |

**Reset:** 24 hours from first usage

---

*Integration audit: 2026-01-19*
