import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchPricing } from '../services/pricingService.js';

const planPresentation = [
  {
    id: 'plus',
    name: 'Plus',
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

const formatPrice = ({ amount, currency }) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: currency.toUpperCase(),
  maximumFractionDigits: amount % 100 === 0 ? 0 : 2
}).format(amount / 100);

const formatCadence = ({ interval, interval_count: intervalCount }) => (
  intervalCount === 1 ? `per ${interval}` : `every ${intervalCount} ${interval}s`
);

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
  const [pricing, setPricing] = useState(null);
  const [pricingError, setPricingError] = useState(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingRequest, setPricingRequest] = useState(0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    setIsPricingLoading(true);
    setPricingError(null);

    fetchPricing({ signal: controller.signal })
      .then(setPricing)
      .catch((pricingLoadError) => {
        if (pricingLoadError.name !== 'AbortError') {
          console.error('Failed to load Stripe pricing', pricingLoadError);
          setPricing(null);
          setPricingError('Live pricing could not be loaded. Checkout is disabled until it is available.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPricingLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, pricingRequest]);

  const plans = useMemo(() => planPresentation.map((plan) => {
    const livePrice = pricing?.[plan.id];
    return {
      ...plan,
      price: livePrice ? formatPrice(livePrice) : '—',
      cadence: livePrice ? formatCadence(livePrice) : ''
    };
  }), [pricing]);

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
  const trialEndDate = subscription?.status === 'trialing'
    ? formatTimestamp(subscription.trial_end)
    : null;
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
              New subscribers get 14 days free, then standard monthly billing begins. Cancel anytime during the trial.
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

          {pricingError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: `${theme.errorColor}18`,
                color: theme.errorColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <span>{pricingError}</span>
              <button
                type="button"
                onClick={() => setPricingRequest((request) => request + 1)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600
                }}
              >
                <RefreshCw size={15} />
                Retry
              </button>
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
                : isLoading || isProcessing || isPricingLoading
                  ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'billing-spin 1s linear infinite' }} />
                      Processing…
                    </>
                  )
                  : isDowngradeOption
                    ? 'Downgrade'
                    : isSubscribed
                      ? 'Upgrade'
                      : 'Start 14-day free trial';

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

                  {!isSubscribed && (
                    <Badge label="14 days free" theme={theme} />
                  )}

                  <div>
                    <h3 style={{ fontSize: isMobile ? 18 : 20, margin: 0, color: theme.textPrimary }}>{plan.name}</h3>
                    <p style={{ margin: '6px 0 0', color: theme.textSecondary, fontSize: isMobile ? 13 : 14 }}>{plan.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: isMobile ? 26 : 30, fontWeight: 700, color: theme.textPrimary }}>{plan.price}</span>
                    <span style={{ fontSize: isMobile ? 13 : 14, color: theme.textSecondary }}>{plan.cadence}</span>
                  </div>

                  {!isSubscribed && (
                    <p style={{ margin: '-8px 0 0', color: theme.textSecondary, fontSize: isMobile ? 12 : 13 }}>
                      No charge today. Billing starts after the trial.
                    </p>
                  )}

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
                    disabled={isLoading || isProcessing || isPricingLoading || Boolean(pricingError) || !pricing || isActive}
                    style={{
                      marginTop: 'auto',
                      padding: isMobile ? '11px 14px' : '12px 16px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: buttonBackground,
                      color: buttonColor,
                      cursor: isActive || pricingError || !pricing ? 'default' : 'pointer',
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
                  trialEndDate
                    ? `Your free trial ends on ${trialEndDate}. Monthly billing begins afterward.`
                    : renewalDate
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
