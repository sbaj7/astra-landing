# Phase 6: Vision API Backend - Research

**Researched:** 2026-01-20
**Domain:** Supabase Edge Functions + OpenAI Vision API
**Confidence:** HIGH

## Summary

This phase extends the existing chat backend to support image analysis via OpenAI's Vision API. The existing infrastructure (Supabase Edge Functions, SSE streaming, auth/limits) provides a solid foundation. The key work is constructing the OpenAI multimodal message format and forwarding the streaming response.

Research confirms gpt-4o-mini supports vision with the same message format as gpt-4o. Images are sent as base64 data URLs in the `content` array. The `detail: auto` parameter (user decision) lets OpenAI optimize token usage. Streaming works identically to text-only requests - the Edge Function forwards the SSE stream directly.

**Primary recommendation:** Create a new `vision-api` Edge Function that constructs multimodal messages and streams responses. Extend existing auth patterns. Use mode-specific system prompts when images are sent without text.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenAI Chat Completions API | v1 | Vision analysis | Official API, gpt-4o-mini supports images |
| Supabase Edge Functions | Deno runtime | Backend proxy | Existing infrastructure |
| Native fetch | Deno | API calls with streaming | Built-in, no dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Deno.env | Built-in | Secret access | OPENAI_API_KEY retrieval |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct fetch | OpenAI SDK for Deno | SDK adds complexity; fetch is simpler for streaming |
| New endpoint | Extend quick-api | Separate function cleaner for distinct concern |

**Installation:**
```bash
# No npm install needed - Edge Functions use Deno imports
# Set secret in Supabase dashboard or CLI:
supabase secrets set OPENAI_API_KEY=sk-xxx
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
├── vision-api/
│   └── index.ts          # Main handler
├── auth-management/      # Existing - reuse patterns
└── billing-supabase/     # Existing - reuse patterns
```

### Pattern 1: Multimodal Message Construction
**What:** Build OpenAI message format with text + images
**When to use:** Every request with images

```typescript
// Source: OpenAI Vision API documentation
// https://platform.openai.com/docs/guides/images-vision

interface ImagePayload {
  data: string;   // base64 data URL: "data:image/jpeg;base64,..."
  type: string;   // MIME type
}

interface VisionRequest {
  query: string;
  images: ImagePayload[];
  mode: 'search' | 'reason' | 'write' | 'standard';
  stream: boolean;
}

function buildMessages(request: VisionRequest, systemPrompt: string) {
  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [];

  // Add text if present
  if (request.query.trim()) {
    content.push({ type: "text", text: request.query });
  }

  // Add images
  for (const image of request.images) {
    content.push({
      type: "image_url",
      image_url: {
        url: image.data,  // Already includes "data:image/jpeg;base64,..."
        detail: "auto"    // Let OpenAI decide based on image size
      }
    });
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content }
  ];
}
```

### Pattern 2: SSE Stream Forwarding
**What:** Forward OpenAI's streaming response directly to client
**When to use:** All vision requests (per user decision)

```typescript
// Source: Supabase Edge Functions + OpenAI streaming docs
// https://github.com/orgs/supabase/discussions/13124

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

async function streamVisionResponse(messages: any[], apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  // Forward the stream directly
  return new Response(response.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
```

### Pattern 3: Mode-Specific Default Prompts
**What:** Provide context when user sends image without text
**When to use:** Images with empty/minimal text input

```typescript
// Source: User decision in 06-CONTEXT.md

const MODE_DEFAULT_PROMPTS: Record<string, string> = {
  search: "Please analyze this medical image and provide relevant clinical information with evidence-based references.",
  reason: "Please analyze this medical image and provide clinical reasoning, including differential diagnoses and next steps.",
  write: "Please analyze this medical image and generate appropriate clinical documentation.",
  standard: "Please analyze this image and describe what you see."
};

function getEffectiveQuery(query: string, mode: string): string {
  if (query.trim().length > 0) {
    return query;
  }
  return MODE_DEFAULT_PROMPTS[mode] || MODE_DEFAULT_PROMPTS.standard;
}
```

### Anti-Patterns to Avoid

- **Echoing image data back:** Backend should NOT include image base64 in response. Frontend already has images for display.
- **Storing images:** Process and discard immediately (HIPAA-friendly per user decision)
- **Blocking on large payloads:** Use streaming throughout; don't buffer entire response
- **Hardcoded API keys:** Always use `Deno.env.get("OPENAI_API_KEY")`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Custom parser | Forward stream directly | OpenAI already sends valid SSE |
| Rate limiting | Custom limiter | Existing auth-management check-limit | Reuse existing infrastructure |
| Request validation | Basic checks | Structured validation + error responses | Edge cases are numerous |
| Retry logic | Simple retry | Exponential backoff with max retries | Network issues need proper handling |

**Key insight:** The existing SSEStream.jsx on the client handles all stream parsing. The Edge Function just needs to forward the OpenAI stream with proper headers.

## Common Pitfalls

### Pitfall 1: Base64 Payload Size Limits
**What goes wrong:** Large images cause timeouts or memory issues
**Why it happens:** 5 images at 4MB each = 20MB+ after base64 encoding
**How to avoid:** Trust client-side compression (already implemented in Phase 2). Server-side validation is defense-in-depth only.
**Warning signs:** Slow responses, timeouts on image-heavy requests

