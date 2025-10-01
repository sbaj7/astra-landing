import React from 'react';
import { X, Mail, CalendarDays, ExternalLink, Briefcase, Building2, Stethoscope } from 'lucide-react';

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

const ProfileRow = ({ icon: Icon, label, value, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 12,
      backgroundColor: `${theme.textSecondary}10`
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${theme.textSecondary}15`
      }}
    >
      <Icon size={18} color={theme.accentSoftBlue} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: theme.textPrimary }}>{value || '—'}</span>
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
        padding: '10px 12px',
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
  onManageSubscription,
  onUpdateProfile,
  isSaving,
  error,
  successMessage
}) => {
  if (!isOpen) return null;

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
  const nextBilling = subscription?.current_period_end ? formatDate(subscription.current_period_end * 1000) : null;

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
          maxWidth: 520,
          backgroundColor: theme.backgroundSurface,
          borderRadius: 24,
          padding: 32,
          boxShadow: '0 25px 50px -20px rgba(15,23,42,0.35)',
          border: `1px solid ${theme.textSecondary}20`
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close profile"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 32,
            height: 32,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: theme.accentSoftBlue,
                backgroundImage: user?.picture ? `url(${user.picture})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 28,
                fontWeight: 600
              }}
            >
              {!user?.picture ? initials : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: theme.textPrimary }}>{trimmedFullName || user?.name || 'User'}</h2>
              <span style={{ fontSize: 14, color: theme.textSecondary }}>{user?.email || 'No email on file'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InputField
              label="Display name"
              value={fullName}
              onChange={setFullName}
              placeholder="How should Astra reference you?"
              theme={theme}
            />
            <InputField
              label="Organization"
              value={organization}
              onChange={setOrganization}
              placeholder="e.g. Mass General Hospital"
              theme={theme}
            />
            <InputField
              label="Clinical role"
              value={role}
              onChange={setRole}
              placeholder="e.g. Hospitalist"
              theme={theme}
            />
            <InputField
              label="Primary specialty"
              value={specialty}
              onChange={setSpecialty}
              placeholder="e.g. Cardiology"
              theme={theme}
            />

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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={!hasChanges || isSaving}
                style={{
                  padding: '10px 18px',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProfileRow
              icon={Mail}
              label="Email"
              value={user?.email}
              theme={theme}
            />
            <ProfileRow
              icon={CalendarDays}
              label="Member since"
              value={joinedDate}
              theme={theme}
            />
            <ProfileRow
              icon={Building2}
              label="Organization"
              value={trimmedOrg || '—'}
              theme={theme}
            />
            <ProfileRow
              icon={Briefcase}
              label="Clinical role"
              value={trimmedRole || '—'}
              theme={theme}
            />
            <ProfileRow
              icon={Stethoscope}
              label="Primary specialty"
              value={trimmedSpecialty || '—'}
              theme={theme}
            />
            {subscription?.status && (
              <ProfileRow
                icon={ExternalLink}
                label="Subscription"
                value={`${subscription.plan_key ? subscription.plan_key.charAt(0).toUpperCase() + subscription.plan_key.slice(1) : 'Active'} • ${subscription.status}`}
                theme={theme}
              />
            )}
          </div>

          {subscription && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 16,
                backgroundColor: `${theme.accentSoftBlue}15`,
                color: theme.textPrimary,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {subscription.plan_key ? `${subscription.plan_key.replace(/(^|\s)(\w)/g, (match, p1, p2) => `${p1}${p2.toUpperCase()}`)} plan` : 'Active subscription'}
              </span>
              <span style={{ fontSize: 13, color: theme.textSecondary }}>
                {subscription.status === 'trialing'
                  ? 'Currently in trial period'
                  : `Renews ${nextBilling || 'automatically'}.`}
              </span>
            </div>
          )}

          {onManageSubscription && (
            <button
              type="button"
              onClick={onManageSubscription}
              disabled={isSaving}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 16px',
                borderRadius: 999,
                border: `1px solid ${theme.accentSoftBlue}`,
                background: 'transparent',
                color: theme.accentSoftBlue,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              Manage subscription
              <ExternalLink size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
