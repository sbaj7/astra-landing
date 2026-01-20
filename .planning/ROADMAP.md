# Roadmap: Astra MD Vision Image Analysis

## Overview

This roadmap delivers AI-powered image analysis capabilities to Astra MD, enabling healthcare professionals to upload medical images and PDF documents for OpenAI Vision analysis. The journey progresses from basic image upload UI through multi-image support, camera capture, PDF processing, and Vision API integration, culminating in polished chat display and usage limit integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Image Upload Foundation** - Basic upload UI with click, drag-drop, preview, and validation
- [x] **Phase 2: Image Compression** - Client-side compression pipeline for API size limits
- [x] **Phase 3: Multi-Image Support** - Attach up to 5 images per message
- [x] **Phase 4: Camera Capture** - Mobile device camera integration
- [x] **Phase 5: PDF Support** - PDF document upload and page rendering
- [ ] **Phase 6: Vision API Backend** - Edge function for OpenAI Vision API
- [ ] **Phase 7: Mode Integration** - Vision analysis across all chat modes with streaming
- [ ] **Phase 8: Chat Display and Polish** - Image display, lightbox, limits, and quality feedback

## Phase Details

### Phase 1: Image Upload Foundation
**Goal**: Users can attach images to chat messages via click or drag-and-drop with preview and removal
**Depends on**: Nothing (first phase)
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-05, UPLD-06
**Success Criteria** (what must be TRUE):
  1. User can click upload button and select images from device file picker
  2. User can drag and drop images onto the chat input area
  3. User sees thumbnail preview of attached images before sending
  4. User can click X on preview to remove an attached image
  5. User sees clear error message when selecting invalid file type or oversized file
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Extend ImageInputManager for multi-image state and validation
- [x] 01-02-PLAN.md — Add upload button to InputBar and create ImagePreviewStrip
- [x] 01-03-PLAN.md — Add drag-and-drop handlers and error display

### Phase 2: Image Compression
**Goal**: Images are automatically compressed client-side to meet API size limits
**Depends on**: Phase 1
**Requirements**: UPLD-07
**Success Criteria** (what must be TRUE):
  1. Large images (>1MB) are automatically compressed before upload
  2. Compression happens transparently without user intervention
  3. Image quality remains acceptable after compression
**Plans**: 1 plan in 1 wave

Plans:
- [x] 02-01-PLAN.md — Install browser-image-compression, create compression utility, integrate into addImages flow

### Phase 3: Multi-Image Support
**Goal**: Users can attach multiple images (up to 5) per message
**Depends on**: Phase 2
**Requirements**: MULT-01, MULT-02, MULT-03
**Success Criteria** (what must be TRUE):
  1. User can add up to 5 images to a single message
  2. User sees image count indicator showing current/max (e.g., "3/5 images")
  3. User can remove individual images from the multi-image selection
  4. Upload button is disabled when 5 images are attached
**Plans**: 1 plan in 1 wave

Plans:
- [x] 03-01-PLAN.md — Add image count indicator to ImagePreviewStrip (MULT-01 and MULT-03 already complete from Phase 1)

### Phase 4: Camera Capture
**Goal**: Mobile users can capture photos directly using device camera
**Depends on**: Phase 3
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04
**Success Criteria** (what must be TRUE):
  1. User on mobile device can tap camera icon to open camera capture
  2. User sees helpful message when camera permission is denied
  3. User can switch between front and back camera
  4. Captured images display with correct orientation regardless of device position
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Create CameraCapture modal component with video preview and capture, add camera button to InputBar
- [x] 04-02-PLAN.md — Add camera switching and permission denied error UI with platform guidance

### Phase 5: PDF Support
**Goal**: Users can upload PDF documents for visual analysis
**Depends on**: Phase 3
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. User can select PDF files in the file picker
  2. PDF pages are converted to images for Vision API processing
  3. User sees loading indicator during PDF page rendering
**Plans**: 2 plans in 2 waves

Plans:
- [x] 05-01-PLAN.md — Install pdfjs-dist, configure worker, create processPdfToImages utility
- [x] 05-02-PLAN.md — Update file input to accept PDFs, add loading indicator, handle edge cases

### Phase 6: Vision API Backend
**Goal**: Backend infrastructure for sending images to OpenAI Vision API
**Depends on**: Phase 2
**Requirements**: VIS-01
**Success Criteria** (what must be TRUE):
  1. Supabase Edge Function accepts base64-encoded images
  2. Edge Function forwards images to OpenAI Vision API
  3. API response is returned to client
**Plans**: TBD

Plans:
- [ ] 06-01: Vision API Edge Function
- [ ] 06-02: Base64 payload handling and API integration

### Phase 7: Mode Integration
**Goal**: Image analysis works across all chat modes with streaming responses
**Depends on**: Phase 6
**Requirements**: VIS-02, VIS-03, VIS-04, VIS-05, VIS-06
**Success Criteria** (what must be TRUE):
  1. Image analysis works correctly in search mode
  2. Image analysis works correctly in reason mode
  3. Image analysis works correctly in write mode
  4. Image analysis works correctly in standard chat mode
  5. User sees streaming response during image analysis (not blocked until complete)
**Plans**: TBD

Plans:
- [ ] 07-01: Search mode image integration
- [ ] 07-02: Reason mode image integration
- [ ] 07-03: Write mode image integration
- [ ] 07-04: Standard chat image integration
- [ ] 07-05: SSE streaming with image payloads

### Phase 8: Chat Display and Polish
**Goal**: Images display properly in chat with lightbox, limits integration, and quality feedback
**Depends on**: Phase 7
**Requirements**: DISP-01, DISP-02, DISP-03, VIS-07, LIM-01, LIM-02
**Success Criteria** (what must be TRUE):
  1. User's uploaded images display inline within their chat messages
  2. Images are responsive and fit within chat bubble without overflow
  3. User can tap/click image to view full-size in lightbox overlay
  4. User sees feedback message when image quality is insufficient for analysis
  5. Image analysis counts against user's existing chat limits
  6. User sees updated remaining limit count after image analysis
**Plans**: TBD

Plans:
- [ ] 08-01: Chat message image display component
- [ ] 08-02: Full-size lightbox overlay
- [ ] 08-03: Quality feedback messaging
- [ ] 08-04: Usage limits integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Image Upload Foundation | 3/3 | Complete | 2026-01-20 |
| 2. Image Compression | 1/1 | Complete | 2026-01-20 |
| 3. Multi-Image Support | 1/1 | Complete | 2026-01-20 |
| 4. Camera Capture | 2/2 | Complete | 2026-01-20 |
| 5. PDF Support | 2/2 | Complete | 2026-01-20 |
| 6. Vision API Backend | 0/2 | Not started | - |
| 7. Mode Integration | 0/5 | Not started | - |
| 8. Chat Display and Polish | 0/4 | Not started | - |

---
*Roadmap created: 2026-01-19*
*Depth: comprehensive (8 phases)*
*Total v1 requirements: 26*
