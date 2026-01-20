import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, SwitchCamera, CameraOff } from 'lucide-react';

/**
 * CameraCapture - Full-screen camera modal for mobile photo capture
 *
 * Props:
 * - isOpen (boolean): controls modal visibility
 * - onCapture (function): called with File when photo captured
 * - onClose (function): called to close modal
 */
const CameraCapture = ({ isOpen, onCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const videoRef = useRef(null);

  const startCamera = async (facing = facingMode) => {
    try {
      // Stop existing stream if any
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
        setError('To take photos, please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera was found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another app. Please close other apps and try again.');
      } else {
        setError('Could not access the camera. Please try again.');
      }
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    await startCamera(newFacingMode);
  };

  // Note: Captured images are passed to addImages() which uses browser-image-compression.
  // browser-image-compression automatically handles EXIF orientation during compression,
  // so images display correctly regardless of device orientation when captured.
  // Additionally, canvas.toBlob() from video stream produces correctly-oriented images
  // because the video stream is already orientation-corrected by the browser.
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    }, 'image/jpeg', 0.92);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setError(null);
    onClose();
  };

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
          aria-label="Capture photo"
          style={{
            position: 'absolute',
            bottom: 'max(40px, calc(env(safe-area-inset-bottom) + 24px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '4px solid rgba(255, 255, 255, 0.8)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fff'
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
