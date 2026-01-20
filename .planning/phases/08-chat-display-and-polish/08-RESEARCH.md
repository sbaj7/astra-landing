# Phase 8: Chat Display and Polish - Research

**Researched:** 2026-01-20
**Domain:** React UI components, image lightbox, usage limits integration
**Confidence:** HIGH

## Summary

Phase 8 focuses on three distinct areas: (1) image lightbox for full-size viewing, (2) image quality feedback messaging, and (3) usage limits display after image analysis. The research finds that much of the core infrastructure already exists from prior phases:

- **Image display in user messages:** Already implemented in Phase 7 (07-02-PLAN.md)
- **Responsive images in chat bubbles:** Already implemented with 120px max dimensions
- **Error display pattern:** Already established with auto-dismiss (Phase 1)
- **Usage limits system:** Already integrated with chatLimit state and optimistic updates

The remaining work is to: (1) add click-to-expand lightbox for images, (2) surface quality-related feedback when Vision API returns issues, and (3) ensure limits display updates correctly after image analysis (which already happens since image messages use the same handleSend flow).

**Primary recommendation:** Build a minimal custom lightbox component (no library needed) following the established CitationPillOverlay modal pattern, and reuse the existing imageError display system for quality feedback.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Already in project |
| Lucide React | 0.522.0 | Icons (X for close) | Already in project |

### Supporting (No New Libraries Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS-in-JS | inline | Modal styling | Follow existing pattern in codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom lightbox | react-modal-image (3KB) | External dependency; custom is cleaner for this use case |
| Custom lightbox | yet-another-react-lightbox | Overkill for single-image viewing |
| Toast library | react-hot-toast | Unnecessary; existing error display pattern works |

**Installation:**
No new packages required.

## Architecture Patterns

### Existing Pattern: Modal Overlay (CitationPillOverlay.jsx)
```jsx
// Source: /src/components/CitationPillOverlay.jsx (lines 15-20)
const styles = {
  wrapper: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  // ...
};
```

### Existing Pattern: Error Display (InputBar in AstraApp.jsx)
```jsx
// Source: /src/components/AstraApp.jsx (lines 3745-3761)
{imageError && (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      backgroundColor: `${theme.errorColor}10`,
      borderRadius: 8,
      color: theme.errorColor,
      fontSize: isMobile ? 12 : 13,
    }}
    role="alert"
  >
    <span style={{ flex: 1 }}>{imageError}</span>
    {/* dismiss button */}
  </div>
)}
```

### Existing Pattern: Usage Limits Update (AstraApp.jsx)
```jsx
// Source: /src/components/AstraApp.jsx (lines 5273-5320)
// Optimistic update already happens in handleSend for both text and image messages
setChatLimit(prev => {
  const nextUsed = Math.min(10, (prev.used || 0) + 1);
  const nextRemaining = Math.max(0, 10 - nextUsed);
  // ...
});
```

### Recommended: ImageLightbox Component
```jsx
// Pattern following existing modal conventions
const ImageLightbox = ({ isOpen, imageUrl, onClose, theme }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100, // Above other modals (PaywallModal uses 1000)
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out'
      }}
      onClick={onClose}
    >
      <img
        src={imageUrl}
        alt="Full size"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: '8px'
        }}
        onClick={e => e.stopPropagation()}
      />
      <button /* Close button top-right */ />
    </div>
  );
};
```

### Anti-Patterns to Avoid
- **Adding external lightbox library:** The project follows a minimal-dependency approach; custom is preferred
- **Complex gallery navigation:** Scope is single-image view, not multi-image gallery with arrows
- **Storing quality state separately:** Reuse existing imageError mechanism

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal backdrop | Custom click-outside logic | onClick on wrapper div | Existing pattern in CitationPillOverlay |
| Error display | New toast system | imageError + setError | Already established with auto-dismiss |
| Limit updates | New tracking | setChatLimit optimistic update | Already integrated in handleSend flow |
| Keyboard close (Esc) | Custom listener | useEffect with keydown handler | Simple, standard pattern |

**Key insight:** Phase 7 already integrated images into the existing message + limits flow. Phase 8 polish work leverages existing infrastructure.

## Common Pitfalls

### Pitfall 1: Z-Index Conflicts
**What goes wrong:** Lightbox appears behind other modals
**Why it happens:** z-index hierarchy not considered
**How to avoid:** Use z-index: 1100+ (PaywallModal uses 1000, BillingModal uses 1200)
**Warning signs:** Modal visible but not clickable

### Pitfall 2: Image Not Loading in Lightbox
**What goes wrong:** Lightbox shows broken image
**Why it happens:** For reloaded sessions, images are not persisted (hadImages flag only)
**How to avoid:** Only enable lightbox click for messages with actual image data (message.images exists)
**Warning signs:** onClick handler on placeholder text

### Pitfall 3: Mobile Touch Handling
**What goes wrong:** Tap to close doesn't work reliably
**Why it happens:** Touch vs click event handling differences
**How to avoid:** Use onClick which works for both (React normalizes)
**Warning signs:** Works on desktop, fails on mobile

