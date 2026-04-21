# Phase 6: Vision API Backend - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend infrastructure for sending images to OpenAI Vision API. Extends existing chat edge function to accept images in the message payload and forward them to OpenAI's Vision-capable model. Returns streaming responses like regular chat.

Mode-specific integration (search/reason/write behavior) is Phase 7. Chat display and persistence is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Request format
- Images sent in same request as chat message (not separate upload)
- Claude's discretion on payload structure (array of base64 or structured objects)
- Mode-specific default prompts when user sends image without text:
  - Search mode: medical literature search context
  - Reason mode: clinical reasoning context
  - Write mode: documentation context
  - Standard: general analysis

### API configuration
- Model: `gpt-4o-mini` (faster, cost-effective, good quality)
- Detail level: `auto` (let OpenAI decide based on image size)
- Streaming: Yes, SSE streaming like existing chat
- System prompt: Medical-aware context to guide Vision analysis

### Error responses
- Rate limits: User-friendly message ("Too many requests. Please wait...")
- Unanalyzable images: Return OpenAI's natural response (let model explain)
- API errors: Helpful specifics ("Image too large", "Invalid format") so user can fix
- Vision API down: Text-only fallback ("Image analysis unavailable. I can help with text questions.")

### Auth & security
- Same auth as chat: Anonymous users get limited access, logged-in users full access
- Usage limits: Shared with chat (counts against same daily limit)
- API key: Read from Supabase secrets
- No image storage: Process and discard (HIPAA-friendly)
- Frontend handles image display: Backend doesn't echo image data back

### Claude's Discretion
- Exact payload structure for images
- Server-side size validation (defense in depth vs trust client)
- Retry logic for transient failures
- Exact system prompt wording for medical context

</decisions>

<specifics>
## Specific Ideas

- "Work like ChatGPT" — user uploads images, model scans and provides answer
- Use existing chat API infrastructure, extend rather than create separate endpoint
- Leverage existing streaming SSE implementation

</specifics>

<deferred>
## Deferred Ideas

- Image persistence in chat history — Phase 8 (Chat Display and Polish)
- Mode-specific Vision behavior tuning — Phase 7 (Mode Integration)

</deferred>

---

*Phase: 06-vision-api-backend*
*Context gathered: 2026-01-20*
