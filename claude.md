# Astra MD - AI Medical Assistant Application Documentation

## 🏥 PROJECT OVERVIEW

**Application Name**: Astra MD
**Tagline**: "Uncertainty ends here"
**Purpose**: AI-powered clinical decision support system for healthcare professionals providing evidence-based medical knowledge, differential diagnosis reasoning, and clinical documentation assistance.

### Tech Stack
- **Frontend Framework**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Styling**: TailwindCSS 4.1.10 + Custom CSS
- **Routing**: React Router DOM 7.9.3
- **Backend**: Supabase (Auth + Storage + Edge Functions)
- **Authentication**: Supabase Auth with email/password + OAuth (Google, GitHub)
- **Payment Processing**: Stripe (via Supabase Edge Functions)
- **State Management**: React Context API (no Redux/Zustand)
- **Icons**: Lucide React 0.522.0
- **Markdown**: react-markdown with extensive plugins
- **Deployment**: Static site with SSR for articles

### Key URLs
- **Supabase Project**: `https://shwitfgtpfszjjoczbxp.supabase.co`
- **Working Directory**: `/Users/mbele/Desktop/ASTRA`
- **Git Branch**: `feature/astra-refresh` (main branch: `main`)

---

## 📁 PROJECT STRUCTURE

```
ASTRA/
├── public/                        # Static assets
│   ├── favicon.ico, favicon-*.png  # App icons
│   ├── og-image.png               # Social media preview
│   ├── Astrasvg.svg               # Logo
│   ├── privacy.html               # Privacy policy
│   └── robots.txt                 # SEO configuration
│
├── src/                           # Source code
│   ├── main.jsx                   # Entry point (handles hydration)
│   ├── App.jsx                    # Root component with routing
│   ├── index.css                  # Tailwind imports
│   ├── App.css                    # Global styles
│   │
│   ├── components/                # React components (30+ files)
│   │   ├── AstraApp.jsx           # ⭐ MAIN APP (3914 lines) - Chat interface
│   │   ├── Header.jsx             # Navigation bar
│   │   ├── Themes+Styles.jsx      # Theme system & colors
│   │   ├── Message.jsx            # Chat message display
│   │   ├── ChatHistoryManager.jsx # Chat persistence logic
│   │   ├── ReferencesView.jsx     # Citation viewer
│   │   ├── ProfileModal.jsx       # User profile management
│   │   ├── SettingsModal.jsx      # App settings
│   │   ├── BillingModal.jsx       # Subscription management
│   │   ├── SidebarView.jsx        # Chat history sidebar
│   │   ├── Auth/                  # Authentication components
│   │   │   ├── SupabaseAuthProvider.jsx
│   │   │   ├── AuthButton.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   └── PaywallModal.jsx
│   │   └── [25+ more components]
│   │
│   ├── routes/                    # Page components
│   │   ├── ArticlePage.jsx        # Individual article view
│   │   ├── KnowledgePage.jsx      # Article browser/search
│   │   ├── FeaturesPage.jsx       # Feature showcase
│   │   └── PricingPage.jsx        # Pricing tiers
│   │
│   ├── services/                  # Business logic
│   │   ├── supabaseClient.js      # Supabase initialization
│   │   └── authService.js         # Auth + API layer (452 lines)
│   │
│   ├── hooks/                     # Custom React hooks
│   │   └── useIsMobile.js         # Responsive breakpoint detection
│   │
│   └── prerender/                 # Server-side rendering
│       └── renderArticleDocument.js
│
├── scripts/                       # Build & generation tools
│   ├── generate_sitemap.mjs       # XML sitemap builder
│   ├── prerender_articles.mjs     # SSR for articles
│   ├── generate_articles.py       # AI article generator
│   └── siteConfig.mjs             # Site configuration
│
├── generated_articles/            # Medical knowledge base
│   ├── index.json                 # Article manifest
│   └── [90+ JSON article files]
│
├── Configuration Files
│   ├── package.json               # Dependencies
│   ├── vite.config.js             # Build configuration
│   ├── tailwind.config.js         # Tailwind setup
│   ├── eslint.config.js           # Linting rules
│   └── index.html                 # HTML template
│
└── claude.md                      # THIS FILE - AI assistant reference

```

---

## 🎯 CORE FUNCTIONALITY

### Main Application Component: `AstraApp.jsx`
**Location**: `/src/components/AstraApp.jsx`
**Size**: 3,914 lines
**Purpose**: Primary chat interface with multiple AI modes

#### Chat Modes
1. **Search Mode** (`/search`)
   - Evidence-based medical literature search
   - Returns citations with inline references [1], [2], etc.
   - Interactive reference viewer

2. **Reason Mode** (`/reason`)
   - Structured clinical reasoning
   - Differential diagnosis generation
   - Step-by-step medical logic

3. **Write Mode** (`/write`)
   - Clinical documentation generation
   - Patient education materials
   - Medical notes and summaries

