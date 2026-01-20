# Phase 7: Mode Integration - Research

**Researched:** 2026-01-20
**Domain:** React Frontend Integration - Vision API with Chat Modes
**Confidence:** HIGH

## Summary

This phase integrates the Vision API (completed in Phase 6) with the existing chat mode system in AstraApp.jsx. The goal is simple: when users send images with their messages, the handleSend function should route to the Vision API instead of the standard chat API, while preserving all mode-specific behaviors (search with citations, reason with differential diagnosis formatting, write for documentation, standard for general chat).

Research confirms that all necessary infrastructure already exists:
- Vision API Edge Function is deployed and working (Phase 6)
- `sendVisionRequest` function is ready in authService.js
- Image state management via `useImageInputManager` hook provides selectedImages
- SSE streaming parsing is identical between Vision API and chat API (same OpenAI format)
- Mode-specific system prompts are already configured in the Vision API backend

**Primary recommendation:** Modify handleSend in AstraApp.jsx to detect when images are present and route to sendVisionRequest instead of the regular chat fetch. The streaming response handling can reuse the existing processStreamLine function with minimal changes.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Existing app uses React |
| authService.js | N/A | sendVisionRequest function | Phase 6 created this for Vision API calls |
| useImageInputManager | N/A | Image state management | Phase 1-5 established this pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AbortController | Native | Cancel streaming requests | User clicks stop during Vision response |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Modify handleSend | Create separate handleSendWithImages | Separate function increases duplication; single function with branch is cleaner |
| Direct fetch | SSEStream class | SSEStream adds complexity; direct reader pattern already works in handleSend |

**Installation:**
```bash
# No new dependencies needed - all infrastructure exists from Phase 6
```

## Architecture Patterns

### Recommended Flow

```
User sends message with images
    |
    v
handleSend() checks: selectedImages.length > 0?
    |                           |
    | NO                        | YES
    v                           v
Regular chat API          sendVisionRequest()
    |                           |
    v                           v
Same streaming handling <-------+
    |
    v
processStreamLine() (unchanged)
    |
    v
Display streaming response
```

### Pattern 1: Conditional API Routing in handleSend

**What:** Branch based on presence of images
**When to use:** Every message send

```javascript
// Source: Existing handleSend pattern with Vision API integration
const handleSend = async () => {
  if ((!query.trim() && (!selectedImages || selectedImages.length === 0)) || isLoading || isStreaming) return;

  // ... existing limit checking and user message creation ...

  // Include images in user message for display (NEW)
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: query.trim(),
    images: selectedImages.length > 0 ? selectedImages.map(img => ({
      id: img.id,
      data: img.data,
      type: img.type
    })) : undefined,
    wasInReasonMode: currentMode === 'reason',
    wasInWriteMode: currentMode === 'write',
    timestamp: new Date()
  };

  // ... existing state updates ...

  try {
    let response;

    if (selectedImages && selectedImages.length > 0) {
      // Route to Vision API
      response = await sendVisionRequest({
        query: queryToSend,
        images: selectedImages.map(img => ({
          data: img.data,
          type: img.type
        })),
        mode: currentMode
      });
    } else {
      // Existing chat API path (unchanged)
      response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { /* ... existing ... */ },
        body: JSON.stringify({
          query: queryToSend,
          isClinical: false,
          isReason: currentMode === 'reason',
          isWrite: currentMode === 'write',
          mode: currentMode,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });
    }

    // ... existing streaming handling (works for both APIs) ...
  } catch (error) {
    // ... existing error handling ...
  }
};
```

### Pattern 2: Image Display in User Messages

**What:** Show image thumbnails in the chat message bubble
**When to use:** When user message contains images

```javascript
// Source: Existing Message component pattern
// User messages with images need to display them
const UserMessageWithImages = ({ message, theme }) => {
  return (
    <div>
      {message.images && message.images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {message.images.map((img, idx) => (
            <img
              key={img.id || idx}
              src={img.data}
              alt={`Attachment ${idx + 1}`}
              style={{
                maxWidth: 200,
                maxHeight: 200,
                borderRadius: 8,
                objectFit: 'cover'
              }}
            />
          ))}
        </div>
      )}
      {message.content && <span>{message.content}</span>}
    </div>
  );
};
```

### Pattern 3: Mode-Specific Behavior Preservation

**What:** Vision API respects mode context
**When to use:** Already configured in backend

The Vision API Edge Function (from Phase 6) already handles mode-specific prompts:
- `search`: Returns clinical info with references
- `reason`: Returns differential diagnoses and next steps
- `write`: Generates clinical documentation
- `standard`: General image analysis

