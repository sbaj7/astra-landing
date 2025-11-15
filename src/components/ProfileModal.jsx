import React from 'react';
import { X, Mail, CalendarDays, ExternalLink, Clock } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile.js';

const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Unable to format date', error);
    return null;
  }
};

const toTitleCase = (value) =>
  value
    ? value
        .toString()
        .replace(/[_-]/g, ' ')
        .replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase())
    : '';

const InfoChip = ({ icon: Icon, label, value, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 12,
      backgroundColor: `${theme.textSecondary}10`,
      minWidth: 0
    }}
  >
    <Icon size={16} color={theme.accentSoftBlue} />
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: theme.textPrimary,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {value || '—'}
      </span>
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, theme }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        padding: '8px 12px',
        borderRadius: 12,
        border: `1px solid ${theme.textSecondary}25`,
        backgroundColor: theme.backgroundPrimary,
        color: theme.textPrimary,
        fontSize: 14
      }}
    />
  </label>
);

const ProfileModal = ({
  isOpen,
  onClose,
  theme,
  user,
  profile,
  subscription,
  onUpdateProfile,
  isSaving,
  error,
  successMessage
}) => {
  const isMobile = useIsMobile();

  const profileDetails = React.useMemo(
    () => (profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata.profile || {} : {}),
    [profile]
  );

  const baselineFullName = (profile?.full_name || user?.name || '').trim();
  const baselineOrg = (profileDetails?.organization || '').trim();
  const baselineRole = (profileDetails?.role || '').trim();
  const baselineSpecialty = (profileDetails?.specialty || '').trim();

  const [fullName, setFullName] = React.useState(baselineFullName);
  const [organization, setOrganization] = React.useState(baselineOrg);
  const [role, setRole] = React.useState(baselineRole);
  const [specialty, setSpecialty] = React.useState(baselineSpecialty);

  React.useEffect(() => {
    if (!isOpen) return;
    setFullName(baselineFullName);
    setOrganization(baselineOrg);
    setRole(baselineRole);
    setSpecialty(baselineSpecialty);
  }, [isOpen, baselineFullName, baselineOrg, baselineRole, baselineSpecialty]);

  const initials = React.useMemo(() => {
    const source = fullName || user?.name || user?.email || 'U';
    return source
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [fullName, user?.name, user?.email]);

  const joinedDate = formatDate(profile?.created_at || user?.updated_at);

  const subscriptionSnapshot = React.useMemo(() => {
    if (subscription && typeof subscription === 'object') {
      return subscription;
    }
    if (profile?.subscription && typeof profile.subscription === 'object') {
      return profile.subscription;
    }
    if (profile?.metadata && typeof profile.metadata === 'object') {
      const metadataSubscription = profile.metadata.subscription;
      if (metadataSubscription && typeof metadataSubscription === 'object') {
        return metadataSubscription;
      }
    }
    return null;
  }, [profile, subscription]);

  const planKey = subscriptionSnapshot?.plan_key || profile?.subscription_plan || null;
  const normalizedPlanKey = typeof planKey === 'string' ? planKey.toLowerCase() : null;
  const planLabel = normalizedPlanKey ? `${toTitleCase(normalizedPlanKey)} plan` : 'Free plan';
  const planStatus = subscriptionSnapshot?.status || profile?.subscription_status || null;
  const planStatusLabel = planStatus ? toTitleCase(planStatus) : null;
  const isPaidPlan = normalizedPlanKey ? normalizedPlanKey !== 'free' : false;

  const nextBillingTimestamp = (() => {
    if (typeof subscriptionSnapshot?.current_period_end === 'number') {
      return subscriptionSnapshot.current_period_end * 1000;
    }
    if (typeof profile?.subscription?.current_period_end === 'number') {
      return profile.subscription.current_period_end * 1000;
    }
    if (profile?.metadata && typeof profile.metadata === 'object') {
      const nested = profile.metadata.subscription;
      if (nested && typeof nested.current_period_end === 'number') {
        return nested.current_period_end * 1000;
      }
    }
    return null;
  })();

  const nextBilling = nextBillingTimestamp ? formatDate(nextBillingTimestamp) : null;

  const trimmedFullName = fullName.trim();
  const trimmedOrg = organization.trim();
  const trimmedRole = role.trim();
  const trimmedSpecialty = specialty.trim();

  const effectiveFullName = trimmedFullName || baselineFullName;

  const hasChanges =
    effectiveFullName !== baselineFullName ||
    trimmedOrg !== baselineOrg ||
    trimmedRole !== baselineRole ||
    trimmedSpecialty !== baselineSpecialty;

  const handleSubmit = (event) => {
    event.preventDefault();
    onUpdateProfile?.({
      full_name: effectiveFullName,
      profile: {
        organization: trimmedOrg,
        role: trimmedRole,
        specialty: trimmedSpecialty
      }
    });
  };

  if (!isOpen) {
    return null;
  }

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
      aria-label="Account profile"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '100%' : 520,
          backgroundColor: theme.backgroundSurface,
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? 24 : 32,
          boxShadow: '0 25px 50px -20px rgba(15,23,42,0.35)',
          border: `1px solid ${theme.textSecondary}20`
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close profile"
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
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 16 : 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: isMobile ? 60 : 68,
                  height: isMobile ? 60 : 68,
                  borderRadius: '50%',
                  backgroundColor: theme.accentSoftBlue,
                  backgroundImage: user?.picture ? `url(${user.picture})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 600
                }}
              >
                {!user?.picture ? initials : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 19 : 23, color: theme.textPrimary }}>{trimmedFullName || user?.name || 'User'}</h2>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>{user?.email || 'No email on file'}</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  backgroundColor: isPaidPlan ? `${theme.accentSoftBlue}18` : `${theme.textSecondary}15`,
                  color: isPaidPlan ? theme.accentSoftBlue : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em'
                }}
              >
                {planLabel}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gap: isMobile ? 12 : 16,
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))'
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <InputField
                  label="Display name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="How should Astra reference you?"
                  theme={theme}
                />
              </div>
              <div>
                <InputField
                  label="Organization"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="e.g. Mass General Hospital"
                  theme={theme}
                />
              </div>
              <div>
                <InputField
                  label="Clinical role"
                  value={role}
                  onChange={setRole}
                  placeholder="e.g. Hospitalist"
                  theme={theme}
                />
              </div>
              <div>
                <InputField
                  label="Primary specialty"
                  value={specialty}
                  onChange={setSpecialty}
                  placeholder="e.g. Cardiology"
                  theme={theme}
                />
              </div>
            </div>

            {(error || successMessage) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {error && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      backgroundColor: `${theme.errorColor}18`,
                      color: theme.errorColor,
                      fontSize: 13
                    }}
                  >
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      backgroundColor: `${theme.successColor}18`,
                      color: theme.successColor,
                      fontSize: 13
                    }}
                  >
                    {successMessage}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
              <button
                type="submit"
                disabled={!hasChanges || isSaving}
                style={{
                  padding: isMobile ? '10px 16px' : '10px 18px',
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: (!hasChanges || isSaving) ? `${theme.textSecondary}35` : theme.accentSoftBlue,
                  color: (!hasChanges || isSaving) ? theme.textSecondary : '#fff',
                  fontWeight: 600,
                  cursor: (!hasChanges || isSaving) ? 'not-allowed' : 'pointer',
                  transition: 'all .2s ease'
                }}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <InfoChip icon={Mail} label="Email" value={user?.email || 'No email'} theme={theme} />
            {joinedDate && (
              <InfoChip icon={CalendarDays} label="Member since" value={joinedDate} theme={theme} />
            )}
            <InfoChip icon={ExternalLink} label="Plan" value={planLabel} theme={theme} />
            {planStatusLabel && (
              <InfoChip icon={ExternalLink} label="Status" value={planStatusLabel} theme={theme} />
            )}
            {nextBilling && (
              <InfoChip icon={Clock} label="Next renewal" value={nextBilling} theme={theme} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
