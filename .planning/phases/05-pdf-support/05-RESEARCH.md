# Phase 5: PDF Support - Research

**Researched:** 2026-01-20
**Domain:** PDF rendering, client-side document processing
**Confidence:** HIGH

## Summary

PDF support for Vision API requires rendering PDF pages to images client-side using PDF.js (pdfjs-dist). The library renders PDF pages to HTML5 canvas elements, which can then be exported as JPEG data URLs using `canvas.toDataURL()`. This integrates well with the existing `addImages()` flow in ImageInputManager.

The main complexity is PDF.js worker configuration with Vite, which requires explicit worker source setup. The most reliable approach is copying the worker to the public folder and using a static path. Multi-page PDFs must respect the existing MAX_IMAGES=5 limit, requiring page selection UI or automatic truncation.

**Primary recommendation:** Use pdfjs-dist directly (not react-pdf wrapper), copy worker to public folder, render at scale 2.0 for quality, convert to JPEG at 0.85 quality, and integrate through existing addImages() with async processing feedback.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfjs-dist | 5.4.530 | PDF parsing and rendering | Mozilla's official library, industry standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| browser-image-compression | 2.0.2 (already installed) | Compress rendered pages | If rendered pages exceed size limits |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfjs-dist | react-pdf | react-pdf is a wrapper; direct pdfjs-dist gives more control for our canvas-to-image use case |
| pdfjs-dist | pdf.js CDN | CDN adds external dependency; npm package better for build process |

**Installation:**
```bash
npm install pdfjs-dist
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ImageInputManager.jsx     # Existing - add PDF processing
│   └── PdfProcessor.jsx          # NEW - PDF rendering logic
└── utils/
    └── pdfUtils.js               # NEW - PDF helper functions (optional)
```

### Pattern 1: Worker Configuration (Vite)
**What:** PDF.js requires a web worker for parsing. Vite hashes files, breaking dynamic worker resolution.
**When to use:** Always - required for PDF.js to function
**Solution:** Copy worker to public folder, use static path

```javascript
// In component that uses PDF.js
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source to static public path
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

**Build step (package.json):**
```json
{
  "scripts": {
    "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"
  }
}
```

### Pattern 2: File Input to Canvas to Image
**What:** Complete pipeline from PDF file selection to image data for Vision API
**When to use:** When user selects a PDF file
**Example:**
```javascript
// Source: PDF.js examples and community patterns
async function renderPdfPageToImage(pdfDoc, pageNum, scale = 2.0) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  // Convert to JPEG data URL (0.85 quality balances size and clarity)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // Clean up
  page.cleanup();

  return dataUrl;
}
```

### Pattern 3: Loading PDF from File Input
**What:** Convert user-selected File to PDF.js document
**When to use:** When handling file input change event
**Example:**
```javascript
// Source: PDF.js documentation and GitHub examples
async function loadPdfFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdfDoc = await loadingTask.promise;

  return pdfDoc;
}
```

### Anti-Patterns to Avoid
- **Don't use CDN for worker:** Breaks in offline/restricted network environments
- **Don't render all pages upfront:** Memory hog for large PDFs; render on-demand
- **Don't skip page cleanup:** Call `page.cleanup()` after rendering to free memory
- **Don't use PNG for rendered pages:** JPEG is significantly smaller, sufficient for Vision API

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF parsing | Custom parser | pdfjs-dist | PDF spec is incredibly complex (1000+ pages) |
| Worker communication | Manual postMessage | pdfjs-dist worker | Handles threading, memory management |
| Canvas scaling | Manual viewport math | page.getViewport({ scale }) | Handles rotation, cropbox, mediabox |
| Large image compression | Manual resize | browser-image-compression (already installed) | Handles quality/size tradeoffs |

**Key insight:** PDF.js abstracts enormous complexity. The library handles font subsetting, image decoding, path rendering, text extraction, and more. Attempting to parse PDFs manually would be a multi-month project.

## Common Pitfalls

### Pitfall 1: Worker 404 Errors
**What goes wrong:** PDF.js fails with "Setting up fake worker" or 404 errors
**Why it happens:** Vite hashes files, breaking pdfjs-dist's dynamic import of worker
**How to avoid:** Copy worker to public/ folder, use static path
**Warning signs:** Console errors about worker, PDF loading fails silently

### Pitfall 2: Memory Leaks with Large PDFs
**What goes wrong:** Memory grows unbounded when processing multi-page PDFs
**Why it happens:** PDF.js caches rendered pages; canvas elements persist
**How to avoid:**
- Call `page.cleanup()` after rendering each page
- Call `pdfDoc.destroy()` when done with document
- Limit pages rendered (MAX_IMAGES constraint helps here)
**Warning signs:** Browser tab memory grows, eventual crash on large PDFs

### Pitfall 3: Rendering Quality Too Low
**What goes wrong:** Vision API can't read text in rendered images
**Why it happens:** Scale factor too low (default is 1.0)
**How to avoid:** Use scale 2.0-3.0 for readable text
**Warning signs:** Text appears blurry in preview, OCR fails

### Pitfall 4: JPEG Quality vs File Size
**What goes wrong:** Rendered pages exceed 3.75MB limit
**Why it happens:** High scale + high JPEG quality = large files
**How to avoid:** Use JPEG quality 0.85; if still too large, compress with browser-image-compression
**Warning signs:** Size validation fails after PDF processing

### Pitfall 5: Blocking UI During Processing
**What goes wrong:** UI freezes while rendering PDF pages
**Why it happens:** Canvas rendering is synchronous on main thread
**How to avoid:** Show loading indicator, process pages sequentially with microtasks
**Warning signs:** No visual feedback, appears frozen

## Code Examples

Verified patterns from official sources:

### Complete PDF Processing Function
```javascript
// Source: Adapted from PDF.js examples and community patterns
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker (do once at module load)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Process a PDF file into image objects compatible with addImages()
 * @param {File} file - The PDF file from file input
 * @param {number} maxPages - Maximum pages to process (default: 5)
 * @param {function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array<{file: File, name: string, ...}>>}
 */
