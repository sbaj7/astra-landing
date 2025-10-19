import React from 'react';
import { X, Sun, Moon } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile.js';

const accentColorOptions = [
  { value: 'nightfall', label: 'Nightfall', swatch: '#4A6B7D' },
  { value: 'glacier', label: 'Glacier', swatch: '#2563EB' },
  { value: 'meadow', label: 'Meadow', swatch: '#059669' },
  { value: 'ember', label: 'Ember', swatch: '#EA580C' },
  { value: 'rose', label: 'Rose', swatch: '#DB2777' }
];

const languageOptions = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' }
];

const spokenLanguageOptions = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' }
];

const SettingRow = ({ label, helperText, children, theme, compact }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 4 : 6,
      padding: compact ? '10px 0' : '14px 0',
      borderBottom: `1px solid ${theme.textSecondary}18`
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>{label}</span>
      {children}
    </div>
    {helperText && (
      <span style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.4 }}>{helperText}</span>
    )}
  </div>
);

const SelectControl = ({ value, options, onChange, theme }) => (
  <div style={{ position: 'relative', minWidth: 150 }}>
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        width: '100%',
        padding: '6px 32px 6px 12px',
        borderRadius: 12,
        border: `1px solid ${theme.textSecondary}30`,
        backgroundColor: theme.backgroundPrimary,
        color: theme.textPrimary,
        fontSize: 13,
        cursor: 'pointer',
        appearance: 'none'
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    <span style={{
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: theme.textSecondary
    }}>▾</span>
  </div>
);

const ThemeToggle = ({ value, onChange, theme }) => {
  const mode = value === 'light' || value === 'dark' ? value : 'system';
  const isDark = mode === 'dark';
  const isSystem = mode === 'system';

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    onChange?.(next);
  };

  const handleSystem = () => onChange?.('system');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={handleToggle}
        aria-label={`Toggle theme (${mode})`}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `1px solid ${theme.textSecondary}25`,
          background: `${theme.accentSoftBlue}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: theme.backgroundPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.45s ease',
            transform: isDark ? 'rotate(200deg)' : 'rotate(0deg)'
          }}
        >
          <Sun
            size={17}
            color={theme.textSecondary}
            style={{
              position: 'absolute',
              opacity: isDark ? 0 : 1,
              transition: 'opacity 0.25s ease'
            }}
          />
          <Moon
            size={15}
            color={theme.textSecondary}
            style={{
              position: 'absolute',
              opacity: isDark ? 1 : 0,
              transition: 'opacity 0.25s ease'
            }}
          />
        </div>
      </button>
      <button
        onClick={handleSystem}
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          border: `1px solid ${isSystem ? theme.accentSoftBlue : theme.textSecondary}30`,
          backgroundColor: isSystem ? `${theme.accentSoftBlue}18` : 'transparent',
          color: isSystem ? theme.accentSoftBlue : theme.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Auto
      </button>
    </div>
  );
};

const SettingsModal = ({
  isOpen,
  onClose,
  theme,
  settings,
  onSettingChange,
  syncState = 'idle',
  syncError = ''
}) => {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleChange = (key) => (value) => {
    onSettingChange?.(key, value);
  };

  const accentSelection = accentColorOptions.find((option) => option.value === settings?.accentColor) || accentColorOptions[0];

  const statusMessage =
    syncState === 'saving'
      ? 'Saving…'
      : syncState === 'saved'
        ? 'Saved'
        : syncState === 'error'
          ? syncError || 'Unable to save settings'
          : '';

  const statusColor =
    syncState === 'error'
      ? theme.errorColor
      : syncState === 'saved'
        ? theme.successColor
        : theme.textSecondary;

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
          maxWidth: isMobile ? '100%' : 540,
          maxHeight: '95vh',
          overflowY: 'auto',
          backgroundColor: theme.backgroundSurface,
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? '20px 18px' : '28px 28px',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 22, color: theme.textPrimary }}>General</h2>
            {statusMessage && (
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>
                {statusMessage}
              </span>
            )}
          </div>

          <SettingRow label="Theme" theme={theme} compact>
            <ThemeToggle
              value={settings?.theme || 'system'}
              onChange={handleChange('theme')}
              theme={theme}
            />
          </SettingRow>

          <SettingRow label="Accent color" theme={theme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: accentSelection.swatch,
                  border: '1px solid rgba(148, 163, 184, 0.4)'
                }}
              />
              <SelectControl
                value={accentSelection.value}
                options={accentColorOptions.map((option) => ({ value: option.value, label: option.label }))}
                onChange={(value) => handleChange('accentColor')(value)}
                theme={theme}
              />
            </div>
          </SettingRow>

          <SettingRow label="Language" theme={theme}>
            <SelectControl
              value={settings?.language || 'auto'}
              options={languageOptions}
              onChange={handleChange('language')}
              theme={theme}
            />
          </SettingRow>

          <SettingRow
            label="Spoken language"
            helperText="For best results, pick the language you mainly speak. If it isn't listed, auto-detect typically works well."
            theme={theme}
          >
            <SelectControl
              value={settings?.spokenLanguage || 'auto'}
              options={spokenLanguageOptions}
              onChange={handleChange('spokenLanguage')}
              theme={theme}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
