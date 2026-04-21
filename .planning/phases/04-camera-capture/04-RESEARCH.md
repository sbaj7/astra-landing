# Phase 4: Camera Capture - Research

**Researched:** 2026-01-20
**Domain:** Mobile camera capture in web applications
**Confidence:** HIGH

## Summary

Mobile camera capture in web applications has two main approaches: the HTML `<input capture>` attribute and the `getUserMedia()` API. For Astra MD's requirements (front/back camera switching, EXIF orientation handling, live preview before capture), **`getUserMedia()` is the recommended approach**. The HTML capture attribute has a critical limitation on Android 14/15 where Chrome no longer shows the camera option, making it unreliable for a medical application.

The integration is straightforward: create a modal camera UI that captures images using canvas, then feeds them into the existing `addImages()` flow which already handles compression and validation. The existing `browser-image-compression` library handles EXIF orientation automatically during compression, solving CAM-04 without additional libraries.

**Primary recommendation:** Build a custom camera component using `getUserMedia()` with `facingMode` constraints for camera switching, capture via canvas `toBlob()`, and integrate with existing `addImages()` flow. Show camera only on mobile devices.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `getUserMedia()` API | N/A | Camera stream access | Built into browsers, no dependencies |
| Native Canvas API | N/A | Capture still image from video | Built into browsers, no dependencies |
| browser-image-compression | ^2.0.2 | EXIF handling + compression | Already in project, handles orientation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-webcam | ^7.2.0 | Pre-built React camera component | If custom implementation too complex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `getUserMedia` | react-webcam | Less control, but faster to implement; iOS Safari issues reported |
| Custom `getUserMedia` | react-camera-pro | Mobile-optimized but less maintained |
| getUserMedia | `<input capture>` | Simpler but broken on Android 14/15 Chrome, no live preview |

**Installation:**
```bash
# No new packages needed - using browser APIs
# Optional if custom implementation is complex:
npm install react-webcam
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── CameraCapture.jsx       # Modal camera UI component
├── ImageInputManager.jsx   # (existing) - addImages() integration point
├── InputBar (in AstraApp)  # (existing) - camera button added here
└── ImagePreviewStrip.jsx   # (existing) - shows captured images
```

### Pattern 1: Camera Capture Modal
**What:** Full-screen modal with video preview and capture button
**When to use:** Mobile-only camera capture with live preview
**Example:**
```javascript
// Source: MDN getUserMedia documentation
const CameraCapture = ({ isOpen, onCapture, onClose }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera default
  const [error, setError] = useState(null);

  const startCamera = async (facing) => {
    try {
      // Stop existing stream before switching
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera. Please try again.');
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.92);
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // ... render modal with video, capture button, switch button
};
```

### Pattern 2: Permission Denied Handling
**What:** User-friendly error message with guidance
**When to use:** When `NotAllowedError` is caught
**Example:**
```javascript
// Source: MDN getUserMedia error handling
const PermissionDeniedMessage = ({ onRetry }) => (
  <div className="camera-permission-error">
    <CameraOff size={48} />
    <h3>Camera Access Required</h3>
    <p>
      To capture photos, please allow camera access in your browser settings.
    </p>
    <p className="text-sm text-secondary">
      On iOS: Settings &gt; Safari &gt; Camera &gt; Allow
      <br />
      On Android: Tap the lock icon in the address bar
    </p>
    <button onClick={onRetry}>Try Again</button>
  </div>
);
```

### Pattern 3: Camera Switch with Stream Cleanup
**What:** Properly stop old stream before starting new one
**When to use:** When switching between front/back camera
**Example:**
```javascript
// Source: WebRTC best practices
const switchCamera = async () => {
  // CRITICAL: Stop existing tracks first
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  // Then request new stream with opposite facingMode
  const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
  await startCamera(newFacingMode);
  setFacingMode(newFacingMode);
};
```

### Anti-Patterns to Avoid
- **Not stopping streams on unmount:** Leads to camera light staying on, battery drain
- **Using `exact` constraint for facingMode:** Fails if device only has one camera; use preference instead
- **Forgetting HTTPS requirement:** getUserMedia only works on secure origins
- **Ignoring iOS Safari quirks:** Multiple getUserMedia calls cause issues; clone streams instead
- **Using `<input capture>` as primary:** Broken on Android 14/15 Chrome

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF orientation | Manual EXIF parsing/rotation | browser-image-compression | Already handles it during compression |
| Camera permission state | Custom permission checking | Native `getUserMedia` error handling | Browser provides clear error types |
| Image compression | Canvas resize loop | Existing `addImages()` flow | Already implemented in Phase 2 |
| Mobile detection | User agent parsing | `useIsMobile()` hook | Already exists in codebase |

**Key insight:** The existing `addImages()` flow already handles compression (which includes EXIF orientation correction) and validation. Camera capture just needs to produce a File/Blob and feed it into that flow.

