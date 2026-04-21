# Phase 3: Multi-Image Support - Research

**Researched:** 2026-01-20
**Domain:** React UI state management, image handling
**Confidence:** HIGH

## Summary

Phase 3 requirements (MULT-01, MULT-02, MULT-03) are largely already implemented from Phase 1 and 2 work. The existing `ImageInputManager` supports arrays of up to 5 images, `ImagePreviewStrip` renders multiple thumbnails with individual removal, and the upload button already disables at the MAX_IMAGES limit. The only missing piece is the image count indicator (MULT-02) - a simple UI addition showing "X/5 images".

**Primary recommendation:** This phase requires minimal new code - primarily adding an image count indicator component to the ImagePreviewStrip. All multi-image state management is already complete.

## Current State Analysis

### Already Implemented (From Phase 1 & 2)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MULT-01: Up to 5 images per message | COMPLETE | `MAX_IMAGES = 5` (ImageInputManager.jsx:7), `addImage()` checks limit (line 85), `addImages()` enforces limit (line 210) |
| MULT-03: Remove individual images | COMPLETE | `ImagePreviewStrip` renders X button per thumbnail, `removeImage(index)` in manager (line 95) |
| Success Criteria 4: Upload button disabled at 5 | COMPLETE | AstraApp.jsx:3659 - `disabled={isDisabled \|\| (selectedImages && selectedImages.length >= MAX_IMAGES)}` |

### Missing (To Implement)

| Requirement | Status | What's Needed |
|-------------|--------|---------------|
| MULT-02: Image count indicator | NOT IMPLEMENTED | UI element showing "X/5 images" when images are attached |

### Verification Evidence

**Multi-image array support:**
```javascript
// ImageInputManager.jsx:77
this.selectedImages = []; // Changed from selectedImage

// ImageInputManager.jsx:84-92
addImage(image) {
  if (this.selectedImages.length >= MAX_IMAGES) {
    this.setError(`Maximum ${MAX_IMAGES} images allowed`);
    return false;
  }
  this.selectedImages = [...this.selectedImages, image];
  // ...
}
```

**Individual removal:**
```javascript
// ImageInputManager.jsx:95-99
removeImage(index) {
  if (index >= 0 && index < this.selectedImages.length) {
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
    this.notifyListeners();
  }
}
```

**Upload button disable logic:**
```javascript
// AstraApp.jsx:3659
disabled={isDisabled || (selectedImages && selectedImages.length >= MAX_IMAGES)}
```

## Technical Approach

### Image Count Indicator Design

The indicator should appear when images are attached, showing current count vs maximum.

**Placement Options:**

| Location | Pros | Cons |
|----------|------|------|
| **Inside ImagePreviewStrip (right end)** | Near context (thumbnails), always visible with images | May scroll off if many images |
| **Above ImagePreviewStrip (left-aligned)** | Never scrolls away, clear header | Takes vertical space |
| **On upload button (badge)** | Compact, near action | May look cluttered |

**Recommendation:** Inside ImagePreviewStrip, right-aligned, sticky position. This keeps it close to the images and always visible even when scrolling horizontally.

### Component Modification

Modify `ImagePreviewStrip.jsx` to accept `maxImages` prop and render counter:

```jsx
// Proposed structure
<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '...' }}>
  {images.map((image, index) => (
    <ImageThumbnail key={image.id || index} ... />
  ))}

  {/* Count indicator - always last */}
  <div style={{
    flexShrink: 0,
    padding: '4px 10px',
    borderRadius: 12,
    backgroundColor: `${theme.textSecondary}10`,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap'
  }}>
    {images.length}/{maxImages}
  </div>
</div>
```

### Existing UI Patterns to Follow

The codebase has established patterns for counters/badges:

