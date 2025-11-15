import React, { useState, useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';
import authService from '../services/authService';

/**
 * UsageBar Component
 * Displays a Claude-style usage progress bar showing chat usage with countdown timer
 *
 * @param {number} used - Number of chats used (0-10)
 * @param {number} total - Total chats allowed (default: 10)
 * @param {string} resetAt - ISO timestamp when usage resets
 * @param {object} theme - Theme object with colors
 * @param {boolean} isPaidUser - Whether user has active subscription
 * @param {function} onUpgrade - Callback when upgrade button clicked
 * @param {boolean} compact - Compact mode for toolbar (optional)
 */
const UsageBar = ({
  used = 0,
  total = 10,
  resetAt,
  theme,
  isPaidUser = false,
  onUpgrade,
  compact = false
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');

  // Update countdown timer every minute
  useEffect(() => {
    if (!resetAt || isPaidUser) return;

    const updateTimer = () => {
      const remaining = authService.getTimeUntilReset(resetAt);
      setTimeRemaining(remaining);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [resetAt, isPaidUser]);

  // Calculate percentage for progress bar
  const percentage = Math.min(100, Math.max(0, (used / total) * 100));
  const remaining = Math.max(0, total - used);

  // Determine color based on usage
  const getUsageColor = () => {
    if (isPaidUser) return theme.accentSoftBlue;
    if (used >= total) return '#EF4444'; // Red for limit reached
    if (used >= 7) return '#EA580C'; // Orange for warning
    return theme.accentSoftBlue; // Blue for normal
  };

  const usageColor = getUsageColor();

  // Paid users get unlimited display
  if (isPaidUser) {
    return (
      <div style={{
        padding: compact ? '12px' : '16px 20px',
        borderRadius: '12px',
        backgroundColor: `${theme.accentSoftBlue}08`,
        border: `1px solid ${theme.accentSoftBlue}20`,
        marginBottom: compact ? '0' : '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <Zap
            size={20}
            style={{
              color: theme.accentSoftBlue,
              strokeWidth: 2.5
            }}
          />
          <div style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: '600',
            color: theme.accentSoftBlue,
            fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
          }}>
            Unlimited chats
          </div>
        </div>
      </div>
    );
  }

  // Free users get usage bar
  return (
    <div style={{
      padding: compact ? '12px 16px' : '16px 20px',
      borderRadius: '12px',
      backgroundColor: `${usageColor}05`,
      border: `1px solid ${usageColor}15`,
      marginBottom: compact ? '0' : '20px'
    }}>
      {/* Header with usage count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <div style={{
          fontSize: compact ? '12px' : '13px',
          fontWeight: '600',
          color: theme.textPrimary,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
        }}>
          {used} of {total} chats used today
        </div>
        <div style={{
          fontSize: compact ? '11px' : '12px',
          fontWeight: '600',
          color: usageColor,
          fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
        }}>
          {remaining} left
        </div>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${used} of ${total} chats used`}
        style={{
          width: '100%',
          height: compact ? '6px' : '8px',
          backgroundColor: `${theme.textSecondary}12`,
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: (timeRemaining && timeRemaining !== 'Now') || used >= total ? '12px' : '0'
        }}
      >
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${usageColor}, ${usageColor}dd)`,
          borderRadius: '999px',
          transition: 'width 0.3s ease-in-out'
        }} />
      </div>

      {/* Countdown Timer */}
      {timeRemaining && timeRemaining !== 'Now' && used < total && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: used >= total ? '12px' : '0'
        }}>
          <Clock
            size={compact ? 12 : 14}
            style={{
              color: theme.textSecondary,
              strokeWidth: 2
            }}
          />
          <div style={{
            fontSize: compact ? '11px' : '12px',
            color: theme.textSecondary,
            fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
          }}>
            Resets in {timeRemaining}
          </div>
        </div>
      )}

      {/* Upgrade Prompt - Only show when limit reached */}
      {used >= total && onUpgrade && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '4px'
        }}>
          <div style={{
            fontSize: compact ? '11px' : '12px',
            color: theme.textSecondary,
            lineHeight: '1.5',
            fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
          }}>
            You've reached your daily limit. Upgrade for unlimited chats.
          </div>
          <button
            onClick={onUpgrade}
            style={{
              padding: compact ? '8px 14px' : '10px 16px',
              backgroundColor: usageColor,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: compact ? '12px' : '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Upgrade to Plus
          </button>
          {timeRemaining && timeRemaining !== 'Now' && (
            <div style={{
              fontSize: '11px',
              color: theme.textSecondary,
              textAlign: 'center',
              fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif'
            }}>
              or wait {timeRemaining} for free chats to reset
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsageBar;
