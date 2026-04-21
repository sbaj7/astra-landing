# Phase 1: Image Upload Foundation - Research

**Researched:** 2026-01-19
**Domain:** React file upload, drag-and-drop, image preview, file validation
**Confidence:** HIGH

## Summary

This phase focuses on enabling users to attach images to chat messages in the Astra MD application. The existing codebase already has `ImageInputManager.jsx` with basic file input patterns, FileReader usage, and an observable state manager. The main work involves:

1. Extending the existing `ImageInputManager` to support multiple images (up to 5)
2. Adding drag-and-drop capability to the InputBar component
3. Creating image preview thumbnails with removal functionality
4. Implementing file validation for type and size

The standard approach is to use native HTML5 drag-and-drop events (no external library needed given the existing patterns), extend the existing `ImageInputManager` observable pattern, and use `URL.createObjectURL()` for efficient preview generation.

**Primary recommendation:** Extend the existing `ImageInputManager.jsx` pattern rather than introducing new libraries. Use native drag-and-drop events on the InputBar container with the existing FileReader-based base64 encoding for API compatibility.

## Standard Stack

The existing codebase already provides most of what's needed:

### Core (Already Present)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | Component framework | Already in use |
| lucide-react | 0.522.0 | Icons (Image, X, Upload) | Already imported in AstraApp.jsx |

### Supporting (No New Dependencies Required)
| Technology | Purpose | When to Use |
|------------|---------|-------------|
| HTML5 Drag & Drop API | Native drag-and-drop events | Drop zone for InputBar |
| FileReader API | Convert files to base64 | Already used in ImageInputManager |
| URL.createObjectURL() | Efficient preview URLs | Faster than FileReader for previews |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native drag-drop | react-dropzone | More features, but adds dependency; native is sufficient here |
| FileReader for previews | URL.createObjectURL() | createObjectURL is faster, needs cleanup with revokeObjectURL |
| Single image state | Array state | Needed to support max 5 images requirement |

**Installation:** No new dependencies required.

## Architecture Patterns

### Recommended Component Structure

The InputBar already handles the text input. Image upload should be integrated as follows:

```
AstraApp.jsx
  |-- InputBar (lines 3386-3624)
  |     |-- (NEW) ImageAttachmentButton - triggers file picker
  |     |-- (NEW) ImagePreviewStrip - shows thumbnails above textarea
  |     |-- textarea (existing)
  |     |-- mic button (existing)
  |     |-- send button (existing)
  |     |-- ModeSwitcher (existing)
  |
  |-- ImageInputManager.jsx (extend existing)
        |-- Support for multiple images array
        |-- File validation logic
        |-- Drag-drop state tracking
```

### Pattern 1: Extend ImageInputManager for Multiple Images

**What:** Modify the existing ImageInputManager class to track an array of images instead of a single image.

**When to use:** All image state management in the application.

**Example:**
```javascript
// Extend existing ImageInputManager class
class ImageInputManager {
  constructor() {
    this.selectedImages = []; // Changed from single image
    this.maxImages = 5;
    this.isDragActive = false;
    this.listeners = new Set();
  }

  addImage(image) {
    if (this.selectedImages.length >= this.maxImages) return false;
    this.selectedImages = [...this.selectedImages, image];
    this.notifyListeners();
    return true;
  }

  removeImage(index) {
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
    this.notifyListeners();
  }

  clearAllImages() {
    this.selectedImages = [];
    this.notifyListeners();
  }

  setIsDragActive(active) {
    this.isDragActive = active;
    this.notifyListeners();
  }
}
```

### Pattern 2: Native Drag-and-Drop on InputBar Container

**What:** Use HTML5 drag events (onDragEnter, onDragOver, onDragLeave, onDrop) on the InputBar container.

**When to use:** Making the entire input area a drop zone.

**Example:**
```javascript
// In InputBar component
const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragActive(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  // Only deactivate if leaving the container entirely
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setIsDragActive(false);
  }
};

const handleDragOver = (e) => {
  e.preventDefault(); // Required to allow drop
  e.stopPropagation();
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragActive(false);

  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
};
```

### Pattern 3: Image Preview with URL.createObjectURL

**What:** Use createObjectURL for fast preview generation, with cleanup.

**When to use:** Displaying image thumbnails before upload.

