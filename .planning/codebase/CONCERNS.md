# Technical Concerns

**Analysis Date:** 2026-01-19

## Technical Debt

| Area | Issue | Impact | Suggested Fix |
|------|-------|--------|---------------|
| `src/components/AstraApp.jsx` | Monolithic component at 5,445 lines with 117 React hooks | **High** - Difficult to maintain, test, debug; high cognitive load | Split into smaller components: separate InputBar, MessageList, Sidebar into own files; extract business logic to custom hooks |
| `src/components/AstraApp.jsx` | 36 useCallback/useMemo calls creating complex dependency chains | **Medium** - Hard to trace re-renders, potential stale closures | Consolidate related callbacks; consider useReducer for complex state |
| `src/services/authService.js` | API key hardcoded in source at line 7 | **High** - Security risk; key exposed in client bundle | Move to environment variable (already have VITE_API_KEY pattern elsewhere) |
| `src/` | 183 console.log/warn/error calls across 19 files | **Low** - Debug noise in production; slight performance impact | Implement proper logging service with log levels; strip in production builds |
| `src/` | No PropTypes or TypeScript type checking | **Medium** - Runtime type errors possible; harder to refactor safely | Add PropTypes as minimum; consider TypeScript migration |
| `src/` | No test files in src/ (only in node_modules) | **Critical** - No automated testing; regressions undetected | Add Jest/Vitest with React Testing Library; start with critical paths |
| `src/components/` | Large components: LandingOverlay (1188 lines), ClinicalArticleView (1071 lines) | **Medium** - Same maintainability issues as AstraApp | Apply same component splitting strategy |
| `src/components/Extensions.jsx` | DEBUG console.log on line 78 left in production code | **Low** - Exposes implementation details | Remove debug statements before production |
| `src/` | No ErrorBoundary components found | **High** - Unhandled errors crash entire app | Add ErrorBoundary around critical component trees |

## Security Concerns

- **Hardcoded API Key** (`src/services/authService.js:7`) - Supabase anon key is directly in source code. While anon keys are meant to be public, this pattern encourages bad habits and the key should still come from environment variables.

- **dangerouslySetInnerHTML Usage** - 6 instances across files:
  - `src/components/StreamingMarkdownView.jsx:42`
  - `src/components/ClinicalArticlesModal.jsx:418`
  - `src/components/SuperscriptedMarkdown.jsx:80`
  - `src/components/AstraApp.jsx:3727`
  - `src/components/ClinicalArticleView.jsx:225, 697`

  Uses `rehype-sanitize` which mitigates XSS risk, but any misconfiguration could expose vulnerabilities.

- **innerHTML Assignment** (`src/components/RichTextView.jsx:48`, `src/components/AstraApp.jsx:154`) - Direct DOM manipulation for Mermaid diagrams. Mermaid's `securityLevel: 'loose'` at line 122 of AstraApp.jsx increases XSS surface area.

- **LocalStorage for Auth State** - Anonymous user limits stored in localStorage (`src/services/authService.js:98,109`) can be manipulated by users to bypass rate limits. Server-side validation exists but client-side limits are bypassable.

- **Admin API Key in Client** - Admin functions in authService.js reference `VITE_ADMIN_API_KEY` (lines 644, 688, 728, 768) - admin keys should never be exposed to client; these endpoints should be backend-only.

## Performance Issues

- **Massive Bundle from AstraApp.jsx** - 5,445 lines in single component means:
  - Large initial parse time
  - No code splitting possible for this component
  - All markdown/mermaid dependencies loaded upfront

- **No Lazy Loading** - All routes loaded eagerly in `src/App.jsx`. KnowledgePage, FeaturesPage, PricingPage could be lazy-loaded.

- **117 Hook Instances** in AstraApp.jsx - Each useState/useCallback/useEffect adds overhead; many likely trigger unnecessary re-renders.

- **Console Logging in SSEStream** (`src/components/SSEStream.jsx`) - 29 console calls during streaming operations; performance impact during real-time updates.

- **Global CSS in Component** (`src/components/AstraApp.jsx:3725-4100`) - ~375 lines of CSS injected via dangerouslySetInnerHTML on every render. Should be external stylesheet.

## Fragile Areas

- `src/components/AstraApp.jsx` - Central nervous system of app; any change here risks breaking multiple features. High coupling between state variables.

- `src/services/authService.js` - 853 lines handling auth, billing, chat persistence, admin functions. Single class with too many responsibilities.

- `src/components/Auth/SupabaseAuthProvider.jsx` - Session management with complex state synchronization. Changes could break auth flow across entire app.

- Citation processing in AstraApp.jsx (lines 253-439) - Complex normalization logic with multiple edge cases. No tests to verify behavior.

- `handleSend` function (AstraApp.jsx:4819-5091) - 272 lines handling user input, rate limiting, streaming, persistence. Single function doing too much.

## Missing Capabilities

- **Test Suite** - No automated tests. Manual testing only increases regression risk and deployment anxiety.

- **Error Boundaries** - No React error boundaries. Unhandled promise rejections or render errors crash entire application.

- **Loading/Error States** - Many async operations lack proper loading and error UI feedback.

- **Offline Support** - No service worker or offline capability. App completely fails without network.

- **Accessibility Testing** - No a11y audit evident. Some aria-labels present but coverage unknown.

- **Performance Monitoring** - No performance tracking (Core Web Vitals, error tracking service like Sentry).

- **Code Splitting** - No React.lazy() usage for route-based or component-based code splitting.

## Test Coverage Gaps

**Untested Area** | **Files** | **Risk** | **Priority**
-----------------|-----------|----------|-------------
Authentication flow | `src/services/authService.js`, `src/components/Auth/*` | Users unable to sign in/out | **Critical**
Chat streaming | `src/components/AstraApp.jsx`, `src/components/SSEStream.jsx` | Core feature failure undetected | **Critical**
Citation parsing | `src/components/AstraApp.jsx` (lines 253-439) | Malformed citations break UI | **High**
Billing/Subscription | `src/services/authService.js` (billing methods) | Payment issues unnoticed | **High**
Rate limiting | Anonymous limit logic | Abuse prevention fails | **Medium**

## Recommendations

1. **Split AstraApp.jsx Immediately** - Extract into:
   - `ChatView.jsx` - Message display and streaming
   - `InputBar.jsx` (already internal, move to own file)
   - `ChatModeManager.jsx` - Mode switching logic
   - `useChatState.js` - Custom hook for chat state
   - `useStreamingResponse.js` - SSE handling logic

2. **Add Error Boundaries** - Wrap at minimum:
   - Chat message area
   - Sidebar
   - Modal components

3. **Implement Test Suite** - Start with:
   - `authService.js` unit tests (most critical business logic)
   - Integration tests for auth flow
   - Component tests for message rendering

4. **Move Secrets to Environment Variables** - Remove hardcoded API key from authService.js line 7.

5. **Add Route-Based Code Splitting** - Use React.lazy for non-critical routes.

6. **Extract CSS** - Move GlobalChromeStyles content to external stylesheet.

7. **Remove Admin Client Endpoints** - Admin functions referencing VITE_ADMIN_API_KEY should be server-side only.

8. **Add Production Logging Service** - Replace console.* with structured logging that can be stripped/leveled in production.

---

*Concerns audit: 2026-01-19*
