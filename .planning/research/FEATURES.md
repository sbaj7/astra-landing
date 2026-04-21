# Feature Landscape: Image Upload + AI Vision Integration

**Project:** Astra MD Vision Image Analysis
**Researched:** 2026-01-19

## Table Stakes

Features users expect. Missing = product feels broken.

### Core Upload Mechanics

| Feature | Complexity | Notes |
|---------|------------|-------|
| Click-to-upload button | Low | Existing `ImageInputManager.jsx` |
| Drag-and-drop | Low | Standard browser API |
| Paste from clipboard | Low | `onpaste` event |
| Image preview before send | Low | Thumbnail in input area |
| Remove image before send | Low | X button on thumbnail |
| Mobile camera capture | Low | `capture="environment"` attribute |
| File size limits | Low | Client-side validation |

### Image Display in Conversation

| Feature | Complexity | Notes |
|---------|------------|-------|
| User images shown in chat | Low | Add `images` to message model |
| Responsive image sizing | Low | CSS max-width |
| Tap to expand | Medium | Lightbox modal |

### Multi-Image Support

| Feature | Complexity | Notes |
|---------|------------|-------|
| Up to 5 images per message | Medium | Grid layout |
| Image count indicator | Low | "3/5 images" |
| Individual remove | Low | Per-image X button |

## Differentiators

### Medical-Specific

| Feature | Complexity | Value |
|---------|------------|-------|
| Confidence indicators | Medium | Trust building |
| Image quality feedback | Medium | "Image too blurry" warning |
| Medical disclaimer | Low | Liability protection |
| "Images not stored" messaging | Low | Trust building |

## Anti-Features (DO NOT BUILD)

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Permanent image storage | HIPAA liability |
| Auto-upload on select | Privacy, accidental uploads |
| Definitive diagnoses | Medical liability |
| Hidden disclaimers | Legal exposure |

## MVP Recommendation

### Must Have (MVP)
1. Click-to-upload button
2. Image preview before send
3. Remove image capability
4. Image display in conversation
5. Basic error handling
6. Integration with all chat modes
7. Mobile camera support
8. Medical disclaimer
9. "Images not stored" messaging

### Defer to Post-MVP
- Drag & drop
- Paste from clipboard
- Multi-image (start with single)
- Lightbox view
- DICOM support
- Annotation tools

## Complexity Estimates

| Feature | Effort |
|---------|--------|
| Basic Upload UI | 1-2 days |
| Preview & Remove | 1 day |
| Message Model Update | 0.5 days |
| API Integration | 2-3 days |
| Multi-Image Support | 2-3 days |
| Image in Chat Display | 1 day |

**Total MVP:** 8-12 days

---
*Features research: 2026-01-19*