4. **Standard Chat** (default)
   - General medical Q&A
   - No special formatting

#### Key Features
- **Streaming Responses**: Server-Sent Events (SSE) for real-time updates
- **Citations**: Inline [1] references with expandable viewer
- **Image Upload**: Medical images/documents analysis
- **Speech Input**: Web Speech API integration
- **Markdown Rendering**: Full GFM support with math, diagrams, code highlighting
- **Chat History**: Save/restore with titles
- **Theme System**: 5 accent colors (Nightfall, Glacier, Meadow, Ember, Rose)
- **Usage Limits**: 10 free chats/day for anonymous users
- **Responsive**: Mobile-first design

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### Supabase Integration
**Provider**: `/src/components/Auth/SupabaseAuthProvider.jsx`
**Service**: `/src/services/authService.js`
**Client**: `/src/services/supabaseClient.js`

### Authentication Methods
- Email/Password signup
- Magic Link (OTP) email authentication
- OAuth: Google, GitHub

### User Context
```javascript
const {
  user,              // Decorated user object
  rawUser,           // Original Supabase user
  profile,           // Normalized profile data
  isAuthenticated,   // Boolean auth state
  isLoading,         // Loading state
  signIn,            // Show auth modal
  signOut,           // Clear session
  session            // Supabase session object
} = useSupabaseAuth();
```

### Anonymous Users
- Cookie: `astra_anonymous_id`
- Limit: 10 chats per day
- Tracking: LocalStorage + backend verification
- Auto-migration on signup

### Subscription Tiers
1. **Starter**: Free - 10 chats/day
2. **Pro**: $19/month - Unlimited
3. **Enterprise**: Custom pricing

---

## 🎨 THEMING & STYLING

### Theme System
**File**: `/src/components/Themes+Styles.jsx`

#### Color Modes
- Light mode (default)
- Dark mode
- System preference detection

#### Accent Colors
- **Nightfall**: #4A6B7D (default)
- **Glacier**: #2563EB
- **Meadow**: #059669
- **Ember**: #EA580C
- **Rose**: #DB2777

### Styling Approach
- **Primary**: TailwindCSS utility classes
- **Global**: `/src/App.css`
- **Typography**: @tailwindcss/typography plugin
- **Responsive**: Mobile-first breakpoints (768px, 1024px)

---

## 🔌 API & BACKEND SERVICES

### Supabase Edge Functions

1. **`/functions/v1/auth-management`**
   - User synchronization
   - Anonymous limit checking
   - Session management
   - Profile updates

2. **`/functions/v1/billing-supabase`**
   - Stripe checkout sessions
   - Customer portal access
   - Subscription status

3. **`/functions/v1/quick-api`**
   - Chat save/load/delete
   - User chat history

### Storage Buckets
- **articles**: Medical article storage (public read)

### Environment Variables Required
```env
VITE_SUPABASE_URL=https://shwitfgtpfszjjoczbxp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PLUS_PRICE_ID=price_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
VITE_BILLING_API_URL=https://...supabase.co/functions/v1/billing-supabase
```

---

## 📚 KNOWLEDGE BASE

### Article System
**Location**: `/generated_articles/`
**Manifest**: `/generated_articles/index.json`

### Article Structure
```json
{
  "slug": "article-url-slug",
  "title": "Article Title",
  "summary": "Brief overview",
  "updated": "October 2025",
  "source": "generated_articles/filename.json",
  "heroLabel": "Category",
  "tags": ["tag1", "tag2"],
  "sections": [...],
  "citations": [...]
}
```

### Article Routes
- `/articles/:slug` - Individual article
- `/knowledge` - Browse all articles

---

## 🚦 ROUTING

### Route Configuration (`App.jsx`)
```jsx
<Routes>
  <Route path="/articles/:slug" element={<ArticlePage />} />
  <Route path="/article/:slug" element={<ArticlePage />} />
  <Route path="/knowledge" element={<KnowledgePage />} />
  <Route path="/features" element={<FeaturesPage />} />
  <Route path="/pricing" element={<PricingPage />} />
  <Route path="/*" element={<AstraApp />} />  // Main chat UI
</Routes>
```

### Context Provider Hierarchy
```
<SupabaseAuthProvider>
  <ThemeProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </ThemeProvider>
</SupabaseAuthProvider>
```

---

## 🛠️ KEY FILES REFERENCE

### Most Important Files to Understand

1. **`/src/components/AstraApp.jsx`** (3914 lines)
   - Main chat interface
   - Message handling
   - Citation processing
   - Mode switching logic

2. **`/src/services/authService.js`** (452 lines)
   - Authentication logic
   - API communication
   - User management
   - Billing integration

3. **`/src/App.jsx`**
   - Routing configuration
   - Provider setup
   - App initialization

4. **`/src/components/Themes+Styles.jsx`**
   - Complete theme system
   - Color definitions
   - Theme context

5. **`/src/components/Auth/SupabaseAuthProvider.jsx`**
   - Auth context provider
   - Session management
   - User state

