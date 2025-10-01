import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AuthModal.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="#000000">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const AstraLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect x="8" y="8" width="16" height="16" rx="4" fill="#4A90E2"/>
    <rect x="24" y="24" width="16" height="16" rx="4" fill="#6BA6F2"/>
  </svg>
);

const DEFAULT_PORTAL_ID = 'astra-auth-modal-root';

const ensurePortalElement = () => {
  let existing = document.getElementById(DEFAULT_PORTAL_ID);
  if (!existing) {
    existing = document.createElement('div');
    existing.setAttribute('id', DEFAULT_PORTAL_ID);
    document.body.appendChild(existing);
  }
  return existing;
};

const AuthModal = ({
  isOpen,
  onClose,
  onComplete,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  signInWithOAuth,
  initialEmail = '',
  initialMode = 'signIn',
  redirectTo,
  allowMagicLink,
  signInWithMagicLink
}) => {
  const [mode, setMode] = useState(initialMode === 'signUp' ? 'signUp' : 'signIn');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef(null);
  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return ensurePortalElement();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'signUp' ? 'signUp' : 'signIn');
      setEmail(initialEmail || '');
      setPassword('');
      setMessage('');
      setError('');
      setShowPassword(false);

      const handleKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
    return undefined;
  }, [initialEmail, initialMode, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return () => {};

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleBackdropClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  const handleOAuthClick = async (provider) => {
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      await signInWithOAuth(provider, { redirectTo });
      onComplete({ method: 'oauth', provider });
    } catch (err) {
      setError(err?.message || 'Unable to start OAuth flow.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signUp') {
        await signUpWithPassword(trimmedEmail, password, { redirectTo });
        setMessage('Check your email to verify and finish setting up your account.');
        onComplete({ method: 'password-signup', email: trimmedEmail });
      } else {
        await signInWithPassword(trimmedEmail, password);
        onComplete({ method: 'password-signin', email: trimmedEmail });
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email first so we know where to send the reset link.');
      return;
    }
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      await sendPasswordReset(trimmedEmail, { redirectTo });
      setMessage(`Password reset instructions were sent to ${trimmedEmail}.`);
    } catch (err) {
      setError(err?.message || 'Could not send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setMessage('');
    setError('');
  };

  const handleMagicLink = async () => {
    if (!allowMagicLink || !signInWithMagicLink) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      await signInWithMagicLink(trimmedEmail, { redirectTo });
      setMessage(`Check ${trimmedEmail} for the sign-in link.`);
      onComplete({ method: 'magic-link', email: trimmedEmail });
    } catch (err) {
      setError(err?.message || 'Failed to send magic link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleText = 'Welcome';
  const subtitleText = 'Log in to Astra to continue to your workspace.';

  if (!isOpen || !portalElement) {
    return null;
  }

  return createPortal(
    <div className="auth-modal-overlay" onMouseDown={handleBackdropClick}>
      <div className="auth-modal-card" ref={modalRef} onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="auth-modal-logo">
          <AstraLogo />
        </div>

        <h2 className="auth-modal-title">{titleText}</h2>
        <p className="auth-modal-subtitle">{subtitleText}</p>

        {error && <div className="auth-modal-alert auth-modal-alert-error">{error}</div>}
        {message && <div className="auth-modal-alert auth-modal-alert-success">{message}</div>}

        <form className="auth-modal-form" onSubmit={handlePasswordSubmit}>
          <label className="auth-modal-label" htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="auth-modal-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />

          <div className="auth-modal-password-row">
            <div className="auth-modal-password-field">
              <label className="auth-modal-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                placeholder="Enter your password"
                className="auth-modal-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <button
              type="button"
              className="auth-modal-toggle-password"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="auth-modal-form-footer">
            <button
              type="button"
              className="auth-modal-link"
              onClick={handleForgotPassword}
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="auth-modal-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Continue'}
          </button>
        </form>

        <div className="auth-modal-secondary">
          <span>Don&apos;t have an account?</span>
          <button type="button" className="auth-modal-link" onClick={handleToggleMode} disabled={isSubmitting}>
            Sign up
          </button>
        </div>

        <div className="auth-modal-divider">
          <span>OR</span>
        </div>

        <div className="auth-modal-oauth-group">
          <button
            type="button"
            className="auth-modal-oauth-button"
            onClick={() => handleOAuthClick('apple')}
            disabled={isSubmitting}
          >
            <AppleIcon />
            <span>Continue with Apple</span>
          </button>
          <button
            type="button"
            className="auth-modal-oauth-button"
            onClick={() => handleOAuthClick('google')}
            disabled={isSubmitting}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default AuthModal;