**Example:**
```javascript
// In ImagePreviewStrip component
const ImagePreview = ({ image, onRemove, theme }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (image.file) {
      const url = URL.createObjectURL(image.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url); // Cleanup on unmount
    } else if (image.data) {
      // Fallback to base64 if already encoded
      setPreviewUrl(image.data);
    }
  }, [image]);

  return (
    <div style={{ position: 'relative' }}>
      <img src={previewUrl} alt="Preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
      <button onClick={onRemove} style={{ position: 'absolute', top: -8, right: -8 }}>
        <X size={16} />
      </button>
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **Reading files before validation:** Always validate type and size BEFORE reading with FileReader
- **Not cleaning up object URLs:** Always call `URL.revokeObjectURL()` in cleanup/unmount
- **Blocking UI during file read:** FileReader is async, but large files still need loading states
- **Trusting file.type blindly:** The MIME type from file.type can be spoofed; for security-critical apps, validate magic bytes
- **Not preventing default on drag events:** Must call `e.preventDefault()` on dragover to allow drop

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File type detection | Custom regex on filename | Accept attribute + file.type check | Built-in browser validation |
| Base64 encoding | Manual btoa() wrapper | FileReader.readAsDataURL() | Handles binary properly, async |
| Preview URLs | Read entire file to base64 | URL.createObjectURL() | Faster, less memory |
| Drag state edge cases | Simple boolean toggle | Check relatedTarget on dragLeave | Prevents flickering on child elements |

**Key insight:** The browser's native file and drag-drop APIs handle the complex cases. The existing `ImageInputManager.jsx` already uses FileReader correctly; extend rather than replace.

## Common Pitfalls

### Pitfall 1: Drag-Leave Flickering
**What goes wrong:** Drag state toggles on/off rapidly when dragging over child elements
**Why it happens:** dragLeave fires when entering child elements within the drop zone
**How to avoid:** Check if `e.relatedTarget` is contained within `e.currentTarget` before deactivating
**Warning signs:** Visual drop indicator flashing during drag

### Pitfall 2: Base64 Size Increase
**What goes wrong:** 4MB image becomes 5.3MB after base64 encoding, exceeds API limit
**Why it happens:** Base64 encoding increases size by approximately 33%
**How to avoid:** Validate against (maxFileSize / 1.33) or ~3.75MB for a 5MB API limit
**Warning signs:** API rejection despite file appearing under limit

### Pitfall 3: Memory Leaks from Object URLs
**What goes wrong:** Browser memory grows with each image selection
**Why it happens:** createObjectURL allocates memory that isn't automatically released
**How to avoid:** Always call `URL.revokeObjectURL()` in useEffect cleanup
**Warning signs:** Slow performance after many image selections

### Pitfall 4: File Input Not Resetting
**What goes wrong:** Can't select the same file twice in a row
**Why it happens:** Input value doesn't change if same file selected
**How to avoid:** Reset `input.value = ''` after processing (already done in existing code)
**Warning signs:** User reports "nothing happens" when re-selecting same image

### Pitfall 5: Blocking Main Thread
**What goes wrong:** UI freezes when processing large images
**Why it happens:** FileReader callbacks are synchronous despite async read
**How to avoid:** Show loading state, process files sequentially not all at once
**Warning signs:** Browser "page unresponsive" warning

## Code Examples

### File Validation Function (HIGH confidence - standard pattern)
```javascript
// Source: MDN Web Docs + Claude Vision API documentation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 3.75 * 1024 * 1024; // 3.75MB (accounts for base64 ~33% increase to stay under 5MB API limit)
const MAX_IMAGES = 5;

const validateFile = (file) => {
  const errors = [];

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type || 'unknown'}. Allowed: JPEG, PNG, GIF, WebP`);
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`File too large: ${sizeMB}MB. Maximum: 3.75MB`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

### Image Preview Strip Component (HIGH confidence - React standard pattern)
```javascript
// ImagePreviewStrip.jsx
const ImagePreviewStrip = ({ images, onRemove, theme, isMobile }) => {
  if (!images || images.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      overflowX: 'auto',
      borderBottom: `1px solid ${theme.textSecondary}15`
    }}>
      {images.map((image, index) => (
        <ImageThumbnail
          key={image.id || index}
          image={image}
          onRemove={() => onRemove(index)}
          theme={theme}
        />
      ))}
    </div>
  );
};

