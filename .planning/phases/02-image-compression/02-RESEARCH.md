# Phase 2: Image Compression - Research

**Researched:** 2026-01-20
**Domain:** Client-side image compression in browser
**Confidence:** HIGH

## Summary

Client-side image compression is well-supported in modern browsers through established libraries. **browser-image-compression** is the recommended library for this phase - it has higher weekly downloads (485K vs 212K), built-in Web Worker support for non-blocking compression, and a simple Promise-based API that integrates naturally with the existing async image loading flow in `ImageInputManager`.

The integration point is clear: compression should happen inside `addImages()` in `useImageInputManager` hook, after file validation but before FileReader reads the base64 data. Images already under 1MB should skip compression to avoid unnecessary processing and potential size increases.

**Primary recommendation:** Use browser-image-compression with `maxSizeMB: 1`, `useWebWorker: true`, and always compare compressed vs original size - use whichever is smaller.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) | ^2.0.2 | Client-side image compression | 485K weekly downloads, Web Worker support, simple async API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | browser-image-compression handles all needs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser-image-compression | compressorjs | Smaller bundle (154KB vs 863KB) but no Web Worker support, callback-based API |
| browser-image-compression | canvas-based DIY | Full control but reinvents wheel, more bugs |

**Installation:**
```bash
npm install browser-image-compression --save
```

## Architecture Patterns

### Integration Point in Existing Flow

Current flow in `ImageInputManager.jsx`:
```
File selected/dropped
  -> validateImageFile() checks type/size
  -> FileReader.readAsDataURL()
  -> new Image() to get dimensions
  -> manager.addImage(imageObj)
```

New flow with compression:
```
File selected/dropped
  -> validateImageFile() checks type (size check now lenient)
  -> IF file.size > 1MB: compress with browser-image-compression
  -> IF compressed.size > original.size: use original
  -> FileReader.readAsDataURL(finalFile)
  -> new Image() to get dimensions
  -> manager.addImage(imageObj)
```

### Pattern 1: Compression Utility Function
**What:** Standalone async function for image compression
**When to use:** Called from `addImages()` before base64 conversion
**Example:**
```javascript
// Source: https://github.com/Donaldcwl/browser-image-compression
import imageCompression from 'browser-image-compression';

const COMPRESSION_THRESHOLD = 1 * 1024 * 1024; // 1MB
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  maxIteration: 10,
  initialQuality: 0.8
};

/**
 * Compress image if needed, returning the smaller of original/compressed
 * @param {File} file - Original image file
 * @returns {Promise<File>} - Compressed file or original if smaller
 */
export async function compressImageIfNeeded(file) {
  // Skip if already under threshold
  if (file.size <= COMPRESSION_THRESHOLD) {
    return file;
  }

  // Skip GIFs (animated, compression problematic)
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

    // Use smaller of the two (compression can sometimes increase size)
    return compressedFile.size < file.size ? compressedFile : file;
  } catch (error) {
    console.warn('Compression failed, using original:', error);
    return file; // Graceful fallback
  }
}
```

### Pattern 2: Progress Feedback (Optional)
**What:** Show compression progress for large images
**When to use:** If UX requires visual feedback during compression
**Example:**
```javascript
const options = {
  maxSizeMB: 1,
  useWebWorker: true,
  onProgress: (percent) => {
    // Update UI: "Compressing... 45%"
    setCompressionProgress(percent);
  }
};
```

### Anti-Patterns to Avoid
- **Re-compressing already small images:** Check size threshold first
- **Compressing GIFs:** Breaks animation, often increases size
- **Blocking main thread:** Always use `useWebWorker: true`
- **Assuming compression always helps:** Always compare sizes, use smaller
- **Ignoring compression errors:** Catch and fallback to original

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression | Canvas resize + toBlob | browser-image-compression | Handles edge cases (EXIF, mobile canvas limits, quality iteration) |
| Quality iteration | Binary search for target size | Library's maxIteration | Complex edge cases, browser variations |
| Web Worker setup | Manual worker + postMessage | Library's useWebWorker | Handles fallback, cross-browser issues |
| EXIF orientation | Manual EXIF parsing | Library's preserveExif option | Complex format-specific handling |