**No frontend changes needed for mode behavior** - the backend handles this via MODE_DEFAULT_PROMPTS.

### Anti-Patterns to Avoid

- **Creating separate streaming handlers:** The processStreamLine function works for both APIs since they return identical SSE format from OpenAI
- **Storing images in chat persistence:** Images should NOT be persisted (HIPAA-friendly per PROJECT.md decisions). The `serializeMessageForPersistence` should strip image data
- **Sending images to both APIs:** Only send to Vision API when images present, never to regular chat API
- **Mode-specific frontend routing:** The backend handles mode differences; frontend just passes the mode string

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing for Vision | New parser | Existing processStreamLine | Same OpenAI SSE format |
| Image state | New state | useImageInputManager | Already manages selectedImages |
| API call | New fetch | sendVisionRequest | Phase 6 created this function |
| Abort handling | New controller | Existing abortControllerRef | Already wired up for streaming |
| Mode prompts | Frontend logic | Backend MODE_DEFAULT_PROMPTS | Already implemented in vision-api/index.ts |

**Key insight:** The streaming format from OpenAI Vision API is identical to the text chat API. The same reader loop and processStreamLine function handle both.

## Common Pitfalls

### Pitfall 1: Forgetting to Clear Images After Send

**What goes wrong:** Images persist in UI after message sent
**Why it happens:** clearAllImages() must be called at the right time
**How to avoid:** Call `clearAllImages()` immediately after capturing `selectedImages` for the request
**Warning signs:** Same images appear attached to subsequent messages

```javascript
// Correct order in handleSend:
const imagesToSend = [...selectedImages]; // Capture before clearing
const queryToSend = query.trim();
setQuery('');
clearAllImages(); // Clear immediately after capture
// Now use imagesToSend for the request
```

### Pitfall 2: AbortController Not Passed to sendVisionRequest

**What goes wrong:** User can't stop Vision API streaming
**Why it happens:** sendVisionRequest doesn't currently accept AbortSignal
**How to avoid:** Either modify sendVisionRequest to accept signal, or handle abort at the reader level
**Warning signs:** Stop button doesn't work during image analysis

```javascript
// Option 1: Modify sendVisionRequest (recommended)
export async function sendVisionRequest({ query, images, mode, signal }) {
  const response = await fetch(url, {
    // ...existing options...
    signal // Pass through
  });
  return response;
}

// Option 2: Abort at reader level (existing pattern)
// The reader.read() will throw on abort, existing catch handles it
```

### Pitfall 3: Citations Processing for Vision Responses

**What goes wrong:** Vision responses lack citations, but search mode expects them
**Why it happens:** Vision API doesn't return citations like search API
**How to avoid:** Vision responses don't include citations - this is expected. Citation reordering should skip when collectedCitations is empty.
**Warning signs:** Empty citation array is fine for Vision; don't show "no citations" error

```javascript
// Existing code already handles this:
const shouldReorder = currentMode === 'search' || currentMode === 'literature-review' || currentMode === 'reason';
const { reorderedCitations, updatedContent } = shouldReorder && collectedCitations.length > 0
  ? reorderCitationsByAppearance(...)
  : { reorderedCitations: [], updatedContent: trimmedAssistantContent };
```

### Pitfall 4: Image Data in Persisted Messages

**What goes wrong:** Large base64 images saved to database
**Why it happens:** Message serialization includes all properties
**How to avoid:** Strip image.data from persisted messages; keep only metadata if needed
**Warning signs:** Chat session load is slow, storage grows rapidly

```javascript
// Modify serializeMessageForPersistence:
const serializeMessageForPersistence = (message) => {
  const serialized = { ...existingLogic };

  // Strip image data but keep metadata for UI
  if (message.images) {
    serialized.images = message.images.map(img => ({
      id: img.id,
      type: img.type,
      // Explicitly exclude: data, file
      hadImage: true // Flag that this message had images
    }));
  }

  return serialized;
};
```

### Pitfall 5: Mode Switcher Disabled During Vision Streaming

**What goes wrong:** Mode can be changed mid-analysis
**Why it happens:** isStreaming check exists but might not cover all paths
**How to avoid:** Existing `isDisabled={isStreaming || isLoading}` on ModeSwitcher already handles this
**Warning signs:** User switches mode during Vision response causing confusion

## Code Examples

Verified patterns from existing codebase:

### Main Integration Point in handleSend

