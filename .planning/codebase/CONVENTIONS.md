# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- Components: PascalCase with `.jsx` extension (`AstraApp.jsx`, `BillingModal.jsx`, `ReferencesView.jsx`)
- Services: camelCase with `.js` extension (`authService.js`, `supabaseClient.js`)
- Hooks: `use` prefix with camelCase (`useIsMobile.js`)
- Routes: PascalCase with `Page` suffix (`ArticlePage.jsx`)

**Functions:**
- camelCase for all functions (`handleCitationClick`, `normalizeCitationObject`, `buildFaviconUrl`)
- Event handlers use `handle` prefix (`handleCloseLanding`, `handleCopyAll`, `handleClearHistory`)
- Boolean getters use `is`/`has` prefix (`isHttpUrl`, `hasManualSubscription`)
- Utility functions are descriptive verbs (`extractTitle`, `truncateSnippet`, `formatTimestamp`)

**Variables:**
- camelCase for variables and state (`isDark`, `isLoading`, `showLanding`)
- Boolean state uses `is`/`show`/`has` prefix (`isPresented`, `showCopied`, `hasChildNodes`)
- Constants use SCREAMING_SNAKE_CASE (`DEFAULT_APP_SETTINGS`, `ACCENT_COLOR_MAP`, `AUTH_API_URL`)
- Private/internal methods prefixed with underscore (`_setAnonymousLimitCache`, `_getAnonymousLimitCache`)

**Components:**
- PascalCase for component names (`MermaidDiagram`, `PopupMenuItem`, `Badge`)
- Props destructured with defaults in function signature
- Export pattern: `export default ComponentName;` at file end

## Code Style

**Formatting:**
- No Prettier configured (manual formatting)
- 2-space indentation
- Single quotes for strings (except JSX attributes which use double quotes)
- Semicolons at end of statements
- Trailing commas in multi-line arrays/objects

**Linting:**
- ESLint 9 with flat config (`eslint.config.js`)
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Rule: `no-unused-vars` with pattern `^[A-Z_]` to ignore unused capitalized variables
- Rule: `react-refresh/only-export-components` with `allowConstantExport: true`

## Import Organization

**Order:**
1. React and React libraries (`import React, { useState, useEffect } from 'react'`)
2. Third-party libraries (`import { X, Check } from 'lucide-react'`)
3. Local components (`import AuthButton from './Auth/AuthButton'`)
4. Local services/hooks (`import authService from '../services/authService.js'`)
5. Styles (`import './App.css'`)

**Path patterns:**
- Relative imports used throughout (no path aliases)
- Include `.jsx`/`.js` extension in imports (`import App from './App.jsx'`)

## Error Handling

**Patterns:**
- Try-catch blocks with console.error for API calls
- Emoji-prefixed console logs for debugging context:
  - Success: `console.log('✅ ...')`
  - Error: `console.error('❌ ...')`
  - Warning: `console.warn('⚠️ ...')`
  - API calls: `console.log('📡 ...')`
  - Configuration: `console.log('🔧 ...')`
  - Billing: `console.log('💳 ...')`
  - Data: `console.log('💾 ...')`
  - Cookie: `console.log('🍪 ...')`

**Example from `authService.js`:**
```javascript
try {
  const response = await fetch(url, { /* ... */ });
  console.log(`📥 Response from ${endpoint}:`, response.status, responseText);
  // ...
} catch (error) {
  console.error(`❌ Failed to call ${endpoint}:`, error);
  return this.handleLocalFallback(endpoint, data);
}
```

**Fallback patterns:**
- Services provide local fallback methods when API fails (`handleLocalFallback`)
- URL parsing wrapped in try-catch returning null on failure
- Graceful degradation with default return values

## Logging

**Framework:** Browser console with emoji prefixes

**Patterns:**
- Development logging with emoji context markers
- Template literals for interpolated values
- Multiple arguments passed to console methods for structured output