### Pitfall 2: Missing CORS Headers
**What goes wrong:** Browser blocks response
**Why it happens:** Forgetting headers on error responses
**How to avoid:** Include CORS headers on ALL responses (success and error)
**Warning signs:** Console errors about CORS policy

### Pitfall 3: Vision API Token Costs
**What goes wrong:** Unexpectedly high bills
**Why it happens:** gpt-4o-mini uses more tokens per image than gpt-4o but at lower per-token cost
**How to avoid:** `detail: auto` (user decision) lets OpenAI optimize. Monitor usage.
**Warning signs:** Token counts seem high relative to image count

### Pitfall 4: Stream Not Starting
**What goes wrong:** Client waits indefinitely
**Why it happens:** Missing `text/event-stream` content-type or connection headers
**How to avoid:** Exact headers pattern: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
**Warning signs:** No SSE events in network tab, but request shows 200

### Pitfall 5: Error Response Format Mismatch
**What goes wrong:** Client can't parse error
**Why it happens:** Error returns JSON but client expects SSE
**How to avoid:** For streaming requests, wrap errors in SSE format: `data: {"error": "message"}\n\ndata: [DONE]\n\n`
**Warning signs:** Client shows "Bad server response" on API errors

## Code Examples

Verified patterns from official sources:

### Complete Edge Function Structure
```typescript
// Source: Existing auth-management/index.ts pattern + OpenAI docs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const MEDICAL_SYSTEM_PROMPT = `You are a medical AI assistant helping healthcare professionals analyze medical images.
Provide evidence-based analysis while noting that AI analysis should supplement, not replace, clinical judgment.
Be specific about what you observe but appropriately cautious about definitive diagnoses.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const body = await req.json();
    const { query, images, mode, stream } = body;

    // Validate request
    if (!images || !Array.isArray(images) || images.length === 0) {
      return errorResponse("At least one image is required", 400);
    }

    // Build messages
    const effectiveQuery = getEffectiveQuery(query || "", mode || "standard");
    const messages = buildMessages({ query: effectiveQuery, images, mode, stream }, MEDICAL_SYSTEM_PROMPT);

    // Make OpenAI request
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        max_tokens: 4096
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI error:", openaiResponse.status, errorText);
      return handleOpenAIError(openaiResponse.status, errorText);
    }

    // Forward streaming response
    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error) {
    console.error("[vision-api] Error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function handleOpenAIError(status: number, errorText: string) {
  let userMessage = "Image analysis failed. Please try again.";

  if (status === 429) {
    userMessage = "Too many requests. Please wait a moment and try again.";
  } else if (status === 400 && errorText.includes("image")) {
    userMessage = "Image could not be processed. Please try a different image format.";
  } else if (status === 413 || errorText.includes("too large")) {
    userMessage = "Image is too large. Please use a smaller image.";
  }

  return errorResponse(userMessage, status >= 500 ? 502 : status);
}
```

### Client-Side Request (frontend reference)
```javascript
// Source: Existing AstraApp.jsx handleSend pattern
// Frontend sends images in this format:
const response = await fetch(import.meta.env.VITE_VISION_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_API_KEY,
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({
    query: queryToSend,
    images: selectedImages.map(img => ({
      data: img.data,  // "data:image/jpeg;base64,..."
      type: img.type   // "image/jpeg"
    })),
    mode: currentMode,
    stream: true
  })
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gpt-4-vision-preview | gpt-4o-mini | July 2024 | Cost-effective vision, same API format |
| URL-only images | Base64 data URLs | Always supported | Enables no-storage pattern |
| Non-streaming vision | Streaming vision | GPT-4o launch | Better UX, same SSE format |

**Deprecated/outdated:**
- `gpt-4-vision-preview`: Superseded by gpt-4o family
- Separate vision endpoints: Unified into chat/completions

## Open Questions

Things that couldn't be fully resolved:

1. **Exact token count for gpt-4o-mini images**
   - What we know: gpt-4o-mini uses more tokens per image than gpt-4o
   - What's unclear: Exact multiplier varies; community reports 25-33x
   - Recommendation: Use `detail: auto` and monitor actual usage

2. **Vision API fallback when down**
   - What we know: User decided text-only fallback message
   - What's unclear: Best UX for partial failure (some images work)
   - Recommendation: All-or-nothing for v1; if Vision fails, return fallback message

## Sources

### Primary (HIGH confidence)
- OpenAI Vision API documentation - message format, detail parameter, streaming
- Supabase Edge Functions patterns - existing auth-management/index.ts for CORS, error handling
- SSEStream.jsx - existing client-side stream handling
- 06-CONTEXT.md - user decisions on model, detail level, auth integration

### Secondary (MEDIUM confidence)
- Supabase GitHub discussions #13124 - SSE streaming patterns
- OpenAI community forums - gpt-4o-mini token usage observations

### Tertiary (LOW confidence)
- Community pricing observations - token multiplier claims need monitoring

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing Supabase patterns + official OpenAI API
- Architecture: HIGH - Follows existing Edge Function patterns exactly
- Pitfalls: HIGH - Based on prior project research + official docs
- Token costs: MEDIUM - Community observations, needs monitoring

**Research date:** 2026-01-20
**Valid until:** 60 days (OpenAI API is stable; gpt-4o-mini unlikely to change)