export async function processPdfToImages(file, maxPages = 5, onProgress = null) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const images = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(i, numPages);

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    // Convert canvas to Blob (more efficient than dataURL for large images)
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );

    // Create File object from Blob
    const imageFile = new File(
      [blob],
      `${file.name}-page-${i}.jpg`,
      { type: 'image/jpeg' }
    );

    images.push(imageFile);

    // Clean up to prevent memory leak
    page.cleanup();
  }

  // Destroy document to free memory
  pdfDoc.destroy();

  return images;
}
```

### Integration with ImageInputManager
```javascript
// In file input handler (e.g., AstraApp.jsx)
const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);

  for (const file of files) {
    if (file.type === 'application/pdf') {
      // Show loading state
      setIsPdfProcessing(true);

      try {
        const imageFiles = await processPdfToImages(
          file,
          MAX_IMAGES - selectedImages.length, // Respect remaining slots
          (current, total) => setPdfProgress({ current, total })
        );

        await addImages(imageFiles);
      } catch (error) {
        setError(`Failed to process PDF: ${error.message}`);
      } finally {
        setIsPdfProcessing(false);
        setPdfProgress(null);
      }
    } else {
      // Existing image handling
      await addImages([file]);
    }
  }
};
```

### File Input Accept Attribute
```jsx
<input
  type="file"
  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
  multiple
  onChange={handleFileSelect}
