import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveSubscriptionPlan } from './subscriptionPlan.js';

test('resolves an attached trialing Plus profile', () => {
  const profile = {
    subscription_status: 'trialing',
    subscription_tier: 'plus',
    subscription: { status: 'trialing', plan_key: 'plus' }
  };

  assert.equal(getEffectiveSubscriptionPlan(profile, null), 'plus');
});

test('resolves a raw tier column with metadata status', () => {
  const profile = {
    subscription_status: 'plus',
    metadata: { subscription: { status: 'trialing', plan_key: 'plus' } }
  };

  assert.equal(getEffectiveSubscriptionPlan(profile, null), 'plus');
});

test('uses fresh subscription data when the profile is stale', () => {
  const subscription = { status: 'active', plan_key: 'plus' };

  assert.equal(getEffectiveSubscriptionPlan({ subscription_status: 'free' }, subscription), 'plus');
});

test('honors a valid manual Pro grant', () => {
  const profile = {
    manual_subscription_enabled: true,
    manual_subscription_plan: 'pro',
    manual_subscription_expires_at: '2030-01-01T00:00:00.000Z'
  };

  assert.equal(getEffectiveSubscriptionPlan(profile, null, new Date('2029-01-01T00:00:00.000Z')), 'pro');
});

test('falls back to Free without a current entitlement', () => {
  const profile = {
    subscription_status: 'free',
    metadata: { subscription: { status: 'canceled', plan_key: 'plus' } }
  };

  assert.equal(getEffectiveSubscriptionPlan(profile, null), 'free');
});
