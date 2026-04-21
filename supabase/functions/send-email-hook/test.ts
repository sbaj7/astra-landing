// Test script for send-email-hook Edge Function
// Run with: deno run --allow-net --allow-env test.ts

import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// Test configuration - update these values for your testing
const TEST_CONFIG = {
  functionUrl: "http://localhost:54321/functions/v1/send-email-hook",
  webhookSecret: "your-test-webhook-secret", // Use the same secret in your local .env
  testEmail: "test@example.com",
  testUserId: "123e4567-e89b-12d3-a456-426614174000",
};

// Generate webhook signature (mimics Supabase)
function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(signedContent).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

// Test email verification webhook
async function testVerificationEmail() {
  console.log("🧪 Testing email verification webhook...");

  const payload = JSON.stringify({
    email_action_type: "signup",
    user: {
      id: TEST_CONFIG.testUserId,
      email: TEST_CONFIG.testEmail,
      user_metadata: {
        full_name: "Test User",
      },
    },
    email_data: {
      token_hash: "test-token-hash-12345",
      site_url: "http://localhost:5173",
    },
  });

  const signature = generateSignature(payload, TEST_CONFIG.webhookSecret);

  try {
    const response = await fetch(TEST_CONFIG.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-signature": signature,
        "webhook-id": "test-webhook-id",
        "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
      },
      body: payload,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Verification email test passed!");
      console.log("Response:", result);
    } else {
      console.error("❌ Verification email test failed!");
      console.error("Error:", result);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Test password reset webhook
async function testPasswordResetEmail() {
  console.log("\n🧪 Testing password reset webhook...");

  const payload = JSON.stringify({
    email_action_type: "recovery",
    user: {
      id: TEST_CONFIG.testUserId,
      email: TEST_CONFIG.testEmail,
      user_metadata: {
        full_name: "Test User",
      },
    },
    email_data: {
      token_hash: "reset-token-hash-67890",
      site_url: "http://localhost:5173",
    },
  });

  const signature = generateSignature(payload, TEST_CONFIG.webhookSecret);

  try {
    const response = await fetch(TEST_CONFIG.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-signature": signature,
        "webhook-id": "test-webhook-id",
        "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
      },
      body: payload,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Password reset email test passed!");
      console.log("Response:", result);
    } else {
      console.error("❌ Password reset email test failed!");
      console.error("Error:", result);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Test magic link webhook
async function testMagicLinkEmail() {
  console.log("\n🧪 Testing magic link webhook...");

  const payload = JSON.stringify({
    email_action_type: "magic_link",
    user: {
      id: TEST_CONFIG.testUserId,
      email: TEST_CONFIG.testEmail,
      user_metadata: {
        full_name: "Test User",
      },
    },
    email_data: {
      token_hash: "magic-token-hash-11111",
      site_url: "http://localhost:5173",
    },
  });

  const signature = generateSignature(payload, TEST_CONFIG.webhookSecret);

  try {
    const response = await fetch(TEST_CONFIG.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-signature": signature,
        "webhook-id": "test-webhook-id",
        "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
      },
      body: payload,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Magic link email test passed!");
      console.log("Response:", result);
    } else {
      console.error("❌ Magic link email test failed!");
      console.error("Error:", result);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run all tests
async function runTests() {
  console.log("🚀 Starting Edge Function tests...\n");
  console.log("Configuration:");
  console.log(`  Function URL: ${TEST_CONFIG.functionUrl}`);
  console.log(`  Test Email: ${TEST_CONFIG.testEmail}`);
  console.log("");

  await testVerificationEmail();
  await testPasswordResetEmail();
  await testMagicLinkEmail();

  console.log("\n✨ All tests completed!");
  console.log("\n📝 Note: Make sure you have:");
  console.log("  1. Started Supabase locally: supabase start");
  console.log("  2. Set up your .env.local with RESEND_API_KEY");
  console.log("  3. Served the function: supabase functions serve send-email-hook --env-file .env.local");
}

// Execute tests
if (import.meta.main) {
  runTests();
}