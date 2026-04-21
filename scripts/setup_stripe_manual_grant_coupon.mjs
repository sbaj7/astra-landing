#!/usr/bin/env node

/**
 * Setup Script for Stripe Manual Grant Coupon
 *
 * This script creates a 100% discount coupon in Stripe that will be used
 * for manually granted subscriptions. This ensures that users with manual
 * grants appear in Stripe but are never charged.
 *
 * Usage: node scripts/setup_stripe_manual_grant_coupon.mjs
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const COUPON_ID = 'MANUAL_GRANT_100_OFF';

async function setupStripeCoupon() {
  // Validate environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
    console.error('Please ensure you have a .env file with STRIPE_SECRET_KEY=sk_...');
    process.exit(1);
  }

  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16'
  });

  console.log('🔧 Setting up Stripe manual grant coupon...\n');

  try {
    // Check if coupon already exists
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(COUPON_ID);
      console.log(`✅ Coupon "${COUPON_ID}" already exists:`);
      console.log(`   - Discount: ${coupon.percent_off}% off`);
      console.log(`   - Duration: ${coupon.duration}`);
      console.log(`   - Valid: ${coupon.valid}\n`);

      // Ask if user wants to recreate it
      console.log('⚠️  Coupon already exists. No action needed.');
      console.log('   If you need to modify it, please delete it manually in Stripe dashboard first.\n');
    } catch (e) {
      // Coupon doesn't exist, create it
      console.log(`📝 Creating new coupon "${COUPON_ID}"...`);

      coupon = await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 100,
        duration: 'forever',
        name: 'Manual Grant - 100% Discount',
        metadata: {
          purpose: 'manual_subscription_grant',
          description: 'Applied to manually granted Pro/Plus subscriptions',
          created_by: 'setup_script',
          created_at: new Date().toISOString()
        },
        // Optional: Set max redemptions if you want to limit usage
        // max_redemptions: 1000,
      });

      console.log(`✅ Successfully created coupon "${COUPON_ID}"`);
      console.log(`   - Discount: 100% off`);
      console.log(`   - Duration: Forever`);
      console.log(`   - Can be used for manual subscription grants\n`);
    }

    // Also create promotional coupons for testing
    console.log('📝 Checking promotional coupons...\n');

    const promotionalCoupons = [
      {
        id: 'PARTNER_50_OFF',
        percent_off: 50,
        duration: 'forever',
        name: 'Partner Discount - 50% Off'
      },
      {
        id: 'TRIAL_30_DAYS',
        percent_off: 100,
        duration: 'once',
        name: 'Free 30-Day Trial'
      },
      {
        id: 'BETA_TESTER_75_OFF',
        percent_off: 75,
        duration: 'repeating',
        duration_in_months: 6,
        name: 'Beta Tester - 75% Off for 6 Months'
      }
    ];

    for (const promoConfig of promotionalCoupons) {
      try {
        const existingCoupon = await stripe.coupons.retrieve(promoConfig.id);
        console.log(`✓ Promotional coupon "${promoConfig.id}" already exists`);
      } catch (e) {
        // Create the promotional coupon
        const newCoupon = await stripe.coupons.create({
          ...promoConfig,
          metadata: {
            purpose: 'promotional',
            created_by: 'setup_script',
            created_at: new Date().toISOString()
          }
        });
        console.log(`✅ Created promotional coupon "${promoConfig.id}"`);
      }
    }

    console.log('\n✅ Stripe coupon setup completed successfully!\n');
    console.log('📋 Available coupons:');
    console.log('   - MANUAL_GRANT_100_OFF: For manual subscription grants (100% off forever)');
    console.log('   - PARTNER_50_OFF: Partner discount (50% off forever)');
    console.log('   - TRIAL_30_DAYS: Free trial (100% off first month)');
    console.log('   - BETA_TESTER_75_OFF: Beta tester discount (75% off for 6 months)\n');

    console.log('🎯 Next steps:');
    console.log('   1. Deploy the admin-subscription-manager edge function');
    console.log('   2. Set the ADMIN_API_KEY environment variable in Supabase');
    console.log('   3. Use the admin API to grant manual subscriptions');
    console.log('\nExample API call to grant a manual subscription:');
    console.log(`
curl -X POST https://your-project.supabase.co/functions/v1/admin-subscription-manager \\
  -H "x-admin-api-key: YOUR_ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "grant",
    "userEmail": "user@example.com",
    "plan": "pro",
    "notes": "Beta tester",
    "grantedBy": "admin@astramd.com",
    "syncToStripe": true
  }'
    `);

  } catch (error) {
    console.error('❌ Error setting up Stripe coupon:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupStripeCoupon().catch(console.error);