```javascript
// Source: AstraApp.jsx handleSend - lines ~5300-5320
// Modified to support Vision API routing

// BEFORE (text only):
const response = await fetch(import.meta.env.VITE_API_URL, {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    query: queryToSend,
    mode: currentMode,
    stream: true
  }),
  signal: abortControllerRef.current.signal
});

// AFTER (with Vision support):
import { sendVisionRequest } from './services/authService.js';

let response;
if (selectedImages && selectedImages.length > 0) {
  // Vision API path
  response = await sendVisionRequest({
    query: queryToSend,
    images: selectedImages.map(img => ({ data: img.data, type: img.type })),
    mode: currentMode
    // Note: Add signal support to sendVisionRequest
  });
} else {
  // Existing chat API path (unchanged)
  response = await fetch(import.meta.env.VITE_API_URL, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({
      query: queryToSend,
      mode: currentMode,
      stream: true
    }),
    signal: abortControllerRef.current.signal
  });
}

// Rest of streaming handling unchanged - same SSE format
const reader = response.body?.getReader();
// ... existing loop with processStreamLine ...
```

### sendVisionRequest with AbortSignal

```javascript
// Source: authService.js - modified from Phase 6 to add signal support

/**
 * Send images to Vision API for analysis
 * @param {Object} params
 * @param {string} params.query - User's text query (can be empty)
 * @param {Array<{data: string, type: string}>} params.images - Images with base64 data URLs
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
    signal // Add signal for abort support
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Vision API error: ${response.status}`);
  }

  return response;
}
```

### User Message with Images in Chat Display

```javascript
// Source: Message rendering in AstraApp.jsx
// Add image display to user message bubbles

// In Message component or similar:
{message.role === 'user' && message.images && message.images.length > 0 && (
  <div style={{
    display: 'flex',
    gap: '8px',
    marginBottom: message.content ? '8px' : 0,
    flexWrap: 'wrap'
  }}>
    {message.images.map((img, idx) => (
      <img
        key={img.id || idx}
        src={img.data}
        alt={`Attached image ${idx + 1}`}
        style={{
          maxWidth: '200px',
          maxHeight: '150px',
          borderRadius: '8px',
          objectFit: 'cover',
          border: `1px solid ${theme.borderLight}`
        }}
      />
    ))}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate endpoints for image/text | Unified chat completions with multimodal content | GPT-4o launch (2024) | Single API handles both |
| Non-streaming vision | Streaming vision responses | GPT-4o launch (2024) | Same SSE handling as text |
| Client-side mode handling | Backend mode prompts | Phase 6 | Frontend just passes mode string |

**Deprecated/outdated:**
- gpt-4-vision-preview: Replaced by gpt-4o-mini (Phase 6 decision)
- Separate vision parsing: Same SSE format means no special parsing needed

## Open Questions

Things that couldn't be fully resolved:

1. **Images in chat history display after reload**
   - What we know: Images are NOT persisted (per PROJECT.md decision)
   - What's unclear: Should we show a placeholder for "had images" in history?
   - Recommendation: For Phase 7, just don't persist image data. Phase 8 (polish) can add placeholder UI if needed.

2. **Citations in Vision mode for search**
   - What we know: Vision API doesn't return citations (no Tavily integration)
   - What's unclear: Should search mode + images behave differently?
   - Recommendation: Accept that Vision responses don't have citations. User sees analysis without references.

3. **Error recovery for partial image failures**
   - What we know: Backend validates "at least one image"
   - What's unclear: What if 3 of 5 images fail compression?
   - Recommendation: Existing addImages handles this at upload time, not send time. Phase 7 scope is mode integration, not upload improvements.

## Sources

### Primary (HIGH confidence)
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/AstraApp.jsx` - handleSend function, streaming patterns
- `/Users/mbele/Desktop/DEV2/ASTRA/src/services/authService.js` - sendVisionRequest function (Phase 6)
- `/Users/mbele/Desktop/DEV2/ASTRA/supabase/functions/vision-api/index.ts` - Backend mode handling
- `/Users/mbele/Desktop/DEV2/ASTRA/.planning/phases/06-vision-api-backend/06-RESEARCH.md` - Phase 6 decisions

### Secondary (MEDIUM confidence)
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/ImageInputManager.jsx` - Image state structure
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/SSEStream.jsx` - SSE parsing reference

### Tertiary (LOW confidence)
- None - all findings based on existing codebase review

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase patterns
- Architecture: HIGH - Simple conditional routing, no new abstractions
- Pitfalls: HIGH - Based on code review and Phase 6 decisions
- Integration points: HIGH - Clear modification points identified

**Research date:** 2026-01-20
**Valid until:** 90 days (integration pattern unlikely to change)
