import { useState, useRef, useEffect, useCallback } from 'react';
import { X, SwitchCamera, CameraOff } from 'lucide-react';

/**
 * CameraCapture - Full-screen camera modal for mobile photo capture
 *
 * Props:
 * - isOpen (boolean): controls modal visibility
 * - onCapture (function): called with File when photo captured
 * - onClose (function): called to close modal
 */
const CameraCapture = ({ isOpen, onCapture, onClose }) => {
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isVideoReady, setIsVideoReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null); // Use ref to avoid stale closure issues

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing) => {
    // Check if camera API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera is not supported on this device or browser.');
      return;
    }

    try {
      // Stop any existing stream
      stopStream();
      setIsVideoReady(false);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = mediaStream;

      // Wait a tick for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 50));

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Explicitly play - required on iOS Safari
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Auto-play failed, user interaction may be required:', playError);
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('To take photos, please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera was found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is being used by another app. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        // Try again with simpler constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.warn('Fallback play failed:', playErr);
            }
          }
        } catch (fallbackErr) {
          setError('Could not access the camera. Please try again.');
        }
      } else {
        setError('Could not access the camera. Please try again.');
      }
    }
  }, [stopStream]);

  const handleVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setIsVideoReady(true);
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    await startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setError('Camera not initialized. Please try again.');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      console.error('Video dimensions not ready:', { width, height });
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to capture photo: toBlob returned null');
        setError('Failed to capture photo. Please try again.');
        return;
      }

      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.92);
  }, [onCapture]);

  const handleClose = useCallback(() => {
    stopStream();
    setError(null);
    setIsVideoReady(false);
    onClose();
  }, [stopStream, onClose]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
      setIsVideoReady(false);
    }

    return () => {
      stopStream();
    };
  }, [isOpen]); // intentionally not including facingMode/startCamera to avoid re-triggering

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Close camera"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 16,
          padding: 12,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}
      >
        <X size={24} />
      </button>

      {/* Video preview or error */}
      {error ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 40,
            textAlign: 'center',
            color: 'white'
          }}
        >
          <CameraOff size={64} style={{ opacity: 0.7, marginBottom: 24 }} />
          <h3 style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 12,
            color: 'white'
          }}>
            Camera Access Required
          </h3>
          <p style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 24,
            maxWidth: 280,
            lineHeight: 1.5
          }}>
            {error}
          </p>
          <p style={{
            fontSize: 14,
            opacity: 0.6,
            marginBottom: 32,
            maxWidth: 280,
            lineHeight: 1.6
          }}>
            <strong>iOS:</strong> Settings &rarr; Safari &rarr; Camera &rarr; Allow
            <br />
            <strong>Android:</strong> Tap lock icon in address bar
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => startCamera(facingMode)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'white',
                color: '#1a1a1a',
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'transparent',
                color: 'white',
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoReady}
          onCanPlay={handleVideoReady}
          onPlaying={handleVideoReady}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }}
        />
      )}

      {/* Capture button */}
      {!error && (
        <button
          onClick={capturePhoto}
          disabled={!isVideoReady}
          aria-label="Capture photo"
          style={{
            position: 'absolute',
            bottom: 'max(40px, calc(env(safe-area-inset-bottom) + 24px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: `4px solid ${isVideoReady ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'}`,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            cursor: isVideoReady ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            opacity: isVideoReady ? 1 : 0.5
          }}
          onTouchStart={(e) => {
            if (!isVideoReady) return;
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
          }}
          onTouchEnd={(e) => {
            if (!isVideoReady) return;
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: isVideoReady ? '#fff' : 'rgba(255, 255, 255, 0.5)'
            }}
          />
        </button>
      )}

      {/* Camera Switch Button */}
      {!error && (
        <button
          onClick={switchCamera}
          aria-label={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
          style={{
            position: 'absolute',
            bottom: 'max(52px, calc(env(safe-area-inset-bottom) + 36px))',
            right: 24,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <SwitchCamera size={24} />
        </button>
      )}
    </div>
  );
};

export default CameraCapture;
