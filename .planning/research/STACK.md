# Technology Stack: Image Upload + OpenAI Vision Integration

**Project:** Astra MD Vision Image Analysis
**Researched:** 2026-01-19

## Executive Summary

Minimal new dependencies needed. Leverage existing patterns and native browser APIs. Add `browser-image-compression` for client-side compression and `pdfjs-dist` for PDF rendering.

## Recommended Stack

### Image Upload & Handling

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Native File Input | Browser API | File selection | HIGH |
| browser-image-compression | ^2.0.2 | Client-side compression | MEDIUM |
| Native FileReader API | Browser API | Convert to base64 | HIGH |

### PDF Processing

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| pdfjs-dist | ^4.0.379 | PDF to canvas/images | MEDIUM |

### Camera Capture

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Native getUserMedia | Browser API | Camera access | HIGH |
| Native Canvas API | Browser API | Frame capture | HIGH |

### OpenAI Vision Integration

| Technology | Purpose | Confidence |
|------------|---------|------------|
| OpenAI Chat Completions API | Vision analysis (gpt-4o) | HIGH |
| Base64 encoding | Image transport | HIGH |

## Installation

```bash
npm install browser-image-compression@^2.0.2
npm install pdfjs-dist@^4.0.379
```

## OpenAI Vision Message Format

```javascript
{
  role: "user",
  content: [
    { type: "text", text: "Analyze this medical image" },
    {
      type: "image_url",
      image_url: {
        url: "data:image/jpeg;base64,{base64_data}",
        detail: "high"
      }
    }
  ]
}
```

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Native file input | react-dropzone | Adds 15KB+ for rarely-used drag-drop |
| browser-image-compression | Compressor.js | Better maintained, TS support |
| pdfjs-dist | Server-side | Client keeps data local (privacy) |
| Native getUserMedia | react-webcam | Thin wrapper, not worth dependency |

## Size Impact

| Package | Gzipped Size |
|---------|--------------|
| browser-image-compression | ~12KB |
| pdfjs-dist | ~500KB (code-split) |

---
*Stack research: 2026-01-19*
