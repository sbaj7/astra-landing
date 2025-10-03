import React from 'react';
import { X, Monitor, Moon, Globe, ShieldCheck } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile.js';

const ToggleRow = ({ label, description, value, onChange, theme, disabled, isMobile }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 12 : 0,
      padding: '14px 0',
      borderBottom: `1px solid ${theme.textSecondary}15`
    }}
  >
    <div style={{ maxWidth: isMobile ? '100%' : '70%' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{description}</div>
    </div>
    <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 24, alignSelf: isMobile ? 'flex-end' : 'center' }}>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange?.(event.target.checked)}
        disabled={disabled}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: 'absolute',
          cursor: disabled ? 'not-allowed' : 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: value ? theme.accentSoftBlue : `${theme.textSecondary}30`,
          transition: '.2s',
          borderRadius: 999
        }}
      />
      <span
        style={{
          position: 'absolute',
          content: "''",
          height: 20,
          width: 20,
          left: value ? 26 : 4,
          bottom: 2,
          backgroundColor: '#fff',
          transition: '.2s',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(15,23,42,0.2)'
        }}
      />
    </label>
  </div>
);

const SettingsSection = ({ icon: Icon, title, children, theme }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: `${theme.accentSoftBlue}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon size={16} color={theme.accentSoftBlue} />
      </div>
      <h3 style={{ margin: 0, fontSize: 16, color: theme.textPrimary }}>{title}</h3>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
  </section>
);

const SettingsModal = ({
  isOpen,
  onClose,
  theme,
  settings,
  onSettingChange
}) => {
  if (!isOpen) return null;

  const isMobile = useIsMobile();

  const handleChange = (key) => (value) => {
    onSettingChange?.(key, value);
  };

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
        backgroundColor: 'rgba(0,0,0,0.45)'
      }}
      aria-modal="true"
      role="dialog"
      aria-label="App settings"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '100%' : 640,
          maxHeight: '95vh',
          overflowY: 'auto',
          backgroundColor: theme.backgroundSurface,
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? '24px 24px' : '32px 36px',
          boxShadow: '0 25px 60px -20px rgba(15,23,42,0.35)',
          border: `1px solid ${theme.textSecondary}20`
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close settings"
          style={{
            position: 'absolute',
            top: isMobile ? 12 : 20,
            right: isMobile ? 12 : 20,
            width: isMobile ? 30 : 32,
            height: isMobile ? 30 : 32,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: `${theme.textSecondary}10`,
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 24, color: theme.textPrimary }}>Settings</h2>
            <p style={{ marginTop: 8, color: theme.textSecondary, lineHeight: 1.6, fontSize: isMobile ? 13 : 14 }}>
              Personalise Astra to match your practice and workflow. More controls are coming soon.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <SettingsSection icon={Monitor} title="Appearance" theme={theme}>
              <ToggleRow
                label="Sync with system"
                description="Automatically match your device’s light or dark appearance."
                value={settings?.syncSystem ?? true}
                onChange={handleChange('syncSystem')}
                theme={theme}
                disabled
                isMobile={isMobile}
              />
              <ToggleRow
                label="Use dark mode"
                description="Force Astra to stay in dark mode at all times."
                value={settings?.forceDark ?? false}
                onChange={handleChange('forceDark')}
                theme={theme}
                disabled
                isMobile={isMobile}
              />
            </SettingsSection>

            <SettingsSection icon={Globe} title="Language" theme={theme}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: isMobile ? 13 : 14, color: theme.textSecondary }}>Primary language</span>
                <select
                  value={settings?.language || 'en-US'}
                  onChange={(event) => handleChange('language')(event.target.value)}
                  disabled
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${theme.textSecondary}25`,
                    backgroundColor: theme.backgroundPrimary,
                    color: theme.textPrimary,
                    fontSize: isMobile ? 13 : 14
                  }}
                >
                  <option value="en-US">English (US)</option>
                </select>
                <span style={{ fontSize: 12, color: theme.textSecondary }}>More languages coming soon.</span>
              </div>
            </SettingsSection>

            <SettingsSection icon={ShieldCheck} title="Security" theme={theme}>
              <ToggleRow
                label="Require login at launch"
                description="When enabled, Astra will prompt for sign-in each time you open the app."
                value={settings?.requireLogin ?? true}
                onChange={handleChange('requireLogin')}
                theme={theme}
                disabled
                isMobile={isMobile}
              />
              <ToggleRow
                label="Enable PHI mode"
                description="Restrict outputs to HIPAA-compliant responses. Available on enterprise plans."
                value={settings?.phiMode ?? false}
                onChange={handleChange('phiMode')}
                theme={theme}
                disabled
                isMobile={isMobile}
              />
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
