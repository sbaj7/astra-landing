# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
ASTRA/
├── src/                              # Frontend source code
│   ├── main.jsx                      # App entry point (hydration logic)
│   ├── App.jsx                       # Root component, routing, providers
│   ├── App.css                       # Global styles
│   ├── index.css                     # Tailwind imports
│   ├── components/                   # React components (~48 files)
│   │   ├── AstraApp.jsx              # Main chat interface (5445 lines)
│   │   ├── Auth/                     # Authentication components
│   │   │   ├── SupabaseAuthProvider.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   ├── AuthButton.jsx
│   │   │   └── PaywallModal.jsx
│   │   ├── Themes+Styles.jsx         # Theme system
│   │   ├── Header.jsx                # Navigation header
│   │   ├── SidebarView.jsx           # Chat history sidebar
│   │   ├── ReferencesView.jsx        # Citation viewer modal
│   │   ├── BillingModal.jsx          # Subscription management
│   │   ├── ProfileModal.jsx          # User profile
│   │   ├── SettingsModal.jsx         # App settings
│   │   └── [35+ more components]
│   ├── routes/                       # Page-level route components
│   │   └── ArticlePage.jsx           # Article display route
│   ├── services/                     # Business logic & API clients
│   │   ├── authService.js            # Auth, billing, chat API (854 lines)
│   │   └── supabaseClient.js         # Supabase SDK initialization
│   ├── hooks/                        # Custom React hooks
│   │   └── useIsMobile.js            # Responsive breakpoint detection
│   ├── utils/                        # Utility functions
│   │   └── reorderArticleCitations.js
│   ├── prerender/                    # SSR utilities
│   │   └── renderArticleDocument.js
│   └── assets/                       # Static assets imported by components
├── supabase/                         # Backend (Supabase Edge Functions)
│   ├── functions/
│   │   ├── auth-management/          # User sync, limits, sessions
│   │   │   └── index.ts
│   │   ├── billing-supabase/         # Stripe checkout & subscriptions
│   │   │   └── index.ts
│   │   ├── stripe-webhook/           # Stripe payment events
│   │   │   └── index.ts
│   │   ├── check-email/              # Email existence check
│   │   │   └── index.ts
│   │   ├── send-email-hook/          # Email sending
│   │   │   ├── index.ts
│   │   │   └── templates.ts
│   │   ├── admin-subscription-manager/ # Manual subscription admin
│   │   │   └── index.ts
│   │   └── deduplicate-customers/    # Stripe customer cleanup
│   │       └── index.ts
│   └── migrations/                   # Database migrations
├── generated_articles/               # Medical knowledge base
│   ├── index.json                    # Article manifest (90+ articles)
│   └── *.json                        # Individual article files
├── scripts/                          # Build & generation tools
│   ├── generate_sitemap.mjs          # XML sitemap builder
│   ├── prerender_articles.mjs        # SSR for articles
│   ├── generate_articles.py          # AI article generator
│   └── siteConfig.mjs                # Site configuration
├── public/                           # Static assets (served as-is)
│   ├── favicon.ico, favicon-*.png
│   ├── og-image.png                  # Social media preview
│   ├── Astrasvg.svg                  # Logo
│   ├── privacy.html                  # Privacy policy
│   └── robots.txt
├── dist/                             # Build output (gitignored)
├── Configuration Files
│   ├── package.json                  # Dependencies & scripts
│   ├── vite.config.js                # Vite build configuration
│   ├── tailwind.config.js            # Tailwind CSS setup
│   ├── eslint.config.js              # Linting rules
│   ├── index.html                    # HTML template
│   └── CLAUDE.md                     # AI assistant documentation
└── .planning/                        # GSD planning documents
    └── codebase/                     # Architecture analysis
