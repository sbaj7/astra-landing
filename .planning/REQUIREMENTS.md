# Requirements: Astra MD Vision Image Analysis

**Defined:** 2026-01-19
**Core Value:** Healthcare professionals can analyze medical images and documents through AI-powered vision capabilities

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Image Upload

- [ ] **UPLD-01**: User can click upload button to select images from device
- [ ] **UPLD-02**: User can drag and drop images onto the input area
- [ ] **UPLD-03**: User sees preview thumbnail of selected image before sending
- [ ] **UPLD-04**: User can remove a selected image before sending
- [ ] **UPLD-05**: User sees clear error message for invalid file types
- [ ] **UPLD-06**: User sees clear error message when file exceeds size limit
- [x] **UPLD-07**: Images are compressed client-side before upload (target 1MB)

### Multi-Image Support

- [ ] **MULT-01**: User can attach up to 5 images per message
- [ ] **MULT-02**: User sees image count indicator (e.g., "3/5 images")
- [ ] **MULT-03**: User can remove individual images from multi-image selection

### Camera Capture

- [ ] **CAM-01**: User can capture photo using device camera on mobile
- [ ] **CAM-02**: User sees appropriate message when camera permission is denied
- [ ] **CAM-03**: User can switch between front and back camera
- [ ] **CAM-04**: Camera captures correct orientation (EXIF handling)

### PDF Support

- [ ] **PDF-01**: User can upload PDF documents
- [ ] **PDF-02**: PDF pages are converted to images for Vision API analysis
- [ ] **PDF-03**: User sees loading indicator during PDF processing

### Vision API Integration

- [ ] **VIS-01**: Images are sent to OpenAI Vision API for analysis
- [ ] **VIS-02**: Image analysis works in search mode
- [ ] **VIS-03**: Image analysis works in reason mode
- [ ] **VIS-04**: Image analysis works in write mode
- [ ] **VIS-05**: Image analysis works in standard chat mode
- [ ] **VIS-06**: User sees streaming response during analysis
- [ ] **VIS-07**: User sees feedback when image quality is insufficient

### Chat Display

- [ ] **DISP-01**: User's uploaded images display in chat conversation
- [ ] **DISP-02**: Images are responsive and fit within chat bubble
- [ ] **DISP-03**: User can tap/click image to view in full-size lightbox

### Usage Limits

- [ ] **LIM-01**: Image analysis counts against existing chat limits
- [ ] **LIM-02**: User sees remaining limit after image analysis

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Upload

- **UPLD-08**: User can paste images from clipboard (Cmd+V)
- **UPLD-09**: User can reorder images before sending

### Advanced PDF

- **PDF-04**: User can select specific pages from multi-page PDF
- **PDF-05**: User sees page preview thumbnails for PDFs

### Enhanced Analysis

- **VIS-08**: User sees confidence indicators on AI findings
- **VIS-09**: User can request high-detail analysis for specific images

### Persistence

- **PERS-01**: Images persist with chat history (optional)
- **PERS-02**: User can re-analyze previously uploaded images

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Permanent image storage | HIPAA liability, privacy concerns |
| Real-time video analysis | High complexity, not essential for v1 |
| DICOM viewer integration | Specialized format, high complexity |
| Image annotation tools | High complexity, defer to v2+ |
| Definitive medical diagnoses | Liability, AI limitations |
| Image sharing between users | Privacy violation concerns |
| Server-side image processing | Client-side simpler, preserves privacy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPLD-01 | Phase 1 | Complete |
| UPLD-02 | Phase 1 | Complete |
| UPLD-03 | Phase 1 | Complete |
| UPLD-04 | Phase 1 | Complete |
| UPLD-05 | Phase 1 | Complete |
| UPLD-06 | Phase 1 | Complete |
| UPLD-07 | Phase 2 | Complete |
| MULT-01 | Phase 3 | Pending |
| MULT-02 | Phase 3 | Pending |
| MULT-03 | Phase 3 | Pending |
| CAM-01 | Phase 4 | Pending |
| CAM-02 | Phase 4 | Pending |
| CAM-03 | Phase 4 | Pending |
| CAM-04 | Phase 4 | Pending |
| PDF-01 | Phase 5 | Pending |
| PDF-02 | Phase 5 | Pending |
| PDF-03 | Phase 5 | Pending |
| VIS-01 | Phase 6 | Pending |
| VIS-02 | Phase 7 | Pending |
| VIS-03 | Phase 7 | Pending |
| VIS-04 | Phase 7 | Pending |
| VIS-05 | Phase 7 | Pending |
| VIS-06 | Phase 7 | Pending |
| VIS-07 | Phase 8 | Pending |
| DISP-01 | Phase 8 | Pending |
| DISP-02 | Phase 8 | Pending |
| DISP-03 | Phase 8 | Pending |
| LIM-01 | Phase 8 | Pending |
| LIM-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-20 after Phase 2 completion*
