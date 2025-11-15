import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Gift, X, Calendar, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import authService from '../services/authService.js';

const AdminSubscriptionPanel = ({ theme, isMobile = false, onClose }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);

  // Grant subscription form state
  const [grantFormOpen, setGrantFormOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('plus');
  const [grantExpires, setGrantExpires] = useState('');
  const [grantNotes, setGrantNotes] = useState('');
  const [grantSyncToStripe, setGrantSyncToStripe] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  // Load users on mount and page change
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.listAllSubscriptions(currentPage, 20);
      setUsers(result.data);
      setTotalPages(result.pagination.total_pages);
      setStats(result.stats);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load subscriptions. Please check your admin credentials.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle grant subscription
  const handleGrantSubscription = async (e) => {
    e.preventDefault();
    setIsGranting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await authService.grantManualSubscription(grantEmail, grantPlan, {
        expiresAt: grantExpires || null,
        notes: grantNotes || null,
        grantedBy: 'Admin Panel',
        syncToStripe: grantSyncToStripe
      });

      setSuccess(`Successfully granted ${grantPlan} subscription to ${grantEmail}`);
      setGrantFormOpen(false);
      setGrantEmail('');
      setGrantNotes('');
      setGrantExpires('');

      // Reload users to show updated subscription
      await loadUsers();
    } catch (err) {
      console.error('Failed to grant subscription:', err);
      setError(err.message || 'Failed to grant subscription');
    } finally {
      setIsGranting(false);
    }
  };

  // Handle revoke subscription
  const handleRevokeSubscription = async (userEmail) => {
    if (!confirm(`Are you sure you want to revoke the manual subscription for ${userEmail}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await authService.revokeManualSubscription(userEmail, 'Admin Panel');
      setSuccess(`Successfully revoked manual subscription for ${userEmail}`);
      await loadUsers();
    } catch (err) {
      console.error('Failed to revoke subscription:', err);
      setError(err.message || 'Failed to revoke subscription');
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 16 : 24,
        backgroundColor: 'rgba(0,0,0,0.6)'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1200,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: theme.backgroundSurface,
          borderRadius: 20,
          padding: isMobile ? '20px 16px' : '28px 32px',
          boxShadow: '0 30px 60px -15px rgba(15,23,42,0.35)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Users size={24} color={theme.accentSoftBlue} />
            <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24, color: theme.textPrimary }}>
              Subscription Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24
            }}
          >
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: `${theme.textSecondary}10` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary }}>{stats.total_users}</div>
              <div style={{ fontSize: 13, color: theme.textSecondary }}>Total Users</div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: `${theme.successColor}15` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.successColor }}>
                {stats.stripe_subscriptions}
              </div>
              <div style={{ fontSize: 13, color: theme.textSecondary }}>Stripe Subscriptions</div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: `${theme.accentSoftBlue}15` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.accentSoftBlue }}>
                {stats.manual_subscriptions}
              </div>
              <div style={{ fontSize: 13, color: theme.textSecondary }}>Manual Grants</div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: `${theme.textSecondary}10` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary }}>{stats.free_users}</div>
              <div style={{ fontSize: 13, color: theme.textSecondary }}>Free Users</div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: `${theme.errorColor}18`,
              color: theme.errorColor,
              marginBottom: 16,
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: `${theme.successColor}18`,
              color: theme.successColor,
              marginBottom: 16,
              fontSize: 14
            }}
          >
            {success}
          </div>
        )}

        {/* Actions Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            marginBottom: 20
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.textSecondary
              }}
            />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: 8,
                border: `1px solid ${theme.textSecondary}25`,
                backgroundColor: theme.backgroundPrimary,
                color: theme.textPrimary,
                fontSize: 14
              }}
            />
          </div>

          {/* Grant Subscription Button */}
          <button
            onClick={() => setGrantFormOpen(!grantFormOpen)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: theme.accentSoftBlue,
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14
            }}
          >
            <Gift size={16} />
            Grant Subscription
          </button>
        </div>

        {/* Grant Subscription Form */}
        {grantFormOpen && (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: `${theme.accentSoftBlue}10`,
              marginBottom: 20,
              border: `1px solid ${theme.accentSoftBlue}30`
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: theme.textPrimary }}>
              Grant Manual Subscription
            </h3>
            <form onSubmit={handleGrantSubscription}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                <input
                  type="email"
                  placeholder="User email address"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  required
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.textSecondary}25`,
                    backgroundColor: theme.backgroundPrimary,
                    color: theme.textPrimary,
                    fontSize: 14
                  }}
                />
                <select
                  value={grantPlan}
                  onChange={(e) => setGrantPlan(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.textSecondary}25`,
                    backgroundColor: theme.backgroundPrimary,
                    color: theme.textPrimary,
                    fontSize: 14
                  }}
                >
                  <option value="plus">Plus ($30/month)</option>
                  <option value="pro">Pro ($70/month)</option>
                </select>
                <input
                  type="date"
                  placeholder="Expiration date (optional)"
                  value={grantExpires}
                  onChange={(e) => setGrantExpires(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.textSecondary}25`,
                    backgroundColor: theme.backgroundPrimary,
                    color: theme.textPrimary,
                    fontSize: 14
                  }}
                />
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.textSecondary}25`,
                    backgroundColor: theme.backgroundPrimary,
                    color: theme.textPrimary,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: theme.textSecondary }}>
                  <input
                    type="checkbox"
                    checked={grantSyncToStripe}
                    onChange={(e) => setGrantSyncToStripe(e.target.checked)}
                  />
                  Sync to Stripe (creates 100% discounted subscription)
                </label>
                <button
                  type="submit"
                  disabled={isGranting}
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: theme.successColor,
                    color: 'white',
                    cursor: isGranting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: isGranting ? 0.6 : 1
                  }}
                >
                  {isGranting ? 'Granting...' : 'Grant Subscription'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.textSecondary}20` }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: theme.textSecondary }}>User</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: theme.textSecondary }}>Plan</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: theme.textSecondary }}>Type</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: theme.textSecondary }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: theme.textSecondary }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${theme.textSecondary}10` }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontSize: 14, color: theme.textPrimary }}>{user.email}</div>
                      {user.full_name && (
                        <div style={{ fontSize: 12, color: theme.textSecondary }}>{user.full_name}</div>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor:
                            user.plan === 'pro'
                              ? `${theme.accentSoftBlue}20`
                              : user.plan === 'plus'
                              ? `${theme.successColor}20`
                              : `${theme.textSecondary}10`,
                          color:
                            user.plan === 'pro'
                              ? theme.accentSoftBlue
                              : user.plan === 'plus'
                              ? theme.successColor
                              : theme.textSecondary
                        }}
                      >
                        {user.plan === 'pro' ? 'PRO' : user.plan === 'plus' ? 'PLUS' : 'FREE'}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: theme.textSecondary }}>
                      {user.subscription_type === 'manual' ? '✨ Manual' : user.subscription_type === 'stripe' ? '💳 Stripe' : '—'}
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontSize: 13 }}>
                        {user.manual_grant && (
                          <>
                            <div style={{ color: theme.textPrimary }}>
                              Granted by {user.manual_grant.granted_by}
                            </div>
                            {user.manual_grant.expires_at && (
                              <div style={{ color: theme.textSecondary, fontSize: 12 }}>
                                Expires: {new Date(user.manual_grant.expires_at).toLocaleDateString()}
                              </div>
                            )}
                            {user.manual_grant.notes && (
                              <div style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                                {user.manual_grant.notes}
                              </div>
                            )}
                          </>
                        )}
                        {user.stripe && (
                          <div style={{ color: theme.textSecondary, fontSize: 12 }}>
                            Renews: {new Date(user.stripe.current_period_end * 1000).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>
                      {user.subscription_type === 'manual' && (
                        <button
                          onClick={() => handleRevokeSubscription(user.email)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: `1px solid ${theme.errorColor}`,
                            backgroundColor: 'transparent',
                            color: theme.errorColor,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginTop: 24
            }}
          >
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: 8,
                borderRadius: 8,
                border: `1px solid ${theme.textSecondary}25`,
                backgroundColor: 'transparent',
                color: theme.textPrimary,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: 14, color: theme.textSecondary }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: 8,
                borderRadius: 8,
                border: `1px solid ${theme.textSecondary}25`,
                backgroundColor: 'transparent',
                color: theme.textPrimary,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminSubscriptionPanel;