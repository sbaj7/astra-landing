# Research Summary: Image Upload + OpenAI Vision

**Project:** Astra MD Vision Image Analysis
**Synthesized:** 2026-01-19

## Key Findings

### Stack
- **2 new dependencies**: `browser-image-compression` (12KB) + `pdfjs-dist` (500KB code-split)
- **Native APIs for camera**: getUserMedia, Canvas - no library needed
- **OpenAI Vision**: Same Chat Completions API with image content array

### Table Stakes Features
- Click-to-upload, drag-drop, paste, mobile camera
- Image preview before send with remove capability
- Up to 5 images per message
- Image display in conversation

### Architecture
- Extend existing `ImageInputManager.jsx` for multi-image
- New Supabase Edge Function for Vision API calls
- Base64 encoding client-side, no storage needed
- Same SSE streaming pattern for responses

### Critical Pitfalls to Avoid
1. **Base64 size explosion** - compress to 1MB max before encoding
2. **EXIF orientation** - rotate images before sending
3. **PDF memory leaks** - process pages sequentially
4. **Vision API costs** - default to `detail: low`
5. **SSE modifications** - separate upload phase from streaming

## Recommended Build Order

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| 1 | Foundation | ImageInputManager extension + Edge Function |
| 2 | Basic Upload | End-to-end single image flow |
| 3 | Multi-Image | Up to 5 images per message |
| 4 | Camera | Mobile camera capture |
| 5 | PDF | PDF page rendering |
| 6 | Polish | Compression, errors, accessibility |

## Technical Decisions Made

| Decision | Rationale |
|----------|-----------|
| Base64 over URL upload | Simpler, no storage infrastructure |
| Client-side compression | Reduce payload, faster upload |
| `detail: low` default | Cost control ($0.50+ per high-detail request) |
| No image persistence | Privacy, matches PROJECT.md scope |

## Open Questions

1. Verify current OpenAI Vision API pricing
2. Test PDF.js with Vite 6.x worker setup
3. Confirm iOS Safari camera behavior

## Files Created

- `STACK.md` - Technology recommendations
- `FEATURES.md` - Feature categorization
- `ARCHITECTURE.md` - Component design
- `PITFALLS.md` - Common mistakes to avoid

---
*Research synthesized: 2026-01-19*