### Component Relationships
- `App.jsx` → Routes to pages
- `AstraApp.jsx` → Main chat UI (contains Message, ReferencesView, etc.)
- `Header.jsx` → Navigation (contains AuthButton)
- `SupabaseAuthProvider` → Wraps entire app
- `ChatHistoryManager` → Manages saved chats

---

## 🔧 DEVELOPMENT GUIDELINES

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### File Naming Conventions
- **Components**: PascalCase (`AstraApp.jsx`)
- **Services**: camelCase (`authService.js`)
- **Hooks**: `use` prefix (`useIsMobile.js`)
- **Routes**: PascalCase (`ArticlePage.jsx`)

### State Management Patterns
1. **Context API**: Auth, Theme
2. **Component State**: UI state, forms
3. **LocalStorage**: Settings, anonymous tracking
4. **Refs**: DOM references, mutable values

### Key Functions & Utilities

#### Citation Handling (AstraApp.jsx)
- `normalizeCitationObject()` - Standardize citation data
- `buildInlineCitations()` - Extract [1] references
- `extractTitle()` - Generate title from URL
- `buildFaviconUrl()` - Get favicon for citations

#### Message Management (AstraApp.jsx)
- `serializeMessageForPersistence()` - Prepare for storage
- `hydrateStoredMessage()` - Restore from storage
- `handleStreamingResponse()` - Process SSE responses

#### Authentication (authService.js)
- `syncUserWithSupabase()` - Sync user data
- `checkAnonymousLimit()` - Verify usage limits
- `createCheckoutSession()` - Start Stripe checkout

---

## 🚀 BUILD & DEPLOYMENT

### Build Process
1. `npm run build` triggers Vite build
2. Articles pre-rendered to static HTML
3. Sitemap generated automatically
4. Output to `/dist` directory

### Article Generation
- Script: `/scripts/generate_articles.py`
- Topics: `/scripts/topics_100.txt`
- Output: `/generated_articles/*.json`

### SEO Optimization
- Server-side rendering for articles
- XML sitemap generation
- Meta tags (Open Graph, Twitter)
- Canonical URLs

---

## 📝 QUICK REFERENCE

### Common Tasks & Locations

| Task | Location | Key Function/Component |
|------|----------|------------------------|
| Add new chat mode | `/src/components/AstraApp.jsx` | Update `mode` state logic |
| Modify auth flow | `/src/services/authService.js` | `syncUserWithSupabase()` |
| Change theme colors | `/src/components/Themes+Styles.jsx` | `colors` object |
| Add new route | `/src/App.jsx` | `<Routes>` component |
| Update header | `/src/components/Header.jsx` | Navigation items |
| Modify chat limits | `/src/services/authService.js` | `checkAnonymousLimit()` |
| Add citation source | `/src/components/AstraApp.jsx` | `normalizeCitationObject()` |
| Change billing tiers | `/src/components/BillingModal.jsx` | Pricing configuration |
| Add new article | `/generated_articles/` | Create JSON + update index |
| Modify sidebar | `/src/components/SidebarView.jsx` | Chat history display |

### Important State Variables (AstraApp.jsx)
- `messages`: Array of chat messages
- `mode`: Current chat mode (search/reason/write)
- `isStreaming`: Response streaming state
- `citations`: Current message citations
- `showReferences`: Reference viewer visibility

### API Endpoints
- Auth: `https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/auth-management`
- Billing: `https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/billing-supabase`
- Chat: `https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/quick-api`

### Debug Console Patterns
The app uses emoji prefixes for console logs:
- 🔧 Configuration
- 📡 API calls
- ✅ Success
- ❌ Errors
- 💾 Data operations
- 🚀 Initialization
- 📊 Analytics

---

## ⚠️ IMPORTANT NOTES

### Security Considerations
- Supabase Row Level Security (RLS) enabled
- HTTP-only cookies for sessions
- Input sanitization with `rehype-sanitize`
- Rate limiting for anonymous users
- HTTPS enforced in production

### Performance Considerations
- Large main component (AstraApp.jsx - consider splitting)
- No lazy loading for routes (optimization opportunity)
- Bundle size can be optimized
- Consider virtual scrolling for long chats

### Known Limitations
- No TypeScript (JavaScript only)
- No automated tests
- No error boundaries
- Limited offline support
- Mobile app not available

### Future Enhancement Opportunities
1. TypeScript migration
2. Test coverage (Jest/Vitest)
3. Code splitting for better performance
4. Offline mode with service workers
5. Mobile app (React Native)
6. Advanced search features
7. Collaborative features
8. Export functionality (PDF/Word)

---

## 📞 CONTACT & SUPPORT

For issues or feedback regarding the application:
- GitHub Issues: Check the repository's issues page
- Privacy Policy: `/public/privacy.html`

---

*This documentation is designed to help AI assistants understand the Astra MD codebase. It should be updated whenever significant architectural changes are made to the application.*

Last Updated: November 2025