**Key insight:** Image compression looks simple (just resize and reduce quality) but has many edge cases: iOS canvas limits, EXIF orientation, quality vs size tradeoffs, format-specific behavior. The library handles all of these.

## Common Pitfalls

### Pitfall 1: Compression Increasing File Size
**What goes wrong:** Small or already-compressed images get larger after "compression"
**Why it happens:** Re-encoding introduces overhead; JPEG already optimized
**How to avoid:** Always compare sizes: `compressed.size < original.size ? compressed : original`
**Warning signs:** Output file larger than input

### Pitfall 2: GIF Handling
**What goes wrong:** Animated GIFs become static or corrupted
**Why it happens:** Library converts to static image during canvas processing
**How to avoid:** Skip GIFs entirely: `if (file.type === 'image/gif') return file`
**Warning signs:** User uploads animated image, sees static result

### Pitfall 3: Mobile Browser Canvas Limits
**What goes wrong:** Large images produce black/blank output on iOS Safari
**Why it happens:** Mobile browsers limit canvas dimensions (Safari: ~16MP)
**How to avoid:** Use `maxWidthOrHeight: 1920` to stay within limits
**Warning signs:** Black images on iPad Pro, works on desktop

### Pitfall 4: Main Thread Blocking
**What goes wrong:** UI freezes during compression of large images
**Why it happens:** Compression runs on main thread without Web Worker
**How to avoid:** Use `useWebWorker: true` (default), provide progress feedback for large files
**Warning signs:** Input becomes unresponsive, scroll stutters

### Pitfall 5: Silent Compression Failures
**What goes wrong:** Users don't know why their image wasn't uploaded
**Why it happens:** Compression error not surfaced to user
**How to avoid:** Catch errors, fall back to original, log for debugging
**Warning signs:** Image silently disappears from upload queue

## Code Examples

Verified patterns from official sources:

### Basic Compression
```javascript
// Source: https://github.com/Donaldcwl/browser-image-compression
import imageCompression from 'browser-image-compression';

async function handleImageUpload(file) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed: ${(file.size/1024/1024).toFixed(2)}MB -> ${(compressedFile.size/1024/1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    return file; // Fallback to original
  }
}
```

### Integration with Existing addImages Flow
```javascript
// In useImageInputManager hook, modify addImages:
const addImages = React.useCallback(async (files) => {
  const manager = managerRef.current;
  if (!manager) return { added: [], rejected: [] };

  const added = [];
  const rejected = [];

  for (const file of Array.from(files)) {
    // Validate type only (size will be handled after compression)
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejected.push({ file, errors: ['Invalid file type'] });
      continue;
    }

    // Check limit
    if (manager.selectedImages.length + added.length >= MAX_IMAGES) {
      rejected.push({ file, errors: [`Maximum ${MAX_IMAGES} images`] });
      continue;
    }

    try {
      // Compress if needed
      const processedFile = await compressImageIfNeeded(file);

      // Now check size after compression
      if (processedFile.size > MAX_FILE_SIZE) {
        rejected.push({
          file,
          errors: [`Still too large after compression: ${(processedFile.size/1024/1024).toFixed(1)}MB`]
        });
        continue;
      }

      // Read and add (existing logic)
      // ...
    } catch (error) {
      rejected.push({ file, errors: [error.message] });
    }
  }

  return { added, rejected };
}, []);
```

