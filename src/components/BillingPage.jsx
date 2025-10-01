import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseAuth } from './Auth/SupabaseAuthProvider.jsx';
import BillingModal from './BillingModal.jsx';
import authService from '../services/authService';
import { useTheme } from './Themes+Styles.jsx';

const getBillingStatusFromLocation = () => {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('billing');
};

const BillingPage = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const { colors: theme } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const billingStatus = useMemo(getBillingStatusFromLocation, []);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!isAuthenticated || !user) {
        setIsFetching(false);
        return;
      }

      try {
        setError('');
        const result = await authService.getSubscriptionStatus(user);
        setSubscription(result?.subscription || null);
      } catch (err) {
        console.error('Failed to load subscription status:', err);
        setError(err.message || 'Unable to load billing information');
      } finally {
        setIsFetching(false);
      }
    };

    if (!isLoading) {
      loadSubscription();
    }
  }, [isAuthenticated, isLoading, user]);

  const ensureAuthenticated = useCallback(() => {
    if (!isAuthenticated || !user) {
      setError('You need an account to manage billing.');
      return false;
    }
    return true;
  }, [isAuthenticated, user]);

  const handleSelectPlan = useCallback(async (planKey) => {
    if (!ensureAuthenticated()) return;

    try {
      setIsProcessing(true);
      const baseReturnUrl = typeof window !== 'undefined' ? `${window.location.origin}/billing` : '';
      const { url } = await authService.createCheckoutSession(planKey, user, baseReturnUrl);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Checkout URL was not provided.');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setError(err.message || 'Unable to start checkout');
      setIsProcessing(false);
    }
  }, [ensureAuthenticated, user]);

  const handleManageSubscription = useCallback(async () => {
    if (!ensureAuthenticated()) return;

    try {
      setIsProcessing(true);
      const baseReturnUrl = typeof window !== 'undefined' ? `${window.location.origin}/billing` : '';
      const { url } = await authService.createPortalSession(user, baseReturnUrl);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Portal URL was not provided.');
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err);
      setError(err.message || 'Unable to open billing portal');
      setIsProcessing(false);
    }
  }, [ensureAuthenticated, user]);

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: theme.backgroundPrimary }}>
      <BillingModal
        isOpen
        onClose={handleClose}
        theme={theme}
        subscription={subscription}
        isLoading={isFetching}
        onSelectPlan={handleSelectPlan}
        onManageSubscription={handleManageSubscription}
        billingStatus={billingStatus}
        error={error}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default BillingPage;
