import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../Themes+Styles';
import authService from '../../services/authService';
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
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
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
  redirectTo
}) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || null;
  const isDarkMode = themeContext?.isDarkMode || false;

  // Two-step flow state
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: Password
  const [email, setEmail] = useState(initialEmail);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const modalRef = useRef(null);
  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return ensurePortalElement();
  }, []);

  // Password strength checker
  const checkPasswordStrength = (pwd) => {
    if (!pwd) return null;

    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    const score = Object.values(requirements).filter(Boolean).length;

    return {
      score,
      requirements,
      strength: score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'good' : 'strong',
      color: score <= 2 ? '#ef4444' : score <= 3 ? '#f59e0b' : score <= 4 ? '#10b981' : '#22c55e'
    };
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setEmail(initialEmail || '');
      setPassword('');
      setMessage('');
      setError('');
      setShowPassword(false);
      setIsExistingUser(false);
      setPasswordStrength(null);

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
  }, [initialEmail, isOpen, onClose]);

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
    setLoadingProvider(provider);
    try {
      await signInWithOAuth(provider, { redirectTo });
      setMessage(`Redirecting to ${provider}...`);
      onComplete({ method: 'oauth', provider });
    } catch (err) {
      setError(err?.message || `Unable to connect with ${provider}. Please try again.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  // Step 1: Email submission
  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsCheckingEmail(true);
    try {
      // Check if email exists in Supabase Auth
      const { exists } = await authService.checkEmailExists(trimmedEmail);
      setIsExistingUser(exists);
      setCurrentStep(2);
    } catch (err) {
      setError(err?.message || 'Unable to verify email. Please try again.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Step 2: Password submission
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isExistingUser) {
        // Sign in existing user
        const result = await signInWithPassword(trimmedEmail, password);

        if (result?.session) {
          onComplete({ method: 'password-signin', email: trimmedEmail });
        } else {
          setError('Unable to sign in. Please check your credentials and try again.');
        }
      } else {
        // Sign up new user
        const result = await signUpWithPassword(trimmedEmail, password, { redirectTo });

        // Check if email confirmation is required
        if (result?.user && !result?.session) {
          // Email confirmation required - don't close modal
          setMessage('Please check your email to verify your account. You\'ll need to confirm your email before you can sign in.');
          setPassword(''); // Clear password for security
        } else if (result?.session) {
          // Immediate session (no email confirmation required)
          onComplete({ method: 'password-signup', email: trimmedEmail });
        } else {
          setMessage('Sign up successful! Please check your email to complete registration.');
        }
      }
    } catch (err) {
      // Enhanced error handling
      const errorMessage = err?.message || 'Something went wrong. Please try again.';

      // Check for specific error cases
      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email address before signing in. Check your inbox for the verification link.');
      } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (errorMessage.toLowerCase().includes('user already registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else {
        setError(errorMessage);
      }
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
      setMessage(`Password reset instructions were sent to ${trimmedEmail}. Check your email to reset your password.`);
      setPassword(''); // Clear password field
    } catch (err) {
      setError(err?.message || 'Could not send password reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmail = () => {
    setCurrentStep(1);
    setPassword('');
    setError('');
    setMessage('');
    setPasswordStrength(null);
  };

  if (!isOpen || !portalElement) {
    return null;
  }

  return createPortal(
    <div
      className={`auth-modal-overlay ${isDarkMode ? 'dark-mode' : ''}`}
      onMouseDown={handleBackdropClick}
      style={{
        '--auth-bg': theme?.backgroundSurface || '#FFFFFF',
        '--auth-text': theme?.textPrimary || '#2A2A2A',
        '--auth-text-secondary': theme?.textSecondary || '#5A6169',
        '--auth-accent': theme?.accentSoftBlue || '#4A6B7D',
        '--auth-border': isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        '--auth-error': theme?.errorColor || '#D92D20',
        '--auth-success': theme?.successColor || '#12B76A'
      }}
    >
      <div className="auth-modal-card" ref={modalRef} onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* Step 1: Email Input */}
        {currentStep === 1 && (
          <>
            <h2 className="auth-modal-title">Log in or sign up</h2>

            {error && <div className="auth-modal-alert auth-modal-alert-error">{error}</div>}
            {message && <div className="auth-modal-alert auth-modal-alert-success">{message}</div>}

            <form className="auth-modal-form" onSubmit={handleEmailSubmit}>
              <input
                type="email"
                autoComplete="email"
                placeholder="Email address"
                className="auth-modal-input auth-modal-input-large"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isCheckingEmail}
                autoFocus
              />

              <button
                type="submit"
                className="auth-modal-primary auth-modal-primary-large"
                disabled={isCheckingEmail}
              >
                {isCheckingEmail ? (
                  <span className="auth-modal-button-loading">
                    <Loader2 size={18} className="auth-modal-spinner" />
                    Checking...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            <div className="auth-modal-divider">
              <span>OR</span>
            </div>

            <div className="auth-modal-oauth-group">
              <button
                type="button"
                className="auth-modal-oauth-button auth-modal-oauth-button-large"
                onClick={() => handleOAuthClick('google')}
                disabled={isCheckingEmail || loadingProvider !== null}
              >
                {loadingProvider === 'google' ? (
                  <Loader2 size={18} className="auth-modal-spinner" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                className="auth-modal-oauth-button auth-modal-oauth-button-large"
                onClick={() => handleOAuthClick('apple')}
                disabled={isCheckingEmail || loadingProvider !== null}
              >
                {loadingProvider === 'apple' ? (
                  <Loader2 size={18} className="auth-modal-spinner" />
                ) : (
                  <AppleIcon />
                )}
                <span>{loadingProvider === 'apple' ? 'Connecting...' : 'Continue with Apple'}</span>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Password Input */}
        {currentStep === 2 && (
          <>
            <h2 className="auth-modal-title">
              {isExistingUser ? 'Enter your password' : 'Create your account'}
            </h2>

            {error && <div className="auth-modal-alert auth-modal-alert-error">{error}</div>}
            {message && <div className="auth-modal-alert auth-modal-alert-success">{message}</div>}

            <form className="auth-modal-form" onSubmit={handlePasswordSubmit}>
              {/* Email display with edit button */}
              <div className="auth-modal-email-display">
                <label className="auth-modal-label">Email address</label>
                <div className="auth-modal-email-row">
                  <span className="auth-modal-email-text">{email}</span>
                  <button
                    type="button"
                    className="auth-modal-email-edit"
                    onClick={handleEditEmail}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Password input */}
              <div className="auth-modal-password-container">
                <label className="auth-modal-label" htmlFor="auth-password">Password</label>
                <div className="auth-modal-password-wrapper">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isExistingUser ? 'current-password' : 'new-password'}
                    placeholder={isExistingUser ? 'Enter your password' : 'Create a password'}
                    className="auth-modal-input auth-modal-input-with-icon"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (!isExistingUser) {
                        setPasswordStrength(checkPasswordStrength(event.target.value));
                      }
                    }}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="auth-modal-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Password strength indicator for new users */}
              {!isExistingUser && passwordStrength && (
                <div className="auth-modal-password-strength">
                  <div className="auth-modal-password-strength-bar">
                    <div
                      className={`auth-modal-password-strength-fill ${passwordStrength.strength}`}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <ul className="auth-modal-password-requirements">
                    <li className={passwordStrength.requirements.length ? 'met' : ''}>
                      {passwordStrength.requirements.length ? '✓' : '○'} At least 8 characters
                    </li>
                    <li className={passwordStrength.requirements.uppercase ? 'met' : ''}>
                      {passwordStrength.requirements.uppercase ? '✓' : '○'} One uppercase letter
                    </li>
                    <li className={passwordStrength.requirements.number ? 'met' : ''}>
                      {passwordStrength.requirements.number ? '✓' : '○'} One number
                    </li>
                  </ul>
                </div>
              )}

              {/* Forgot password link for existing users */}
              {isExistingUser && (
                <div className="auth-modal-forgot-password">
                  <button
                    type="button"
                    className="auth-modal-link"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="auth-modal-primary auth-modal-primary-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="auth-modal-button-loading">
                    <Loader2 size={18} className="auth-modal-spinner" />
                    Processing...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            {/* Alternative SSO options at bottom */}
            <div className="auth-modal-divider">
              <span>OR</span>
            </div>

            <div className="auth-modal-oauth-group">
              <button
                type="button"
                className="auth-modal-oauth-button"
                onClick={() => handleOAuthClick('google')}
                disabled={isSubmitting || loadingProvider !== null}
              >
                {loadingProvider === 'google' ? (
                  <Loader2 size={18} className="auth-modal-spinner" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                className="auth-modal-oauth-button"
                onClick={() => handleOAuthClick('apple')}
                disabled={isSubmitting || loadingProvider !== null}
              >
                {loadingProvider === 'apple' ? (
                  <Loader2 size={18} className="auth-modal-spinner" />
                ) : (
                  <AppleIcon />
                )}
                <span>{loadingProvider === 'apple' ? 'Connecting...' : 'Continue with Apple'}</span>
              </button>
            </div>

            {/* Terms for new users */}
            {!isExistingUser && (
              <p className="auth-modal-terms">
                By continuing, you agree to our{' '}
                <a href="/terms.html" target="_blank" rel="noopener noreferrer">
                  Terms of Use
                </a>{' '}
                and{' '}
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                .
              </p>
            )}
          </>
        )}
      </div>
    </div>,
    portalElement
  );
};

export default AuthModal;