### Abort Controller for Cancellation
```javascript
// Source: https://github.com/Donaldcwl/browser-image-compression
const controller = new AbortController();

const options = {
  maxSizeMB: 1,
  useWebWorker: true,
  signal: controller.signal
};

// Cancel compression if needed
function cancelCompression() {
  controller.abort(new Error('User cancelled'));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side compression | Client-side compression | 2020+ | Reduces bandwidth, faster UX |
| JPEG-only compression | Multi-format (JPEG/PNG/WebP) | 2021+ | Better format support |
| Main thread only | Web Worker offloading | 2019+ | Non-blocking compression |
| Fixed quality settings | Iterative size targeting | 2020+ | Reliable size targets |

**Deprecated/outdated:**
- Canvas-only DIY solutions: Missing edge cases, browser quirks
- Synchronous compression: Blocks UI, poor UX
- Server-side only: Wastes bandwidth, slower perceived performance

## Integration Considerations

### Where Compression Fits

**Current validation in `validateImageFile()`:**
- Type check (ALLOWED_IMAGE_TYPES)
- Size check (MAX_FILE_SIZE = 3.75MB)

**New flow:**
1. Type check stays in `validateImageFile()` (immediate rejection of non-images)
2. Size check should be AFTER compression attempt
3. Compression happens between type validation and FileReader

**Why this order:**
- Don't waste time compressing PDFs or text files
- User with 5MB image should see it compressed, not rejected
- Only reject if STILL too large after compression

### File Size Threshold Decision

**Prior decision (STATE.md):** 3.75MB max file size (base64 overhead consideration)
**UPLD-07 requirement:** Compress to target 1MB

**Recommendation:**
- Compression threshold: 1MB (compress anything larger)
- Compression target: 1MB (`maxSizeMB: 1`)
- Rejection threshold: Still 3.75MB AFTER compression (for truly uncompressible images)

### What Stays, What Changes

| Component | Change? | Details |
|-----------|---------|---------|
| `validateImageFile()` | Modify | Remove size check (move to after compression) |
| `addImages()` | Modify | Add async compression step |
| `ALLOWED_IMAGE_TYPES` | No change | Still JPEG, PNG, GIF, WebP |
| `MAX_FILE_SIZE` | Keep | Still 3.75MB as final limit |
| New: `compressImageIfNeeded()` | Add | New export from ImageInputManager |
| New: `COMPRESSION_OPTIONS` | Add | New export for configuration |

## Open Questions

Things that couldn't be fully resolved:

1. **Should we show compression progress?**
   - What we know: Library supports `onProgress` callback
   - What's unclear: UX design for progress indication
   - Recommendation: Implement capability, UX decision separate

2. **Maximum dimension limit (maxWidthOrHeight)?**
   - What we know: 1920 is common, prevents mobile canvas issues
   - What's unclear: Medical images may need higher resolution
   - Recommendation: Start with 1920, can be increased if users complain about quality

3. **EXIF preservation?**
   - What we know: `preserveExif: false` by default
   - What's unclear: Medical relevance of EXIF data
   - Recommendation: Default false (smaller files), add option later if needed

## Sources

### Primary (HIGH confidence)
- [browser-image-compression npm](https://www.npmjs.com/package/browser-image-compression) - API documentation, options
- [browser-image-compression GitHub](https://github.com/Donaldcwl/browser-image-compression) - Full API, issues, examples
- [browser-image-compression official docs](https://donaldcwl.github.io/browser-image-compression/) - Usage examples

### Secondary (MEDIUM confidence)
- [npm-compare comparison](https://npm-compare.com/browser-image-compression,compressorjs) - Library comparison, bundle sizes
- [Image Format Guide 2024](https://modernconvert.vercel.app/blog/image-formats-guide-2024.html) - Format recommendations
- [Uploadcare React optimization](https://uploadcare.com/blog/react-image-optimization-techniques/) - React patterns

### Tertiary (LOW confidence)
- GitHub issues for edge cases - Real-world failure reports, may not be current

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-established library with large user base
- Architecture: HIGH - Clear integration point in existing code
- Pitfalls: HIGH - Well-documented in GitHub issues and community

**Research date:** 2026-01-20
**Valid until:** 2026-04-20 (90 days - stable library, slow-moving domain)
