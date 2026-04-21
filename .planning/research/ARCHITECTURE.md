# Architecture: Image Upload + OpenAI Vision Integration

**Project:** Astra MD Vision Image Analysis
**Researched:** 2026-01-19

## Overview

Extend existing React + Supabase architecture. Process images client-side, send base64 to Edge Function, call OpenAI Vision API.

## Component Boundaries

### Frontend Components

| Component | Responsibility | Files |
|-----------|---------------|-------|
| ImagePicker | File selection | New: `ImagePicker.jsx` |
| CameraCapture | Camera access/capture | New: `CameraCapture.jsx` |
| PDFRenderer | PDF to image conversion | New: `PDFRenderer.jsx` |
| ImageInputManager | Coordinate state, validate | Extend existing |
| AttachmentPreview | Show pending images | New: `AttachmentPreview.jsx` |
| InputBar | Send with images | Modify in AstraApp.jsx |
| Message | Display images | Extend existing |

### Backend Components

| Component | Responsibility | Files |
|-----------|---------------|-------|
| vision-api | Handle multimodal requests | New Edge Function |

## Data Flow

### Image Upload Flow

```
1. User selects image → File object
2. Validate MIME type, size
3. Compress if needed
4. Convert to base64
5. Show preview thumbnail
6. User clicks send
7. Build message with text + images
8. POST to Vision Edge Function
9. Edge Function → OpenAI Vision API
10. SSE stream response back
```

### OpenAI Vision Message Format

```javascript
{
  role: "user",
  content: [
    { type: "text", text: "What's in this medical image?" },
    {
      type: "image_url",
      image_url: {
        url: "data:image/jpeg;base64,/9j/...",
        detail: "high"
      }
    }
  ]
}
```

## Patterns to Follow

### 1. Base64 Image Payload
Send images as base64 in request body. Simpler than pre-uploading to storage.

### 2. Image Compression
Compress client-side before encoding. Target 1MB max per image.

### 3. Observable State Manager
Use existing `ImageInputManager` pattern with observer/subscription model.

## Anti-Patterns to Avoid

### 1. Storing Images in State Permanently
Memory bloat. Store only thumbnails for display.

### 2. Synchronous Image Processing
Blocks UI. Use async/await.

### 3. No File Validation
Security risk. Validate MIME types.

### 4. Auto-upload Without Consent
Privacy concern. Show preview, require explicit send.

## Suggested Build Order

### Phase 1: Foundation
- Extend ImageInputManager for multi-image
- Create vision-api Edge Function
- Add attachment preview to InputBar

### Phase 2: Basic Image Upload
- File picker integration
- Modify handleSend for images
- Image display in messages

### Phase 3: Camera Capture
- Camera access component
- Mobile-specific handling

### Phase 4: PDF Support
- PDF.js integration
- Page extraction

### Phase 5: Polish
- Compression optimization
- Error handling

## Integration Points

### AstraApp.jsx handleSend (line ~4819)

Current:
```javascript
body: JSON.stringify({
  query: queryToSend,
  mode: currentMode,
  stream: true
})
```

Modified:
```javascript
body: JSON.stringify({
  query: queryToSend,
  images: selectedImages.map(img => ({
    data: img.data,
    type: img.type
  })),
  mode: currentMode,
  stream: true
})
```

---
*Architecture research: 2026-01-19*