```javascript
console.log('🔄 Syncing Supabase user with backend:', normalizedUser);
console.log(`📥 Response from ${endpoint}:`, response.status, responseText);
```

## State Management

**Primary:** React Context API

**Context Patterns:**
1. `ThemeContext` in `src/components/Themes+Styles.jsx` - Theme colors and dark mode
2. `SupabaseAuthContext` in `src/components/Auth/SupabaseAuthProvider.jsx` - Authentication state

**Context implementation pattern:**
```javascript
const SomeContext = createContext(null);

export const useSomeContext = () => {
  const context = useContext(SomeContext);
  if (!context) {
    throw new Error('useSomeContext must be used within SomeProvider');
  }
  return context;
};

export const SomeProvider = ({ children }) => {
  // state and methods
  const value = useMemo(() => ({ /* ... */ }), [/* deps */]);
  return (
    <SomeContext.Provider value={value}>
      {children}
    </SomeContext.Provider>
  );
};
```

**Local State:**
- `useState` for component-level state
- `useRef` for mutable values that don't trigger re-renders
- `useMemo` for expensive computations
- `useCallback` for memoized callbacks passed to children

**Persistence:**
- LocalStorage for app settings and anonymous tracking
- Cookies via `js-cookie` for anonymous ID (`astra_anonymous_id`)
- Keys follow pattern: `astra_` prefix (`astra_has_seen_landing`, `astra_limit_${id}`)

## Function Design

**Size:** Functions tend to be small to medium (10-50 lines), except for main components

**Parameters:**
- Destructured objects for multiple optional params: `function({ email, redirectTo, mode } = {})`
- Default values in destructuring: `const { theme = 'system' } = options`
- Optional chaining used extensively: `citation?.url`, `response?.data?.session`

**Return Values:**
- Null/undefined for "not found" cases
- Objects with consistent shape for normalized data
- Boolean for validation functions

## Component Design

**Props Pattern:**
- Destructure props in function signature with defaults
- Pass `theme` object to children for consistent styling
- Use `isMobile` boolean for responsive variations

```javascript
const BillingModal = ({
  isOpen,
  onClose,
  theme,
  subscription,
  isMobile = false
}) => {
  if (!isOpen) return null;
  // ...
};
```

**Inline Styles:**
- Inline styles via `style={{}}` prop (not CSS classes)
- Theme colors accessed via `theme.textPrimary`, `theme.backgroundSurface`, etc.
- Opacity added via hex suffix: `${theme.textSecondary}25`

**Event Handlers:**
- Defined inline or as const within component
- Named with `handle` prefix
- Passed down as `onXxx` props

## Class-based Services

**Pattern from `authService.js`:**
```javascript
class AuthService {
  constructor() {
    this.someState = this.initializeState();
  }

  async someMethod(param) {
    // implementation
  }
}

export default new AuthService();  // Singleton export
```

## Model Classes

**Pattern from `Message.jsx`:**
```javascript
class Message {
  constructor({ role, content, citations = [] }) {
    this.id = crypto.randomUUID();
    this.role = role;
    this.content = content;
    this.citations = citations;
    this.timestamp = new Date();
  }

  toJSON() { /* ... */ }
  static fromJSON(obj) { /* ... */ }
  copy(updates = {}) { /* ... */ }
}
```

## Comments

**When to Comment:**
- Section markers: `// MARK: - Section Name`
- Complex logic explanation
- TODO/FIXME markers

**JSDoc:** Not consistently used; no TypeScript

## Module Design

**Exports:**
- Default export for main component/class
- Named exports for utilities and types
- Single responsibility per file

```javascript
// Named exports for utilities
export const useMessage = () => { /* ... */ };
export const messageUtils = { /* ... */ };

// Named exports for types/classes
export { Message, Citation, InlineCitation };

// Default export for primary
export default Message;
```

---

*Convention analysis: 2026-01-19*
