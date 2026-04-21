# Technology Stack

**Analysis Date:** 2026-01-19

## Languages & Runtime

**Primary:**
- JavaScript (ES2020+) — All frontend and utility scripts
- TypeScript — Supabase Edge Functions (Deno runtime)

**Secondary:**
- Python — Article generation scripts (`/scripts/generate_articles.py`)
- HTML/CSS — Static markup and styling

**Runtime:**
- Node.js — Frontend development and build tooling
- Deno — Supabase Edge Functions runtime (std@0.168.0)

**Package Manager:**
- npm — Primary package management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React ^19.1.0 — UI framework, main application
- React DOM ^19.1.0 — DOM rendering with hydration support
- React Router DOM ^7.9.3 — Client-side routing

**Styling:**
- TailwindCSS ^4.1.10 — Utility-first CSS framework
- @tailwindcss/typography ^0.5.15 — Prose styling plugin

**Build/Dev:**
- Vite ^6.3.5 — Build tool and dev server
- @vitejs/plugin-react ^4.4.1 — React Fast Refresh support
- PostCSS ^8.5.6 — CSS processing
- Autoprefixer ^10.4.21 — CSS vendor prefixing

**Testing:**
- Not detected — No test framework configured

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.45.0 | Supabase client for auth, database, storage |
| react-markdown | ^10.1.0 | Markdown rendering in chat responses |
| lucide-react | ^0.522.0 | Icon library |
| mermaid | ^10.9.0 | Diagram rendering in markdown |
| katex | ^0.16.11 | LaTeX math rendering |
| js-cookie | ^3.0.5 | Cookie management for anonymous tracking |
| rehype-highlight | ^7.0.2 | Code syntax highlighting |
| rehype-katex | ^7.0.1 | KaTeX rendering integration |
| rehype-raw | ^7.0.0 | Raw HTML in markdown |
| rehype-sanitize | ^6.0.0 | HTML sanitization for security |
| rehype-slug | ^6.0.0 | Heading IDs for anchors |
| rehype-autolink-headings | ^7.1.0 | Auto-link headings |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown |
| remark-math | ^6.0.0 | Math notation support |
| unist-util-visit | ^5.0.0 | AST traversal for markdown processing |

**Supabase Edge Function Dependencies (Deno):**
| Package | Version | Purpose |
|---------|---------|---------|
| stripe | ^14.21.0 | Payment processing |
| @supabase/supabase-js | ^2.39.5 | Database operations |
| resend | ^4.0.1 | Transactional email sending |
| standardwebhooks | ^1.0.0 | Webhook signature verification |

## Build & Dev Tools

**Linting:**
- ESLint ^9.25.0 — JavaScript/JSX linting
- eslint-plugin-react-hooks ^5.2.0 — React hooks rules
- eslint-plugin-react-refresh ^0.4.19 — Fast Refresh compatibility

**Type Checking:**
- @types/react ^19.1.2 — React type definitions (dev only)
- @types/react-dom ^19.1.2 — React DOM type definitions (dev only)

**Build Scripts:**
- `npm run dev` — Start Vite dev server
- `npm run build` — Build + prerender articles + generate sitemap
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite build config, custom plugin for article copying |
| `tailwind.config.js` | TailwindCSS content paths, typography plugin |
| `eslint.config.js` | ESLint flat config with React rules |
| `postcss.config.js` | PostCSS plugins (implied by Tailwind) |
| `index.html` | HTML template with meta tags, Open Graph |
| `.env` | Production environment variables |
| `.env.local` | Local development overrides |

## Environment Variables

**Frontend (VITE_ prefixed):**
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_URL` | Quick API endpoint |
| `VITE_API_KEY` | API authentication key |
| `VITE_BILLING_API_URL` | Billing function endpoint |
| `VITE_STRIPE_PLUS_PRICE_ID` | Stripe Plus plan price ID |
| `VITE_STRIPE_PRO_PRICE_ID` | Stripe Pro plan price ID |
| `VITE_ADMIN_API_KEY` | Admin operations key |

**Edge Functions (Deno.env):**
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin ops |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `STRIPE_PLUS_PRICE_ID` | Plus plan price ID |
| `STRIPE_PRO_PRICE_ID` | Pro plan price ID |
| `RESEND_API_KEY` | Resend email API key |
| `SEND_EMAIL_HOOK_SECRET` | Auth hook webhook secret |
| `EMAIL_FROM` | Sender email address |
| `SITE_URL` | Production site URL |
| `PUBLIC_SITE_URL` | Public-facing site URL |

## Platform Requirements

**Development:**
- Node.js (version not specified, likely 18+)
- npm for package management
- Deno for edge function development (optional, deployed to Supabase)

**Production:**
- Static site hosting (output to `dist/`)
- Supabase project for backend services
- Stripe account for payment processing
- Resend account for transactional emails
- Domain: `astramd.org`

## Module System

- ES Modules (`"type": "module"` in package.json)
- Vite handles module bundling
- Dynamic imports for code splitting (React lazy not currently used)

---

*Stack analysis: 2026-01-19*