### Pitfall 4: Quality Feedback Confusion
**What goes wrong:** User doesn't understand why image analysis is poor
**Why it happens:** Generic error messages
**How to avoid:** Parse Vision API response for quality-related hints (blur, low resolution mentions in response text)
**Warning signs:** User repeatedly uploads same bad image

### Pitfall 5: Limit Not Updating After Image Message
**What goes wrong:** User sends image, limit count unchanged
**Why it happens:** If Image messages bypass the limit decrement code path
**How to avoid:** Verify handleSend decrements limit before API call (already does)
**Warning signs:** Free user sends unlimited image messages

## Code Examples

### Pattern 1: Lightbox with Escape Key
```jsx
// Source: Custom, following React patterns
useEffect(() => {
  if (!isOpen) return;

  const handleEscape = (e) => {
    if (e.key === 'Escape') onClose();
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen, onClose]);
```

### Pattern 2: Clickable Image Thumbnail
```jsx
// Source: Modify existing user message image rendering
{message.images.map((img, idx) => (
  <img
    key={img.id || idx}
    src={img.data}
    alt={`Attached image ${idx + 1}`}
    style={{
      maxWidth: '120px',
      maxHeight: '120px',
      borderRadius: '8px',
      objectFit: 'cover',
      cursor: 'pointer' // NEW: indicate clickable
    }}
    onClick={() => openLightbox(img.data)} // NEW: open lightbox
  />
))}
```

### Pattern 3: Quality Feedback Detection
```jsx
// Vision API doesn't return explicit quality errors, but model may mention in response
// Check response content for quality-related keywords
const qualityIndicators = [
  'blurry', 'unclear', 'low resolution', 'hard to see',
  'cannot make out', 'image quality', 'difficult to read'
];

const hasQualityIssue = qualityIndicators.some(
  indicator => responseText.toLowerCase().includes(indicator)
);

if (hasQualityIssue) {
  setImageError('The image quality may be insufficient for detailed analysis. Consider uploading a clearer image.');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External lightbox libs | Custom inline modals | Project convention | Fewer dependencies |
| Separate image message flow | Unified handleSend | Phase 7 | Limits already work |
| Toast notifications | Inline error display | Phase 1 | Consistent UX pattern |

**Deprecated/outdated:**
- react-image-lightbox: No longer actively maintained
- Complex gesture libraries: Not needed for simple tap-to-view

## Open Questions

1. **Quality feedback trigger:**
   - What we know: OpenAI Vision API doesn't return explicit quality scores
   - What's unclear: Whether to parse response text for quality hints or skip feature
   - Recommendation: Parse response for quality keywords; set feedback via existing error display

2. **Lightbox for multiple images:**
   - What we know: Current scope is single-image expand, not gallery navigation
   - What's unclear: Whether users expect prev/next arrows
   - Recommendation: Keep simple (click opens that image), defer gallery UX to future phase

## Verification: What's Already Done

Verified from Phase 7 (07-02-PLAN.md and 07-02-SUMMARY.md):

1. **DISP-01 (Images display in chat):** DONE
   - User messages include images array
   - Images rendered with 120px thumbnails

2. **DISP-02 (Responsive, fit in bubble):** DONE
   - maxWidth/maxHeight: 120px
   - objectFit: cover

3. **LIM-01/LIM-02 (Limits integration):** DONE
   - handleSend decrements chatLimit before API call
   - Same flow for text and image messages
   - Optimistic update shows new remaining count

**Remaining work for Phase 8:**
- DISP-03: Add lightbox overlay for full-size view
- VIS-07: Add quality feedback messaging (parse response or API error)

## Sources

### Primary (HIGH confidence)
- `/src/components/AstraApp.jsx` - Existing image display, error handling, limits code
- `/src/components/CitationPillOverlay.jsx` - Modal overlay pattern
- `/src/components/PaywallModal.jsx` - Modal with z-index, backdrop
- `/src/components/ImageInputManager.jsx` - Image validation, error setting
- `.planning/phases/07-mode-integration/07-02-PLAN.md` - Phase 7 implementation details

### Secondary (MEDIUM confidence)
- [Creating a Simple Lightbox From Scratch in React](https://medium.com/swlh/creating-a-simple-lightbox-from-scratch-in-react-caea84f90960) - Custom lightbox pattern
- [OpenAI Vision API limitations](https://platform.openai.com/docs/guides/images-vision) - Quality/resolution info

### Tertiary (LOW confidence)
- WebSearch results for lightbox libraries - Confirmed custom is preferred

## Metadata

**Confidence breakdown:**
- Lightbox implementation: HIGH - Clear pattern from existing modals, no library needed
- Quality feedback: MEDIUM - API doesn't provide explicit feedback; response parsing approach is reasonable
- Limits integration: HIGH - Already verified working from Phase 7

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (stable domain, no fast-moving dependencies)
