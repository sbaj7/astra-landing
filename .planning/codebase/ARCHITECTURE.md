# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Component-Based Single Page Application (SPA) with Backend-as-a-Service (BaaS)

**Key Characteristics:**
- React component hierarchy with Context API for global state (auth, theme)
- Supabase Edge Functions as serverless backend API layer
- Client-side routing with React Router DOM
- Server-Sent Events (SSE) for real-time AI chat streaming
- Monolithic main component (`AstraApp.jsx` at 5445 lines) containing most chat logic

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`
- Contains: React components (JSX), styling logic, UI state management
- Depends on: Services layer, Context providers
- Used by: Routes, App entry point

**Context/State Layer:**
- Purpose: Provide global application state (authentication, theming)
- Location: `src/components/Auth/SupabaseAuthProvider.jsx`, `src/components/Themes+Styles.jsx`
- Contains: React Context providers, state hooks, session management
- Depends on: Services layer, Supabase client
- Used by: All components via hooks (`useSupabaseAuth`, `useTheme`)

**Services Layer:**
- Purpose: Abstract API communication and business logic
- Location: `src/services/`
- Contains: `authService.js` (452 lines), `supabaseClient.js`
- Depends on: Supabase JS SDK, environment variables
- Used by: Context providers, components

**Backend API Layer (Supabase Edge Functions):**
- Purpose: Server-side processing, database access, third-party integrations
- Location: `supabase/functions/`
- Contains: Deno TypeScript functions for auth, billing, webhooks
- Depends on: Supabase service role, Stripe SDK
- Used by: Frontend services via HTTP/fetch

**Static Content Layer:**
- Purpose: Pre-generated medical articles and static assets
- Location: `generated_articles/`, `public/`
- Contains: JSON article files, images, favicon, robots.txt
- Depends on: Build scripts for generation
- Used by: Article routes, build process

## Data Flow

**Chat Message Flow:**

1. User enters query in `AstraApp.jsx` input area
2. Component validates input and checks usage limits via `authService.checkUserLimit()`
3. Message sent to AI backend via SSE streaming endpoint
4. `handleStreamingResponse()` processes Server-Sent Events chunks
5. Response rendered incrementally with `StreamingMarkdownView` component
6. Citations extracted and normalized via `normalizeCitationObject()`
7. Optional: Chat saved via `authService.saveChatSession()` to Supabase

**Authentication Flow:**

1. User triggers auth via `signIn()` from `useSupabaseAuth` hook
2. `AuthModal` displayed with email/password or OAuth options
3. Supabase Auth handles credential verification
4. `onAuthStateChange` listener updates `SupabaseAuthProvider` state
5. `authService.syncUserWithSupabase()` syncs user to `auth-management` Edge Function
6. User profile/subscription data attached to context

**Billing Flow:**

1. User selects plan in `BillingModal.jsx`
2. `authService.createCheckoutSession()` calls `billing-supabase` Edge Function
3. Edge Function creates Stripe checkout session
4. User redirected to Stripe-hosted checkout
5. Stripe webhook (`stripe-webhook/index.ts`) handles payment confirmation
6. User metadata updated with subscription status

**State Management:**

- **Global Auth State:** `SupabaseAuthProvider` context with session, user, profile
- **Global Theme State:** `ThemeProvider` context with isDark, colors, toggleTheme
- **Component State:** React `useState` for UI state (messages, mode, citations, modals)
- **Persistent State:** LocalStorage for settings, anonymous tracking, landing page seen flag
- **Server State:** Supabase database for users, chat sessions, subscriptions

## Key Abstractions

**AuthService Singleton:**
- Purpose: Centralized authentication and API communication
- Examples: `src/services/authService.js`
- Pattern: Class singleton exported as `new AuthService()`, manages session state, provides API methods

**Citation System:**
- Purpose: Normalize and display medical literature references
- Examples: `normalizeCitationObject()`, `ReferencesView.jsx`, inline `[1]` rendering
- Pattern: Extract URLs/metadata from AI responses, render as interactive superscripts with tooltips

**Chat Modes:**
- Purpose: Different AI interaction modes with specialized formatting
- Examples: `search`, `reason`, `write` modes in `AstraApp.jsx`
- Pattern: Mode state affects prompt construction, response rendering, and sample queries

**Theme System:**
- Purpose: Consistent light/dark mode with accent colors
- Examples: `src/components/Themes+Styles.jsx`, `colorDefinitions` object
- Pattern: Context provider with `isDark` boolean, colors object, utility functions

**Edge Function Router:**
- Purpose: Handle multiple API endpoints in single function
- Examples: `supabase/functions/auth-management/index.ts` with switch on pathname
- Pattern: Parse URL, route to handler functions (`handleCheckLimit`, `handleSyncUser`, etc.)

## Entry Points

**Browser Entry:**
- Location: `src/main.jsx`
- Triggers: Page load, hydration
- Responsibilities: Mount React app to DOM, handle SSR hydration vs client-side render

**App Router Entry:**
- Location: `src/App.jsx`
- Triggers: Route changes
- Responsibilities: Provider hierarchy setup, route configuration, landing overlay logic

**Main Chat Interface:**
- Location: `src/components/AstraApp.jsx`
- Triggers: Default route (`/*`)
- Responsibilities: Chat UI, message handling, citation processing, all modal management

**Article Route:**
- Location: `src/routes/ArticlePage.jsx`
- Triggers: `/articles/:slug` or `/article/:slug` routes
- Responsibilities: Fetch and render medical articles from `generated_articles/`

**Edge Function Entries:**
- Location: `supabase/functions/*/index.ts`
- Triggers: HTTP requests to Supabase function URLs
- Responsibilities: `auth-management` (user sync, limits, sessions), `billing-supabase` (Stripe), `stripe-webhook` (payment events)

## Error Handling

**Strategy:** Try-catch with console logging and graceful degradation

**Patterns:**
- API calls wrapped in try-catch with fallback to localStorage for anonymous users
- `authService.handleLocalFallback()` provides offline-capable anonymous tracking
- Billing API has retry logic with exponential backoff (up to 3 retries, 30s timeout)
- Edge functions return JSON error responses with appropriate HTTP status codes
- No global error boundaries implemented (potential improvement area)

## Cross-Cutting Concerns

**Logging:**
- Console logging with emoji prefixes for categorization
- Examples: `console.log('Syncing user...')`, `console.error('Failed to...')`

**Validation:**
- Input sanitization in Edge Functions (`sanitizeSettings()`, `ALLOWED_SETTING_KEYS`)
- HTML sanitization via `rehype-sanitize` for markdown rendering
- UUID validation in `validateAndFormatUserId()`

**Authentication:**
- Supabase Auth with JWT tokens
- Anonymous ID tracking via cookies (`astra_anonymous_id`)
- Usage limits enforced both client-side (optimistic) and server-side (authoritative)

**CORS:**
- Edge Functions include `corsHeaders` for cross-origin requests
- Allow all origins (`*`) for public API access

---

*Architecture analysis: 2026-01-19*
