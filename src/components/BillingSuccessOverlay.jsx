import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const PLAN_CONTENT = {
  plus: {
    title: 'Welcome to Astra Plus',
    headline: 'You just unlocked the full clinical toolkit for individual clinicians.',
    description: 'Enjoy unlimited research chats, streamlined note rewriting, and synced history across every device.',
    highlights: [
      'Unlimited research conversations',
      'Clinical documentation rewrite support',
      'Cross-device chat history sync',
      'Priority email access to our support team'
    ],
    accent: '#3b82f6'
  },
  pro: {
    title: 'Welcome to Astra Pro',
    headline: 'You now have the complete suite for advanced practitioners.',
    description: 'Gain access to premium diagnostic workflows, advanced evidence packs, and priority consults.',
    highlights: [
      'Everything included with Astra Plus',
      'Priority access to reasoning mode',
      'Advanced clinical evidence packs',
      'Premium diagnostic pathways & consultation support'
    ],
    accent: '#8b5cf6'
  }
};

const BillingSuccessOverlay = ({ planKey, onClose, theme, isMobile = false }) => {
  if (!planKey) return null;

  const plan = PLAN_CONTENT[planKey] ?? PLAN_CONTENT.plus;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1600,
        backgroundColor: 'rgba(7, 10, 20, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '24px'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Subscription unlocked"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '90vw' : 520,
          padding: isMobile ? '28px 24px' : '36px 40px',
          backgroundColor: theme?.backgroundSurface || '#0f172a',
          borderRadius: isMobile ? 20 : 24,
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.55)',
          border: `1px solid ${(theme?.textSecondary || '#94a3b8')}22`
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close welcome message"
          style={{
            position: 'absolute',
            top: isMobile ? 12 : 20,
            right: isMobile ? 12 : 20,
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: `${theme?.textSecondary || '#94a3b8'}18`,
            color: theme?.textPrimary || '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CheckCircle size={isMobile ? 36 : 44} color={plan.accent} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 600, color: theme?.textPrimary || '#f8fafc' }}>
              {plan.title}
            </h2>
            <p style={{ margin: 0, fontSize: isMobile ? 16 : 18, color: theme?.textPrimary || '#f1f5f9' }}>{plan.headline}</p>
            <p style={{ margin: 0, fontSize: isMobile ? 14 : 15, lineHeight: 1.6, color: theme?.textSecondary || '#cbd5f5' }}>
              {plan.description}
            </p>
          </div>

          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
            {plan.highlights.map((highlight) => (
              <li key={highlight} style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme?.textSecondary || '#cbd5f5', fontSize: isMobile ? 13 : 14 }}>
                <CheckCircle size={isMobile ? 14 : 16} color={plan.accent} />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={onClose}
            style={{
              marginTop: 12,
              alignSelf: 'flex-start',
              padding: isMobile ? '11px 18px' : '12px 18px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: plan.accent,
              color: '#fff',
              fontWeight: 600,
              fontSize: isMobile ? 13 : 14,
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingSuccessOverlay;