```

## Directory Purposes

**`src/components/`:**
- Purpose: All React UI components
- Contains: JSX files for views, modals, overlays, input components
- Key files: `AstraApp.jsx` (main), `Auth/*` (authentication), `*Modal.jsx` (dialogs)

**`src/components/Auth/`:**
- Purpose: Authentication-related components
- Contains: Auth provider, login modal, auth button, paywall modal
- Key files: `SupabaseAuthProvider.jsx` (context), `AuthModal.jsx` (login UI)

**`src/services/`:**
- Purpose: API clients and business logic
- Contains: Supabase client initialization, auth/billing service singleton
- Key files: `authService.js` (all API calls), `supabaseClient.js` (SDK setup)

**`src/routes/`:**
- Purpose: Page-level components for React Router
- Contains: Route components that wrap other components
- Key files: `ArticlePage.jsx` (article viewer)

**`src/hooks/`:**
- Purpose: Custom React hooks for reusable logic
- Contains: Hook files prefixed with `use`
- Key files: `useIsMobile.js` (viewport detection)

**`supabase/functions/`:**
- Purpose: Serverless backend functions (Deno/TypeScript)
- Contains: Edge Function directories, each with `index.ts`
- Key files: `auth-management/index.ts`, `billing-supabase/index.ts`

**`generated_articles/`:**
- Purpose: Pre-generated medical reference articles
- Contains: JSON article files with structured content
- Key files: `index.json` (manifest with metadata)

**`scripts/`:**
- Purpose: Build-time scripts for content generation
- Contains: Node.js (mjs) and Python scripts
- Key files: `generate_sitemap.mjs`, `prerender_articles.mjs`

**`public/`:**
- Purpose: Static assets served at root URL
- Contains: Favicons, images, static HTML, robots.txt
- Key files: `og-image.png`, `privacy.html`

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React app bootstrap, DOM mounting
- `src/App.jsx`: Routing configuration, provider hierarchy
- `index.html`: HTML template with root div

**Configuration:**
- `vite.config.js`: Build tool configuration, custom plugins
- `package.json`: Dependencies, npm scripts
- `tailwind.config.js`: Tailwind CSS customization

**Core Logic:**
- `src/components/AstraApp.jsx`: Main chat interface (5445 lines)
- `src/services/authService.js`: All API communication (854 lines)
- `src/components/Auth/SupabaseAuthProvider.jsx`: Auth state management

**Testing:**
- No test files detected (testing not implemented)

## Naming Conventions

**Files:**
- Components: PascalCase (`AstraApp.jsx`, `BillingModal.jsx`)
- Services: camelCase (`authService.js`, `supabaseClient.js`)
- Hooks: `use` prefix, camelCase (`useIsMobile.js`)
- Routes: PascalCase with `Page` suffix (`ArticlePage.jsx`)
- Edge Functions: kebab-case directories (`auth-management/`, `billing-supabase/`)
- Utilities: camelCase (`reorderArticleCitations.js`)
- Scripts: snake_case with extension (`generate_sitemap.mjs`, `generate_articles.py`)

**Directories:**
- Feature grouping: PascalCase for component folders (`Auth/`)
- Lowercase for non-component directories (`services/`, `hooks/`, `routes/`)

## Where to Add New Code

**New Feature (full feature with UI):**
- Primary code: `src/components/NewFeature.jsx` or folder `src/components/NewFeature/`
- If route needed: Add to `src/routes/NewFeaturePage.jsx`, register in `src/App.jsx`
- Tests: Not applicable (no test framework)

**New Component (UI element):**
- Implementation: `src/components/ComponentName.jsx`
- Follow pattern: Function component with props, use `useTheme()` for colors

**New API Integration:**
- Add methods to: `src/services/authService.js` class
- Or create new service: `src/services/newService.js`
- If backend needed: `supabase/functions/new-function/index.ts`

**New Modal/Dialog:**
- Implementation: `src/components/NewModal.jsx`
- Pattern: Accept `isOpen`, `onClose`, `theme` props
- Integration: Import in `AstraApp.jsx`, add state for visibility

**Utilities:**
- Shared helpers: `src/utils/helperName.js`
- Hooks: `src/hooks/useNewHook.js`

**New Article:**
- Add JSON file: `generated_articles/article-slug.json`
- Update manifest: Add entry to `generated_articles/index.json`

**Backend Function:**
- Create directory: `supabase/functions/function-name/`
- Add entry: `supabase/functions/function-name/index.ts`
- Deploy: `supabase functions deploy function-name`

## Special Directories

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

**`dist/`:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD planning and analysis documents
- Generated: Partially (by analysis tools)
- Committed: Yes

**`__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes (by Python interpreter)
- Committed: No (gitignored)

---

*Structure analysis: 2026-01-19*
