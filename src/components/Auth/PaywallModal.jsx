import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from './SupabaseAuthProvider.jsx';
import { X, Zap, Shield, Clock } from 'lucide-react';
import authService from '../../services/authService';

const PaywallModal = ({ isOpen, onClose, theme, chatLimit }) => {
  const { signIn } = useSupabaseAuth();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    if (isOpen && chatLimit?.resetAt) {
      const updateTimer = () => {
        const remaining = authService.getTimeUntilReset(chatLimit.resetAt);
        setTimeRemaining(remaining);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isOpen, chatLimit?.resetAt]);

  const triggerSignIn = async (mode = 'signIn') => {
    try {
      const result = await signIn({ mode });
      if (result?.cancelled) return;

      if (result?.method === 'password-signup' && result?.email) {
        setAuthMessage(`Check ${result.email} to verify your account.`);
      } else if (result?.method === 'magic-link' && result?.email) {
        setAuthMessage(`Check ${result.email} for the sign-in link.`);
      } else if (result?.method === 'password-signin') {
        setAuthMessage('Welcome back! You are signed in.');
      } else if (result?.email) {
        setAuthMessage(`Check ${result.email} for next steps.`);
      }
    } catch (error) {
      console.error('Supabase sign-in failed', error);
      setAuthMessage(error.message || 'Sign-in failed. Please try again.');
    }
  };

  const handleSignUp = () => {
    triggerSignIn('signUp');
  };

  const handleSignIn = () => {
    triggerSignIn('signIn');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        backgroundColor: theme.backgroundSurface,
        borderRadius: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '32px',
        border: `1px solid ${theme.backgroundPrimary}`,
        fontFamily: '-apple-system, BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.backgroundPrimary;
            e.target.style.color = theme.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = theme.textSecondary;
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            backgroundColor: `${theme.accentSoftBlue}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={28} color={theme.accentSoftBlue} />
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: theme.textPrimary,
            margin: '0 0 12px 0',
            fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
          }}>
            You've reached your free limit
          </h3>

          {/* Description */}
          <p style={{
            fontSize: '16px',
            color: theme.textSecondary,
            margin: '0 0 16px 0',
            lineHeight: '1.5'
          }}>
            You've used all 10 of your free chats for today. You can wait for the reset or create an account for unlimited access.
          </p>

          {/* Countdown Timer */}
          {timeRemaining && timeRemaining !== 'Now' && (
            <div style={{
              backgroundColor: `${theme.accentSoftBlue}10`,
              border: `1px solid ${theme.accentSoftBlue}30`,
              borderRadius: '12px',
              padding: '16px',
              margin: '0 0 24px 0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: theme.textSecondary,
                marginBottom: '4px'
              }}>
                Free chats reset in:
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '600',
                color: theme.accentSoftBlue,
                fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
              }}>
                {timeRemaining}
              </div>
            </div>
          )}

          {/* Features */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            margin: '24px 0',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={20} color={theme.accentSoftBlue} />
              <span style={{ fontSize: '14px', color: theme.textPrimary }}>
                Unlimited medical consultations
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={20} color={theme.accentSoftBlue} />
              <span style={{ fontSize: '14px', color: theme.textPrimary }}>
                Secure chat history & sessions
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={20} color={theme.accentSoftBlue} />
              <span style={{ fontSize: '14px', color: theme.textPrimary }}>
                24/7 access to AI medical research
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            margin: '32px 0 24px 0'
          }}>
            <button
              onClick={handleSignUp}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: theme.accentSoftBlue,
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.accentSoftBlue;
                e.target.style.opacity = '0.9';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Create Free Account
            </button>

            <button
              onClick={handleSignIn}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '12px',
                border: `1px solid ${theme.backgroundPrimary}`,
                backgroundColor: 'transparent',
                color: theme.textPrimary,
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.backgroundPrimary;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Already have an account? Sign In
            </button>
          </div>

          {authMessage && (
            <p style={{
              fontSize: '12px',
              color: theme.accentSoftBlue,
              margin: 0,
              marginBottom: '16px'
            }}>
              {authMessage}
            </p>
          )}

          {/* Fine print */}
          <p style={{
            fontSize: '12px',
            color: theme.textSecondary,
            margin: 0,
            lineHeight: '1.4'
          }}>
            Free accounts reset every 24 hours. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