**Badge pattern (BillingModal.jsx:48-65):**
```javascript
const Badge = ({ label, theme }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${theme.accentSoftBlue}20`,
    color: theme.accentSoftBlue,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600
  }}>
    {label}
  </span>
);
```

**Citation count pattern (AstraApp.jsx:2861):**
```javascript
<span>{`${citationCount} ${citationCount === 1 ? 'Citation' : 'Citations'}`}</span>
```

The image count indicator should follow the Badge styling for consistency.

## Integration Points

### Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `ImagePreviewStrip.jsx` | Add count indicator, accept `maxImages` prop | Primary change - add UI element |
| `AstraApp.jsx` | Pass `maxImages` prop to ImagePreviewStrip | Wire up the new prop |

### Props Flow

```
AstraApp.jsx
  └── InputBar (internal)
        └── ImagePreviewStrip
              ├── images={selectedImages}
              ├── onRemove={removeImage}
              ├── theme={theme}
              ├── isMobile={isMobile}
              └── maxImages={MAX_IMAGES}  // NEW
```

### No Changes Needed

| Component | Reason |
|-----------|--------|
| `ImageInputManager.jsx` | Already has all multi-image logic |
| `ImageThumbnail` | Already handles individual removal |
| Upload button | Already disables at MAX_IMAGES |
| Send button | Already enables when images attached |

## Edge Cases

### Edge Case 1: Zero Images
**Scenario:** User has no images attached
**Current Behavior:** `ImagePreviewStrip` returns `null` (line 125-127)
**Expected:** No indicator shown (correct - strip doesn't render)

### Edge Case 2: At Maximum (5/5)
**Scenario:** User has 5 images attached
**Current Behavior:** Upload button disabled, error shown if trying to add more
**Expected:** Counter shows "5/5", possibly with visual emphasis (different color?)
**Recommendation:** Show "5/5" in a warning color (`theme.warningColor` or `theme.accentSoftBlue`) to indicate limit reached

### Edge Case 3: Adding Beyond Limit
**Scenario:** User tries to drag 3 images when 4 already attached
**Current Behavior:** Only 1 image added, rest rejected with error message
**Expected:** Counter updates to "5/5", error shows for rejected images
**Status:** Already handled correctly in `addImages()` (lines 209-212)

### Edge Case 4: Rapid Add/Remove
**Scenario:** User quickly adds and removes images
**Current Behavior:** React state updates asynchronously via manager
**Expected:** Counter always reflects current state
**Status:** Manager uses `notifyListeners()` pattern - should be fine

### Edge Case 5: Mobile Horizontal Scroll
**Scenario:** 5 images on small screen, user scrolls preview strip
**Concern:** Counter might scroll off screen
**Recommendation:** Use `position: sticky; right: 0` or place counter outside scroll container

## Recommendations

### 1. Indicator Styling

Use the established Badge pattern with subtle styling:

```javascript
// Normal state (1-4 images)
backgroundColor: `${theme.textSecondary}10`
color: theme.textSecondary

