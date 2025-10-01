import React from 'react';
import { X, Check, Loader2, ExternalLink } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    cadence: 'per month',
    description: 'For individual clinicians who need deeper research support.',
    features: [
      'Unlimited research chats',
      'Priority access to reasoning mode',
      'Save & export encounters',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$79',
    cadence: 'per month',
    description: 'For teams and power users who need collaborative tooling.',
    features: [
      'Everything in Starter',
      'Team workspaces (up to 5 seats)',
      'One-click guideline search',
      'Premium evidence packs & pathways'
    ]
  }
];

const formatTimestamp = (ts) => {
  if (!ts) return null;
  try {
    const date = new Date(ts * 1000);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return null;
  }
};

const Badge = ({ label, theme }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${theme.accentSoftBlue}20`,
      color: theme.accentSoftBlue,
      borderRadius: 999,
      padding: '4px 12px',
      fontSize: 12,
      fontWeight: 600
    }}
  >
    <Check size={14} />
    {label}
  </span>
);

const BillingModal = ({
  isOpen,
  onClose,
  theme,
  subscription,
  isLoading,
  onSelectPlan,
  onManageSubscription,
  billingStatus,
  error,
  isProcessing
}) => {
  if (!isOpen) return null;

  const activePlanId = subscription?.plan_key || null;
  const isSubscribed = Boolean(subscription);
  const renewalDate = subscription ? formatTimestamp(subscription.current_period_end) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.5)'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Billing portal"
    >
      <style>
        {`
          @keyframes billing-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 900,
          maxHeight: '95vh',
          overflowY: 'auto',
          backgroundColor: theme.backgroundSurface,
          borderRadius: 24,
          padding: '32px 36px 40px',
          boxShadow: '0 30px 60px -15px rgba(15,23,42,0.35)',
          border: `1px solid ${theme.textSecondary}1f`
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: `${theme.textSecondary}15`,
            color: theme.textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close billing"
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 32 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: theme.textPrimary }}>Billing & plans</h2>
            <p style={{ marginTop: 8, color: theme.textSecondary, lineHeight: 1.6 }}>
              Upgrade to unlock unlimited chats, reasoning mode, and premium medical evidence packs.
            </p>
          </div>

          {billingStatus && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: billingStatus === 'success' ? `${theme.successColor}1f` : `${theme.textSecondary}15`,
                color: billingStatus === 'success' ? theme.successColor : theme.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Check size={18} />
              <span>
                {billingStatus === 'success'
                  ? 'Subscription updated successfully.'
                  : 'Checkout cancelled. You can resume any time.'}
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: `${theme.errorColor}18`,
                color: theme.errorColor
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20
            }}
          >
            {plans.map((plan) => {
              const isActive = activePlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  style={{
                    borderRadius: 20,
                    padding: '24px 24px 28px',
                    backgroundColor: `${theme.backgroundPrimary}F2`,
                    border: `1px solid ${isActive ? theme.accentSoftBlue : theme.textSecondary}25`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    position: 'relative'
                  }}
                >
                  {isActive && <Badge label="Current plan" theme={theme} />}

                  <div>
                    <h3 style={{ fontSize: 20, margin: 0, color: theme.textPrimary }}>{plan.name}</h3>
                    <p style={{ margin: '6px 0 0', color: theme.textSecondary }}>{plan.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 30, fontWeight: 700, color: theme.textPrimary }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: theme.textSecondary }}>{plan.cadence}</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', gap: 10, alignItems: 'center', color: theme.textSecondary }}>
                        <Check size={16} color={theme.accentSoftBlue} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelectPlan?.(plan.id)}
                    disabled={isLoading || isProcessing || isActive}
                    style={{
                      marginTop: 'auto',
                      padding: '12px 16px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: isActive ? `${theme.accentSoftBlue}30` : theme.accentSoftBlue,
                      color: isActive ? theme.textPrimary : '#fff',
                      cursor: isActive ? 'default' : 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all .2s ease'
                    }}
                  >
                    {isActive
                      ? 'Selected'
                      : isLoading || isProcessing
                        ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'billing-spin 1s linear infinite' }} />
                            Processing…
                          </>
                        )
                        : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>

          {isSubscribed && (
            <div
              style={{
                marginTop: 24,
                padding: '18px 20px',
                borderRadius: 16,
                backgroundColor: `${theme.textSecondary}10`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ color: theme.textSecondary, fontSize: 14 }}>
                {renewalDate
                  ? `Renews automatically on ${renewalDate}.`
                  : 'Your subscription renews automatically.'}
              </div>
              <button
                onClick={onManageSubscription}
                disabled={isLoading || isProcessing}
                style={{
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: `1px solid ${theme.accentSoftBlue}`,
                  backgroundColor: 'transparent',
                  color: theme.accentSoftBlue,
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Manage subscription
                <ExternalLink size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingModal;
