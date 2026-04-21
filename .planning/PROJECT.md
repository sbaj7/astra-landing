# Astra MD — Vision Image Analysis

## What This Is

AI-powered clinical decision support system for healthcare professionals. Users can chat with an AI assistant across multiple modes (search, reason, write) to get evidence-based medical knowledge, differential diagnosis reasoning, and clinical documentation assistance. This milestone adds the ability to upload medical images and PDF documents for OpenAI Vision analysis.

## Core Value

Healthcare professionals can analyze medical images and documents through AI-powered vision capabilities to support clinical decision-making.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase -->

- ✓ User can chat with AI in multiple modes (search, reason, write) — existing
- ✓ User can sign up/sign in with email, password, or OAuth — existing
- ✓ User receives streaming AI responses with citations — existing
- ✓ User can save and restore chat history — existing
- ✓ User is rate-limited based on subscription tier (Free/Plus/Pro) — existing
- ✓ User can subscribe via Stripe checkout — existing
- ✓ User can browse medical reference articles — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] User can attach images to chat messages (upload from device)
- [ ] User can capture images via device camera
- [ ] User can attach up to 5 images per message
- [ ] User can preview attached images before sending
- [ ] User can remove individual images before sending
- [ ] User can upload PDF documents for visual analysis
- [ ] PDF pages are converted to images for Vision API
- [ ] Images are sent to OpenAI Vision API for analysis
- [ ] Image analysis works across all chat modes (search, reason, write, standard)
- [ ] Image uploads count against existing chat limits

### Out of Scope

- Real-time video analysis — complexity too high for v1
- Image storage/history — images processed in-memory only, not persisted
- Image editing/annotation — out of scope for initial release
- Non-OpenAI vision providers — sticking with existing OpenAI integration
- HIPAA compliance certification — user responsibility for now

## Context

**Existing Architecture:**
- React 19 SPA with Supabase BaaS backend
- Chat logic centralized in `AstraApp.jsx` (5445 lines)
- SSE streaming via `SSEStream.jsx` for real-time responses
- OpenAI API already integrated for text chat
- Supabase Edge Functions handle API proxying

**Technical Considerations:**
- OpenAI Vision API accepts base64-encoded images or URLs
- PDF-to-image conversion needed client-side (pdf.js or similar)
- Mobile camera access via `getUserMedia` API
- File input with `accept="image/*,application/pdf"`
- Image compression may be needed to stay within API limits

**User Research:**
- Healthcare professionals frequently need to analyze X-rays, lab results, skin conditions
- PDF lab reports and medical documents are common inputs
- Mobile usage is significant — camera capture is valuable

## Constraints

- **Tech Stack**: React/JavaScript frontend, Supabase Edge Functions backend — no new frameworks
- **API Provider**: OpenAI Vision (GPT-4.1 or compatible) — already integrated
- **File Size**: OpenAI Vision has size limits — may need client-side compression
- **Browser Support**: Modern browsers with File API and getUserMedia support

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side PDF rendering | Avoids server-side processing, keeps images in-memory | — Pending |
| Base64 encoding for images | Simpler than URL-based upload, no storage needed | — Pending |
| Max 5 images per message | Balance between utility and API cost/complexity | — Pending |

---
*Last updated: 2026-01-19 after initialization*
