import React from 'react';
import { X, Check, Loader2, ExternalLink } from 'lucide-react';

const plans = [
  {
    id: 'plus',
    name: 'Plus',
    price: '$20',
    cadence: 'per month',
    description: 'For individual clinicians who need enhanced clinical support.',
    features: [
      'Rate limited research chats',
      'A&P clinical note rewriting',
      'Chat history sync across devices',
      'Priority email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$50',
    cadence: 'per month',
    description: 'For advanced practitioners who need comprehensive clinical tools.',
    features: [
      'Everything in Plus, unlimited',
      'Priority reasoning mode access',
      'Advanced clinical evidence packs',
      'Premium diagnostic pathways',
      'Priority support & consultation'
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
  accountProfile,
  isLoading,
  onSelectPlan,
  onManageSubscription,
  billingStatus,
  error,
  isProcessing,
  isMobile = false
}) => {
  if (!isOpen) return null;

  // Check for manual subscription first (takes precedence)
  const hasManualSubscription = accountProfile?.manual_subscription_enabled;
  const manualPlan = accountProfile?.manual_subscription_plan;
  const manualExpiresAt = accountProfile?.manual_subscription_expires_at;
  const manualGrantedBy = accountProfile?.manual_subscription_granted_by;
  const manualNotes = accountProfile?.manual_subscription_notes;

  // Check if manual subscription is valid (not expired)
  const isManualSubscriptionValid = hasManualSubscription &&
    (!manualExpiresAt || new Date(manualExpiresAt) > new Date());

  // Use manual subscription if valid, otherwise use regular subscription
  const effectivePlan = isManualSubscriptionValid ? manualPlan : subscription?.plan_key;
  const activePlanId = effectivePlan || null;
  const isSubscribed = Boolean(subscription || isManualSubscriptionValid);
  const renewalDate = isManualSubscriptionValid
    ? (manualExpiresAt ? new Date(manualExpiresAt).toLocaleDateString() : 'Never expires')
    : (subscription ? formatTimestamp(subscription.current_period_end) : null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 16 : 24,
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
          maxWidth: isMobile ? '100%' : 900,
          maxHeight: '95vh',
          overflowY: 'auto',
          backgroundColor: theme.backgroundSurface,
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? '24px 20px 28px' : '32px 36px 40px',
          boxShadow: '0 30px 60px -15px rgba(15,23,42,0.35)',
          border: `1px solid ${theme.textSecondary}1f`
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? 12 : 20,
            right: isMobile ? 12 : 20,
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
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
            <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 600, color: theme.textPrimary }}>Billing & plans</h2>
            <p style={{ marginTop: 8, color: theme.textSecondary, lineHeight: 1.6, fontSize: isMobile ? 13 : 14 }}>
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
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: isMobile ? 16 : 20
            }}
          >
            {plans.map((plan) => {
              const isActive = activePlanId === plan.id;
              const isDowngradeOption = subscription?.plan_key === 'pro' && plan.id !== 'pro';
              const buttonBackground = isActive
                ? `${theme.accentSoftBlue}30`
                : isDowngradeOption
                  ? theme.errorColor
                  : theme.accentSoftBlue;
              const buttonColor = isActive ? theme.textPrimary : '#fff';
              const buttonLabel = isActive
                ? 'Selected'
                : isLoading || isProcessing
                  ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'billing-spin 1s linear infinite' }} />
                      Processing…
                    </>
                  )
                  : isDowngradeOption
                    ? 'Downgrade'
                    : 'Upgrade';

              return (
                <div
                  key={plan.id}
                  style={{
                    borderRadius: 20,
                    padding: isMobile ? '20px 18px 24px' : '24px 24px 28px',
                    backgroundColor: `${theme.backgroundPrimary}F2`,
                    border: `1px solid ${isActive ? theme.accentSoftBlue : theme.textSecondary}25`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? 16 : 18,
                    position: 'relative'
                  }}
                >
                  {isActive && (
                    <Badge
                      label={isManualSubscriptionValid ? "Manually granted" : "Current plan"}
                      theme={theme}
                    />
                  )}

                  <div>
                    <h3 style={{ fontSize: isMobile ? 18 : 20, margin: 0, color: theme.textPrimary }}>{plan.name}</h3>
                    <p style={{ margin: '6px 0 0', color: theme.textSecondary, fontSize: isMobile ? 13 : 14 }}>{plan.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: isMobile ? 26 : 30, fontWeight: 700, color: theme.textPrimary }}>{plan.price}</span>
                    <span style={{ fontSize: isMobile ? 13 : 14, color: theme.textSecondary }}>{plan.cadence}</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', gap: 10, alignItems: 'center', color: theme.textSecondary, fontSize: isMobile ? 13 : 14 }}>
                        <Check size={isMobile ? 14 : 16} color={theme.accentSoftBlue} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelectPlan?.(plan.id)}
                    disabled={isLoading || isProcessing || isActive}
                    style={{
                      marginTop: 'auto',
                      padding: isMobile ? '11px 14px' : '12px 16px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: buttonBackground,
                      color: buttonColor,
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
                    {buttonLabel}
                  </button>
                </div>
              );
            })}
          </div>

          {isSubscribed && (
            <div
              style={{
                marginTop: isMobile ? 20 : 24,
                padding: isMobile ? '16px 18px' : '18px 20px',
                borderRadius: 16,
                backgroundColor: `${theme.textSecondary}10`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ color: theme.textSecondary, fontSize: isMobile ? 13 : 14 }}>
                {isManualSubscriptionValid ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>
                      ✨ This subscription was manually granted
                      {manualGrantedBy && ` by ${manualGrantedBy}`}
                    </span>
                    {manualExpiresAt && (
                      <span>Expires on {new Date(manualExpiresAt).toLocaleDateString()}</span>
                    )}
                    {manualNotes && (
                      <span style={{ fontStyle: 'italic', fontSize: isMobile ? 12 : 13 }}>
                        Note: {manualNotes}
                      </span>
                    )}
                  </div>
                ) : (
                  renewalDate
                    ? `Renews automatically on ${renewalDate}.`
                    : 'Your subscription renews automatically.'
                )}
              </div>
              {!isManualSubscriptionValid && (
                <button
                  onClick={onManageSubscription}
                  disabled={isLoading || isProcessing}
                  style={{
                    padding: isMobile ? '9px 14px' : '10px 16px',
                    borderRadius: 999,
                    border: `1px solid ${theme.accentSoftBlue}`,
                    backgroundColor: 'transparent',
                    color: theme.accentSoftBlue,
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: isMobile ? 13 : 14
                  }}
                >
                  Manage subscription
                  <ExternalLink size={isMobile ? 14 : 16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingModal;