## Common Pitfalls

### Pitfall 1: Camera Stream Not Stopping
**What goes wrong:** Camera light stays on after closing modal, battery drain
**Why it happens:** Stream tracks not stopped on unmount or modal close
**How to avoid:** Always stop all tracks: `stream.getTracks().forEach(track => track.stop())`
**Warning signs:** Camera indicator stays on after closing camera UI

### Pitfall 2: iOS Safari Multiple getUserMedia Calls
**What goes wrong:** Video stream goes blank after camera switch
**Why it happens:** iOS Safari has issues with multiple getUserMedia calls
**How to avoid:** Stop previous stream completely before new getUserMedia call; consider keeping single stream
**Warning signs:** Black video after switching cameras on iPhone

### Pitfall 3: Strict facingMode Constraint Failure
**What goes wrong:** Camera fails to open on devices with single camera
**Why it happens:** Using `{ exact: 'environment' }` fails if only front camera exists
**How to avoid:** Use preference `{ facingMode: 'environment' }` instead of exact match
**Warning signs:** "OverconstrainedError" on budget phones with single camera

### Pitfall 4: Permission State Not Persisted
**What goes wrong:** User has to grant permission every page load (Safari)
**Why it happens:** Safari doesn't persist permissions like Chrome does
**How to avoid:** Clear error messaging, make permission flow obvious; store user preference for camera facing
**Warning signs:** Repeated permission prompts on Safari

### Pitfall 5: Portrait Photos Displayed Sideways
**What goes wrong:** Photos appear rotated 90 degrees
**Why it happens:** EXIF orientation not applied
**How to avoid:** Pass captured image through `addImages()` which uses browser-image-compression with auto-orientation
**Warning signs:** Portrait selfies appear landscape

### Pitfall 6: Android 14/15 Input Capture Broken
**What goes wrong:** Camera option doesn't appear on Android Chrome
**Why it happens:** Chrome 14/15 removed camera option from file input
**How to avoid:** Use getUserMedia instead of `<input capture>`
**Warning signs:** Only "Browse files" option on newer Android devices

## Code Examples

Verified patterns from official sources:

### Basic getUserMedia Setup
```javascript
// Source: MDN Web Docs - MediaDevices.getUserMedia()
async function startCamera(facingMode = 'environment') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode,  // 'user' for front, 'environment' for back
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    return stream;
  } catch (error) {
    // Handle specific error types
    switch (error.name) {
      case 'NotAllowedError':
        throw new Error('Camera permission denied');
      case 'NotFoundError':
        throw new Error('No camera found');
      case 'NotReadableError':
        throw new Error('Camera in use by another app');
      default:
        throw new Error('Could not access camera');
    }
  }
}
```