const ImageThumbnail = ({ image, onRemove, theme }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let url = null;
    if (image.file) {
      url = URL.createObjectURL(image.file);
      setPreviewUrl(url);
    } else if (image.data) {
      setPreviewUrl(image.data);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image]);

  return (
    <div style={{
      position: 'relative',
      width: 56,
      height: 56,
      flexShrink: 0,
      borderRadius: 8,
      overflow: 'hidden',
      border: `1px solid ${theme.textSecondary}20`
    }}>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <button
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.errorColor || '#EF4444',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
};
```

### Extended useImageInputManager Hook (HIGH confidence - extending existing pattern)
```javascript
// Extend existing hook in ImageInputManager.jsx
export const useImageInputManager = () => {
  const [state, setState] = useState({
    selectedImages: [],
    isDragActive: false,
    error: null
  });

  const managerRef = useRef(null);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ImageInputManager();
    }
    const unsubscribe = managerRef.current.subscribe(setState);
    return unsubscribe;
  }, []);

  const addImages = useCallback((files) => {
    const manager = managerRef.current;
    if (!manager) return { added: [], rejected: [] };

    const added = [];
    const rejected = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        rejected.push({ file, errors: validation.errors });
        continue;
      }

      if (manager.selectedImages.length >= MAX_IMAGES) {
        rejected.push({ file, errors: [`Maximum ${MAX_IMAGES} images allowed`] });
        continue;
      }

      // Read as base64 for API compatibility
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageObj = {
          id: Date.now() + Math.random(),
          data: e.target.result,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type
        };
        manager.addImage(imageObj);
      };
      reader.readAsDataURL(file);
      added.push(file);
    }

    return { added, rejected };
  }, []);

  const removeImage = useCallback((index) => {
    managerRef.current?.removeImage(index);
  }, []);

  const clearAllImages = useCallback(() => {
    managerRef.current?.clearAllImages();
  }, []);

  const setIsDragActive = useCallback((active) => {
    managerRef.current?.setIsDragActive(active);
  }, []);

  return {
    selectedImages: state.selectedImages,
    isDragActive: state.isDragActive,
    error: state.error,
    addImages,
    removeImage,
    clearAllImages,
    setIsDragActive
  };
};
```

### InputBar Integration Points (HIGH confidence - based on existing code analysis)
```javascript
// Key integration points in InputBar (lines 3386-3624 in AstraApp.jsx)

// 1. Add drag event handlers to the container div (line ~3458)
<div
  ref={containerRef}
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  style={{
    // existing styles...
    border: isDragActive ? `2px dashed ${theme.accentSoftBlue}` : `1px solid ${theme.textSecondary}25`,
    transition: 'all 0.2s ease'
  }}
>

// 2. Add ImagePreviewStrip before the Input Row (line ~3481)
{selectedImages.length > 0 && (
  <ImagePreviewStrip
    images={selectedImages}
    onRemove={handleRemoveImage}
    theme={theme}
    isMobile={isMobile}
  />
)}

// 3. Add upload button in the button group (line ~3521)
<button
  onClick={() => fileInputRef.current?.click()}
  disabled={isDisabled || selectedImages.length >= 5}
  style={{/* matching existing button styles */}}
>
  <Image size={isMobile ? 18 : 20} />
</button>
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/gif,image/webp"
  multiple
  onChange={handleFileSelect}
  style={{ display: 'none' }}
/>

// 4. Update send condition (line ~3550)
disabled={!isStreaming && !query.trim() && selectedImages.length === 0}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jquery file upload plugins | Native HTML5 + React hooks | 2018+ | No dependencies needed |
| FileReader for previews | URL.createObjectURL() | Always preferred | Faster, less memory |
| Single file inputs | multiple attribute | HTML5 | Supports batch selection |
| Server-side validation only | Client + Server validation | Always | Better UX with immediate feedback |

**Deprecated/outdated:**
- Flash-based uploaders: Deprecated, HTML5 is universal
- Relying solely on `accept` attribute: Only a hint, not enforced; must validate in JS

## Open Questions

1. **Error Message Display Location**
   - What we know: Need to show validation errors to users
   - What's unclear: Toast notification vs inline error vs modal
   - Recommendation: Use inline error below the preview strip, auto-dismiss after 5 seconds

2. **Loading State During FileReader**
   - What we know: Large files take time to read
   - What's unclear: Whether to show loading indicator per-image or overall
   - Recommendation: Show shimmer/skeleton on individual thumbnail until loaded

3. **Message Persistence with Images**
   - What we know: Current `serializeMessageForPersistence` handles text only
   - What's unclear: Whether to persist base64 data in chat history (storage concern)
   - Recommendation: Defer to Phase 3 (API integration) to decide persistence strategy

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/src/components/ImageInputManager.jsx` - Current file input patterns
- Existing codebase: `/src/components/AstraApp.jsx` lines 3386-3624 - InputBar implementation
- Claude Vision API docs - Image format requirements (JPEG, PNG, GIF, WebP), 5MB limit

### Secondary (MEDIUM confidence)
- [MDN Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - Native drag-drop events
- [MDN FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) - File reading patterns
- [react-dropzone GitHub](https://github.com/react-dropzone/react-dropzone) - Hook pattern reference

### Tertiary (LOW confidence)
- Various blog posts on image preview patterns (verified against MDN)
- Claude Vision API web search results (verified 5MB limit, supported formats)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing patterns, no new dependencies
- Architecture: HIGH - Clear extension points in existing code
- Pitfalls: HIGH - Well-documented browser behaviors
- Code examples: HIGH - Based on existing codebase patterns and verified APIs

**Research date:** 2026-01-19
**Valid until:** 60 days (stable browser APIs, no fast-moving dependencies)
