# Domain Pitfalls: Image Upload + OpenAI Vision Integration

**Project:** Astra MD Vision Image Analysis
**Researched:** 2026-01-19

## Critical Pitfalls

### Pitfall 1: Base64 Payload Size Explosion

**What:** 4MB image → 5.3MB base64 → memory/timeout issues. 5 images = 40MB+ payloads.

**Prevention:**
1. Mandatory client-side compression (target 1MB max)
2. Explicit file size limits with user feedback
3. Progressive JPEG quality reduction

**Phase:** Phase 1 - implement compression before API work

---

### Pitfall 2: Mobile Camera EXIF Orientation

**What:** Camera images have EXIF rotation metadata. Images analyzed upside-down.

**Prevention:**
1. Read EXIF orientation tag
2. Apply canvas rotation before encoding
3. Test with fresh camera captures, not gallery

**Phase:** Phase 1 - camera implementation

---

### Pitfall 3: PDF Page-to-Image Memory Leak

**What:** PDF.js canvas elements persist in memory. 20-page PDF = 500MB+ crash.

**Prevention:**
1. Process pages sequentially
2. Null canvas references, set `canvas.width = 0`
3. Implement page limit (max 10 for mobile)

**Phase:** Phase 2 - PDF processing

---

### Pitfall 4: Vision API Token/Cost Explosion

**What:** `detail: high` on 5 images = $0.50-1.00+ per request.

**Prevention:**
1. Default to `detail: low` (65 tokens fixed)
2. Offer high detail as explicit user choice
3. Resize to API-optimal dimensions (768px for low)

**Phase:** Phase 3 - API design decision

---

### Pitfall 5: Streaming + Images = Broken SSE

**What:** SSEStream.jsx is text-only. Image requests need different handling.

**Prevention:**
1. Separate upload phase from streaming phase in UI
2. Show "Uploading images..." then "Analyzing..."
3. Update timeout for Vision (30-60 seconds)

**Phase:** Phase 3 - must modify SSEStream.jsx

---

## Moderate Pitfalls

### Pitfall 6: getUserMedia Permission Dance
Test HTTPS early. Handle "permission denied" gracefully.

### Pitfall 7: Image Preview Memory Bloat
Generate actual thumbnails, not full images in state.

### Pitfall 8: Inconsistent Image Formats
iPhone HEIC needs conversion. Validate after selection.

### Pitfall 9: No Compression Quality Feedback
Warn users when significant compression applied.

### Pitfall 10: Cold Start + Vision = Timeout
Implement function warming. Increase client timeout.

---

## Minor Pitfalls

### Pitfall 11: Drag-Drop on Mobile
Implement touch alternatives from start.

### Pitfall 12: No Accessibility
Add ARIA labels to all image UI.

### Pitfall 13: Chat History Image Context
Images not persisted. Add "[Image attachment]" placeholder.

---

## Phase-Specific Warnings

| Phase | Pitfalls | Priority |
|-------|----------|----------|
| Phase 1 | #1, #2, #6, #7, #8, #9 | Compression first |
| Phase 2 | #3, #1 | Sequential processing |
| Phase 3 | #4, #5, #10 | `detail` level decision |
| Phase 4+ | #13 | Persistence scope |

---
*Pitfalls research: 2026-01-19*