### Capture Photo from Video Stream
```javascript
// Source: MDN Web Docs - Taking still photos with getUserMedia
function capturePhoto(videoElement, quality = 0.92) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File(
        [blob],
        `capture-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );
      resolve(file);
    }, 'image/jpeg', quality);
  });
}
```

### Integration with Existing addImages Flow
```javascript
// In CameraCapture component
const handleCapture = async () => {
  const file = await capturePhoto(videoRef.current);

  // Use existing addImages from ImageInputManager
  const { added, rejected } = await addImages([file]);

  if (added.length > 0) {
    onClose(); // Close camera modal
  } else if (rejected.length > 0) {
    setError(rejected[0].errors[0]);
  }
};
```

### Mobile-Only Camera Button
```javascript
// In InputBar, show camera button only on mobile
{isMobile && (
  <button
    onClick={() => setShowCamera(true)}
    disabled={isDisabled || selectedImages.length >= MAX_IMAGES}
    aria-label="Take photo"
    // ... styles
  >
    <Camera size={isMobile ? 18 : 20} />
  </button>
)}
```

## EXIF Orientation Handling

### How browser-image-compression Handles It

The existing `browser-image-compression` library (already in the project from Phase 2) automatically handles EXIF orientation during compression. When an image is compressed, the library:

1. Reads EXIF orientation tag from JPEG metadata
2. Rotates the image data on the canvas to correct orientation
3. Outputs a correctly-oriented image without EXIF orientation tag (since the image data is now correct)

**No additional code needed for EXIF handling** - the existing `addImages()` flow already passes images through compression which corrects orientation.

### Why This Works for Camera Capture

When `canvas.toBlob()` captures from the video stream:
- The video stream is already correctly oriented (browser handles this)
- The resulting blob has no EXIF orientation issues
- Passing through `addImages()` provides consistency and triggers compression for large captures

## Native Input Capture (Fallback Reference)

While not recommended as primary approach due to Android 14/15 issues, documenting for completeness:

```html
<!-- Opens camera directly on supported mobile browsers -->
<input type="file" accept="image/*" capture="environment" />
<!-- capture="user" for front camera -->
```

**Limitations:**
- Android 14/15 Chrome: Camera option removed, only shows file picker
- No live preview - goes directly to native camera app
- Less control over capture experience
- Cannot switch cameras within the web app

## Platform-Specific Considerations

### iOS Safari
| Issue | Solution |
|-------|----------|
| Permission prompt on every page load | Accept this behavior, clear messaging |
| Multiple getUserMedia calls break stream | Stop previous stream completely before new call |
| WebRTC requires Safari (not Chrome iOS) | getUserMedia works in Safari, Chrome, Firefox on iOS 15.4+ |
| playsinline required for video | Add `playsinline` attribute to video element |

### Android Chrome
| Issue | Solution |
|-------|----------|
| Android 14/15 input capture broken | Use getUserMedia, not input capture |
| Some devices have only front camera | Use preference, not exact constraint |

### Desktop
| Issue | Solution |
|-------|----------|
| Camera button shows on desktop | Only render camera button when `isMobile` is true |
| External webcam enumeration | Not needed for v1, mobile-focused feature |

## Integration Points

### Where Camera Hooks Into Existing Code

1. **InputBar** (in AstraApp.jsx)
   - Add camera button next to existing image upload button
   - Show only when `isMobile` is true
   - Clicking opens CameraCapture modal

2. **CameraCapture** (new component)
   - Modal with video preview
   - Capture button
   - Camera switch button (front/back)
   - Permission denied message
   - Calls `addImages([capturedFile])` on capture

3. **ImageInputManager.jsx** (existing)
   - No changes needed
   - `addImages()` already handles File objects
   - Compression handles EXIF orientation

4. **ImagePreviewStrip.jsx** (existing)
   - No changes needed
   - Will display captured images same as uploaded ones

### Data Flow
```
User taps camera button
  -> CameraCapture modal opens
  -> getUserMedia() requests camera access
  -> Video preview shows
  -> User taps capture
  -> canvas.toBlob() creates File
  -> addImages([file]) called (existing flow)
  -> compression applied (existing - handles EXIF)
  -> Image added to selectedImages
  -> Modal closes
  -> ImagePreviewStrip shows capture
```

## Browser Support

### getUserMedia Support (caniuse.com)
| Browser | Support |
|---------|---------|
| Chrome | 53+ (2016) |
| Safari | 11+ (2017) |
| Firefox | 36+ (2015) |
| Edge | 12+ (2015) |
| iOS Safari | 11+ (2017) |
| Chrome Android | 53+ (2016) |

**Key requirement:** HTTPS (or localhost for development)

### facingMode Support
- Well-supported on all mobile browsers
- Desktop browsers may ignore facingMode if only one camera

## Open Questions

Things that couldn't be fully resolved:

1. **Should camera be available on desktop?**
   - What we know: Desktop users have webcams, but feature is designed for mobile
   - What's unclear: User research on desktop camera usage
   - Recommendation: Mobile-only for v1, consider desktop in v2

2. **Mirror video preview for front camera?**
   - What we know: Native camera apps mirror front camera preview
   - What's unclear: Medical imaging expectations
   - Recommendation: Mirror preview, but capture un-mirrored image (standard behavior)

3. **Maximum capture resolution?**
   - What we know: Compression will resize to maxWidthOrHeight: 1920
   - What's unclear: If medical images need higher resolution
   - Recommendation: Capture at video stream resolution, let compression handle sizing

## Sources

### Primary (HIGH confidence)
- [MDN - MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - API reference, error types, constraints
- [MDN - Taking still photos with getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos) - Canvas capture pattern
- [MDN - HTML capture attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture) - Native input capture (fallback reference)

### Secondary (MEDIUM confidence)
- [web.dev - Capture audio and video in HTML5](https://web.dev/articles/getusermedia-intro) - Patterns overview
- [DigitalOcean - Front and Rear Camera Access](https://www.digitalocean.com/community/tutorials/front-and-rear-camera-access-with-javascripts-getusermedia) - facingMode tutorial
- [GitHub - browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) - EXIF handling confirmation
- [react-webcam GitHub issues](https://github.com/mozmorris/react-webcam/issues) - iOS Safari known issues

### Tertiary (LOW confidence)
- [Android 14/15 input capture issue](https://blog.addpipe.com/html-file-input-accept-video-camera-option-is-missing-android-14-15/) - Reported Chrome behavior change
- WebSearch results for iOS Safari getUserMedia limitations - Anecdotal reports from 2020-2022

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Browser APIs are well-documented, stable
- Architecture: HIGH - Clear integration with existing addImages flow
- Pitfalls: HIGH - Well-documented iOS Safari issues, Android 14/15 input issues
- EXIF handling: HIGH - Verified browser-image-compression handles orientation

**Research date:** 2026-01-20
**Valid until:** 2026-04-20 (90 days - browser APIs are stable)