// At limit (5 images)
backgroundColor: `${theme.accentSoftBlue}20`
color: theme.accentSoftBlue
```

### 2. Indicator Text Format

Use simple "X/5" format:
- `1/5` - one image
- `5/5` - at limit

Alternative: "X/5 images" for more clarity, but takes more space.

### 3. Placement Decision

**Recommended:** Inside ImagePreviewStrip, after thumbnails, with `flexShrink: 0` to prevent squishing.

**Alternative for mobile:** If horizontal scrolling is a concern, place above the strip as a header row.

### 4. Accessibility

Add `aria-label` for screen readers:
```javascript
aria-label={`${images.length} of ${maxImages} images attached`}
```

### 5. Plan Scope

Given that MULT-01 and MULT-03 are already complete, the plan should focus only on:
1. Adding the count indicator to ImagePreviewStrip
2. Wiring up the maxImages prop
3. Testing all edge cases

This is a single-task plan, estimated at ~30 minutes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-image state | Custom array management | Existing `ImageInputManager` | Already complete with proper validation |
| Image limit enforcement | Manual checks everywhere | `MAX_IMAGES` constant + existing checks | Already implemented in addImage/addImages |
| Individual removal | Manual array splice | `removeImage(index)` | Already handles bounds checking |

## Common Pitfalls

### Pitfall 1: Overengineering
**What goes wrong:** Creating new state, props, or components when existing ones suffice
**Why it happens:** Not recognizing how much was already built in Phase 1
**How to avoid:** Audit existing code first (this research doc)
**Warning signs:** Touching ImageInputManager.jsx for anything other than exports

### Pitfall 2: Counter Position on Mobile
**What goes wrong:** Counter scrolls off-screen with thumbnails
**Why it happens:** Putting counter inside scrollable flex container without sticky positioning
**How to avoid:** Test on mobile viewport, consider sticky or external placement
**Warning signs:** Counter disappears when scrolling preview strip

### Pitfall 3: Not Showing at Limit
**What goes wrong:** No visual distinction when at 5/5
**Why it happens:** Using same styling for all states
**How to avoid:** Add conditional styling for at-limit state
**Warning signs:** User doesn't realize they've hit the limit until they try to add more

## Code Examples

### Count Indicator Component

```jsx
// Inside ImagePreviewStrip.jsx
const ImageCountIndicator = ({ count, max, theme, atLimit }) => (
  <div
    style={{
      flexShrink: 0,
      padding: '4px 10px',
      borderRadius: 12,
      backgroundColor: atLimit ? `${theme.accentSoftBlue}20` : `${theme.textSecondary}10`,
      color: atLimit ? theme.accentSoftBlue : theme.textSecondary,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}
    aria-label={`${count} of ${max} images attached`}
  >
    {count}/{max}
  </div>
);
```

### Updated ImagePreviewStrip Usage

```jsx
// AstraApp.jsx InputBar section
{selectedImages && selectedImages.length > 0 && (
  <ImagePreviewStrip
    images={selectedImages}
    onRemove={onRemoveImage}
    theme={theme}
    isMobile={isMobile}
    maxImages={MAX_IMAGES}  // Add this prop
  />
)}
```

## State of the Art

No external libraries or patterns needed. This is straightforward React state display.

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| N/A - new feature | Conditional badge inside strip | Simple, follows existing patterns |

## Open Questions

1. **Indicator text format:** "3/5" vs "3/5 images" - recommend "3/5" for compactness
2. **At-limit styling:** Should 5/5 be a different color? Recommend yes (accent color)
3. **Mobile scroll behavior:** Sticky counter vs external placement? Recommend testing both

None of these block planning - can be decided during implementation.

## Sources

### Primary (HIGH confidence)
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/ImageInputManager.jsx` - Multi-image state management (direct code inspection)
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/ImagePreviewStrip.jsx` - Preview rendering (direct code inspection)
- `/Users/mbele/Desktop/DEV2/ASTRA/src/components/AstraApp.jsx` - Integration points (direct code inspection)

### Secondary (MEDIUM confidence)
- `/Users/mbele/Desktop/DEV2/ASTRA/.planning/phases/01-image-upload-foundation/01-VERIFICATION.md` - Phase 1 completion status
- `/Users/mbele/Desktop/DEV2/ASTRA/.planning/phases/02-image-compression/02-VERIFICATION.md` - Phase 2 completion status
- `/Users/mbele/Desktop/DEV2/ASTRA/.planning/STATE.md` - Prior decisions

## Metadata

**Confidence breakdown:**
- Current state analysis: HIGH - Direct code inspection of all relevant files
- Technical approach: HIGH - Following established codebase patterns
- Edge cases: HIGH - Traced through existing code paths
- Integration points: HIGH - Verified prop flow in AstraApp.jsx

**Research date:** 2026-01-20
**Valid until:** Indefinite (codebase-specific, no external dependencies)

---

*Research completed: 2026-01-20*
*Researcher: Claude (gsd-researcher)*
