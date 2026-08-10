import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, CircleDollarSign, Copy, LoaderCircle, Pause, Play, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../components/Auth/SupabaseAuthProvider.jsx';
import { useTheme } from '../components/Themes+Styles.jsx';
import referralService from '../services/referralService.js';
import './ReferralAdminPage.css';

const emptyPartner = {
  name: '',
  email: '',
  code: '',
  commissionType: 'fixed',
  commissionValue: 10,
  discountType: 'percentage',
  discountValue: 10,
  holdDays: 30,
  payoutMethod: 'ACH',
  payoutContact: '',
  notes: ''
};

const emptyPayout = {
  partnerId: '',
  amount: '',
  method: 'ACH',
  reference: '',
  notes: '',
  paidAt: new Date().toISOString().slice(0, 10)
};

const formatMoney = (amountCents = 0, currency = 'usd') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: currency.toUpperCase()
}).format(amountCents / 100);

const ReferralAdminPage = () => {
  const navigate = useNavigate();
  const { colors: theme } = useTheme();
  const { user, isAuthenticated, isLoading: isAuthLoading, signIn } = useSupabaseAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [partnerForm, setPartnerForm] = useState(emptyPartner);
  const [payoutForm, setPayoutForm] = useState(emptyPayout);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  const cssVariables = useMemo(() => ({
    '--admin-bg': theme.backgroundPrimary,
    '--admin-surface': theme.backgroundSurface,
    '--admin-text': theme.textPrimary,
    '--admin-muted': theme.textSecondary,
    '--admin-accent': theme.accentSoftBlue,
    '--admin-success': theme.successColor,
    '--admin-error': theme.errorColor,
    '--admin-border': `${theme.textSecondary}25`
  }), [theme]);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError('');
    try {
      setDashboard(await referralService.getDashboard());
    } catch (requestError) {
      setDashboard(null);
      setError(requestError.status === 403
        ? 'This account does not have referral management access.'
        : requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading) loadDashboard();
  }, [isAuthLoading, loadDashboard]);

  const updatePartner = (key, value) => setPartnerForm((current) => ({ ...current, [key]: value }));
  const updatePayout = (key, value) => setPayoutForm((current) => ({ ...current, [key]: value }));

  const createPartner = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await referralService.createPartner({
        ...partnerForm,
        commissionValue: Number(partnerForm.commissionValue),
        discountValue: Number(partnerForm.discountValue),
        holdDays: Number(partnerForm.holdDays)
      });
      setSuccess(`${partnerForm.code.toUpperCase()} is active in Stripe and ready to use.`);
      setPartnerForm(emptyPartner);
      setShowPartnerForm(false);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCode = async (code) => {
    const activate = code.status !== 'active';
    if (!window.confirm(`${activate ? 'Activate' : 'Pause'} code ${code.code}?`)) return;
    setIsSaving(true);
    setError('');
    try {
      await referralService.setCodeStatus(code.id, activate);
      setSuccess(`${code.code} ${activate ? 'activated' : 'paused'}.`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openPayout = (partner) => {
    setPayoutForm({
      ...emptyPayout,
      partnerId: partner.id,
      amount: (Math.max(0, partner.balances.payable) / 100).toFixed(2),
      method: partner.payout_method || 'ACH'
    });
    setShowPayoutForm(true);
  };

  const recordPayout = async (event) => {
    event.preventDefault();
    const partner = dashboard.partners.find((item) => item.id === payoutForm.partnerId);
    const amountCents = Math.round(Number(payoutForm.amount) * 100);
    if (!partner || !Number.isInteger(amountCents) || amountCents <= 0) {
      setError('Enter a valid payout amount.');
      return;
    }
    if (!window.confirm(`Confirm that ${formatMoney(amountCents)} was already sent to ${partner.name}?`)) return;

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await referralService.recordPayout({
        partnerId: payoutForm.partnerId,
        amountCents,
        currency: partner.currency,
        method: payoutForm.method,
        reference: payoutForm.reference,
        notes: payoutForm.notes,
        paidAt: new Date(`${payoutForm.paidAt}T12:00:00`).toISOString()
      });
      setSuccess(`Payout to ${partner.name} recorded with a permanent audit entry.`);
      setShowPayoutForm(false);
      setPayoutForm(emptyPayout);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return <main className="referral-admin centered" style={cssVariables}><LoaderCircle className="spin" /></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="referral-admin centered" style={cssVariables}>
        <ShieldCheck size={42} />
        <h1>Referral Management</h1>
        <p>Sign in with an authorized Astra management account.</p>
        <button className="primary" onClick={() => signIn({ redirectTo: `${window.location.origin}/admin/referrals` })}>Sign in</button>
      </main>
    );
  }

  return (
    <main className="referral-admin" style={cssVariables}>
      <header className="admin-header">
        <div>
          <button className="icon-button" onClick={() => navigate('/')} aria-label="Back to Astra"><ArrowLeft /></button>
          <div>
            <span className="eyebrow">Astra Operations</span>
            <h1>Referral Management</h1>
            <p>Signed in as {user?.email}</p>
          </div>
        </div>
        <button className="secondary" onClick={loadDashboard} disabled={isLoading}><RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh</button>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {isLoading && !dashboard ? (
        <div className="centered panel"><LoaderCircle className="spin" /></div>
      ) : dashboard ? (
        <>
          <section className="stats-grid">
            <article><Users /><strong>{dashboard.stats.activePartners}</strong><span>Active influencers</span></article>
            <article><BadgeDollarSign /><strong>{dashboard.stats.recordedReferrals}</strong><span>Recorded referrals</span></article>
            <article><CircleDollarSign /><strong>{formatMoney(dashboard.stats.pendingCents)}</strong><span>Pending commissions</span></article>
            <article><CircleDollarSign /><strong>{formatMoney(dashboard.stats.payableCents)}</strong><span>Ready to pay</span></article>
          </section>

          <section className="actions-row">
            <button className="primary" onClick={() => setShowPartnerForm((value) => !value)}><Plus size={17} /> Add Influencer</button>
          </section>

          {showPartnerForm && (
            <form className="panel form-grid" onSubmit={createPartner}>
              <div className="section-title"><h2>Create influencer code</h2><p>The customer enters this code in Stripe Checkout. Discounts and commissions recur on every monthly payment for the life of the subscription.</p></div>
              <label>Name<input required value={partnerForm.name} onChange={(event) => updatePartner('name', event.target.value)} /></label>
              <label>Email<input required type="email" value={partnerForm.email} onChange={(event) => updatePartner('email', event.target.value)} /></label>
              <label>Custom code<input required minLength={3} maxLength={40} value={partnerForm.code} onChange={(event) => updatePartner('code', event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="DRSMITH" /></label>
              <label>Hold period<input required type="number" min="0" max="180" value={partnerForm.holdDays} onChange={(event) => updatePartner('holdDays', event.target.value)} /></label>
              <label>Monthly commission type<select value={partnerForm.commissionType} onChange={(event) => updatePartner('commissionType', event.target.value)}><option value="fixed">Fixed dollars per invoice</option><option value="percentage">Percentage of each payment</option></select></label>
              <label>Monthly commission {partnerForm.commissionType === 'fixed' ? '($)' : '(%)'}<input required type="number" min="0.01" max={partnerForm.commissionType === 'percentage' ? 100 : undefined} step="0.01" value={partnerForm.commissionValue} onChange={(event) => updatePartner('commissionValue', event.target.value)} /></label>
              <label>Lifetime customer discount<select value={partnerForm.discountType} onChange={(event) => updatePartner('discountType', event.target.value)}><option value="percentage">Percentage each month</option><option value="fixed">Fixed dollars each month</option></select></label>
              <label>Monthly discount {partnerForm.discountType === 'fixed' ? '($)' : '(%)'}<input required type="number" min="0.01" max={partnerForm.discountType === 'percentage' ? 100 : undefined} step="0.01" value={partnerForm.discountValue} onChange={(event) => updatePartner('discountValue', event.target.value)} /></label>
              <label>Payout method<input required value={partnerForm.payoutMethod} onChange={(event) => updatePartner('payoutMethod', event.target.value)} placeholder="ACH, PayPal, Wise" /></label>
              <label>Payout contact<input value={partnerForm.payoutContact} onChange={(event) => updatePartner('payoutContact', event.target.value)} placeholder="Defaults to influencer email" /></label>
              <label className="wide">Notes<textarea value={partnerForm.notes} onChange={(event) => updatePartner('notes', event.target.value)} /></label>
              <div className="form-actions wide"><button type="button" className="secondary" onClick={() => setShowPartnerForm(false)}>Cancel</button><button className="primary" disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Create code</button></div>
            </form>
          )}

          {showPayoutForm && (
            <form className="panel form-grid" onSubmit={recordPayout}>
              <div className="section-title"><h2>Record completed payout</h2><p>Only submit this after money has actually been sent.</p></div>
              <label>Influencer<select required value={payoutForm.partnerId} onChange={(event) => updatePayout('partnerId', event.target.value)}>{dashboard.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} — {formatMoney(partner.balances.payable)}</option>)}</select></label>
              <label>Amount ($)<input required type="number" min="0.01" step="0.01" value={payoutForm.amount} onChange={(event) => updatePayout('amount', event.target.value)} /></label>
              <label>Method<input required value={payoutForm.method} onChange={(event) => updatePayout('method', event.target.value)} /></label>
              <label>Transaction reference<input required value={payoutForm.reference} onChange={(event) => updatePayout('reference', event.target.value)} placeholder="Bank confirmation or payment ID" /></label>
              <label>Paid date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={payoutForm.paidAt} onChange={(event) => updatePayout('paidAt', event.target.value)} /></label>
              <label className="wide">Notes<textarea value={payoutForm.notes} onChange={(event) => updatePayout('notes', event.target.value)} /></label>
              <div className="form-actions wide"><button type="button" className="secondary" onClick={() => setShowPayoutForm(false)}>Cancel</button><button className="primary" disabled={isSaving}>Record payout</button></div>
            </form>
          )}

          <section className="panel">
            <div className="section-title"><h2>Influencers and codes</h2><p>Codes are entered once by new customers and their discount and influencer commission continue on every monthly payment.</p></div>
            <div className="partner-list">
              {dashboard.partners.length === 0 && <p className="empty">No influencer codes yet.</p>}
              {dashboard.partners.map((partner) => {
                const code = partner.referral_codes?.[0];
                return (
                  <article className="partner-card" key={partner.id}>
                    <div className="partner-main"><div><h3>{partner.name}</h3><p>{partner.email}</p></div>{code && <button className="code-chip" onClick={() => navigator.clipboard.writeText(code.code)}>{code.code}<Copy size={13} /></button>}</div>
                    <div className="balance-row"><span><b>{formatMoney(partner.balances.pending)}</b> pending</span><span><b>{formatMoney(partner.balances.payable)}</b> payable</span><span><b>{formatMoney(partner.balances.paid)}</b> paid</span></div>
                    <div className="partner-actions">{code && <button className="secondary" onClick={() => toggleCode(code)} disabled={isSaving}>{code.status === 'active' ? <><Pause size={15} /> Pause code</> : <><Play size={15} /> Activate code</>}</button>}<button className="primary" onClick={() => openPayout(partner)} disabled={partner.balances.payable <= 0}>Record payout</button></div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel table-panel">
            <div className="section-title"><h2>Recorded referrals</h2><p>Referrals appear as soon as Stripe Checkout accepts a code. Commission begins after the first non-zero invoice following any free trial.</p></div>
            <table><thead><tr><th>Date</th><th>Customer</th><th>Influencer</th><th>Code</th><th>Status</th></tr></thead><tbody>
              {dashboard.attributions.length === 0 && <tr><td colSpan="5" className="empty">No recorded referrals yet.</td></tr>}
              {dashboard.attributions.map((attribution) => <tr key={attribution.id}><td>{new Date(attribution.attributed_at).toLocaleDateString()}</td><td>{attribution.customer_email || attribution.stripe_customer_id}</td><td>{attribution.referral_partners?.name || '—'}</td><td>{attribution.referral_codes?.code || '—'}</td><td className={attribution.first_paid_invoice_id ? 'positive' : 'pending-status'}>{attribution.first_paid_invoice_id ? 'Commission active' : 'Trial / awaiting first payment'}</td></tr>)}
            </tbody></table>
          </section>

          <section className="panel table-panel">
            <div className="section-title"><h2>Commission ledger</h2><p>Append-only entries from Stripe payments, reversals, and recorded payouts.</p></div>
            <table><thead><tr><th>Date</th><th>Influencer</th><th>Code</th><th>Entry</th><th>Available</th><th>Amount</th></tr></thead><tbody>{dashboard.ledger.map((entry) => <tr key={entry.id}><td>{new Date(entry.created_at).toLocaleDateString()}</td><td>{entry.referral_partners?.name || '—'}</td><td>{entry.referral_codes?.code || '—'}</td><td>{entry.entry_type}</td><td>{new Date(entry.available_at).toLocaleDateString()}</td><td className={entry.amount_cents < 0 ? 'negative' : 'positive'}>{formatMoney(entry.amount_cents, entry.currency)}</td></tr>)}</tbody></table>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default ReferralAdminPage;