/>
```

## Multi-Page Handling

### Strategy: Automatic Truncation with Notice

Given the MAX_IMAGES=5 limit, multi-page PDFs need clear handling:

1. **Calculate available slots:** `availableSlots = MAX_IMAGES - selectedImages.length`
2. **Truncate if needed:** Process `min(pdfDoc.numPages, availableSlots)` pages
3. **Notify user:** If truncated, show message "Processed X of Y pages (max 5 images)"

### Alternative Considered: Page Selection UI

A page picker would let users choose specific pages, but:
- Adds significant UI complexity
- Deferred to v2 (requirement PDF-04)
- Auto-truncation with first N pages is simpler and covers 80% of use cases

### Implementation Note

The existing count indicator (3/5) naturally shows when limit is approached. After PDF processing, users see the same "X/5 images" indicator.

## Edge Cases

| Edge Case | How to Handle |
|-----------|---------------|
| Encrypted/password-protected PDF | pdfjs-dist throws; catch and show "PDF is password protected" error |
| Corrupted PDF | getDocument rejects; catch and show "Could not read PDF" error |
| Empty PDF (0 pages) | Check numPages before processing; show "PDF has no pages" error |
| Very large PDF (100+ pages) | Only process first N pages per maxPages param |
| Single-page PDF | Works normally; results in 1 image |
| PDF with no text (scanned images) | Works fine; Vision API analyzes the rendered image |
| Non-standard page sizes | getViewport handles; scale maintains aspect ratio |
| Landscape vs Portrait | Handled automatically by viewport |
| PDF selected when at image limit | Check before processing; show "Maximum 5 images" error |

## Recommendations

### For Planning

1. **Single plan is sufficient:** PDF processing is self-contained, integrates at one point (file input handler)

2. **Task structure:**
   - Install pdfjs-dist and configure worker (setup)
   - Create PDF processing utility function
   - Update file input to accept PDFs
   - Add processing state and loading indicator
   - Wire into existing addImages flow

3. **Testing approach:**
   - Test with 1-page, 5-page, and 10-page PDFs
   - Test encrypted PDF (should error gracefully)
   - Test file limit interaction (3 images selected, add 5-page PDF)
   - Verify memory cleanup (monitor DevTools memory)

4. **Loading indicator placement:** Above input bar, similar to existing patterns. Show "Processing PDF: page X of Y"

5. **File type detection:** Use `file.type === 'application/pdf'` to branch processing

### Configuration Values

| Setting | Value | Rationale |
|---------|-------|-----------|
| Scale factor | 2.0 | Good text readability without excessive file size |
| JPEG quality | 0.85 | Balance of quality and size |
| Max pages per PDF | Calculated | `MAX_IMAGES - currentCount` to respect limit |
| Worker location | `/pdf.worker.min.mjs` | Static path avoids Vite hashing issues |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Worker from CDN | Worker from npm/public | pdfjs-dist 4.x (2024) | Must configure worker explicitly |
| getDocument returns Promise | getDocument returns { promise } | pdfjs-dist 4.x | Must use `.promise` property |
| `build/pdf.js` | `build/pdf.mjs` | pdfjs-dist 4.x | ES modules are standard now |

**Deprecated/outdated:**
- `PDFJS.getDocument()` global: Use `import * as pdfjsLib from 'pdfjs-dist'` instead
- Legacy build paths: Use `build/` not `legacy/build/` unless supporting IE11

## Open Questions

None critical. All research questions have HIGH confidence answers.

Minor considerations for implementation:
1. **Scale factor tuning:** 2.0 is recommended, but could test 1.5 vs 2.0 vs 2.5 for optimal quality/size tradeoff
2. **Progress granularity:** Could show page-level or more granular (render progress per page) - page-level is sufficient

## Sources

### Primary (HIGH confidence)
- [PDF.js GitHub - Official repository](https://github.com/mozilla/pdf.js) - Version 5.4.530, architecture
- [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/) - Rendering patterns
- [MDN toDataURL](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL) - Canvas to image conversion

### Secondary (MEDIUM confidence)
- [PDF to image with pdfjs Gist](https://gist.github.com/ichord/9808444) - Complete example code
- [pdfjs-dist Worker Discussion](https://github.com/mozilla/pdf.js/discussions/19520) - Vite worker configuration
- [react-pdf Issues](https://github.com/wojtekmaj/react-pdf/issues/1148) - Vite compatibility patterns

### Tertiary (LOW confidence - verified with primary)
- WebSearch results for scale recommendations - verified against official examples
- WebSearch results for memory management - verified with GitHub issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pdfjs-dist is the only viable client-side PDF library
- Architecture: HIGH - patterns verified across multiple official sources
- Pitfalls: HIGH - common issues documented in GitHub issues and discussions
- Integration: HIGH - existing codebase patterns clear from ImageInputManager

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (pdfjs-dist is stable, unlikely to change significantly)
