// Supabase Edge Function to handle email sending via Resend
// This function is triggered by Supabase Auth Hooks when email verification is needed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

// Import email templates
import {
  getVerificationEmailTemplate,
  getPasswordResetTemplate,
  getMagicLinkTemplate
} from "./templates.ts"

// Initialize Resend client with dynamic import to avoid bundling issues
const initResend = async () => {
  const { Resend } = await import("npm:resend@4.0.1")
  return new Resend(Deno.env.get("RESEND_API_KEY")!)
}

// Webhook secret for verifying Supabase requests
// The secret from Supabase Auth Hook comes in format "v1,whsec_..."
// but standardwebhooks library expects just "whsec_..." part
const rawSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")
const hookSecret = rawSecret?.includes(',') ? rawSecret.split(',')[1] : rawSecret

serve(async (req: Request) => {
  try {
    // Log incoming request for debugging
    console.log("Received email hook request")

    // Verify webhook signature for security
    if (!hookSecret) {
      console.error("SEND_EMAIL_HOOK_SECRET not configured")
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get request body
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    // Verify the webhook signature
    const wh = new Webhook(hookSecret)
    let webhookData: any

    try {
      webhookData = wh.verify(payload, headers)
    } catch (err) {
      console.error("Webhook verification failed:", err instanceof Error ? err.name : "UnknownError")
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Extract email data from webhook
    const {
      user,
      email_data,
      email_action_type
    } = webhookData

    console.log(`Processing ${email_action_type} email`)

    // Initialize Resend
    const resend = await initResend()

    // Check if Resend API key is configured
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get sender email from environment or use default
    const fromEmail = Deno.env.get("EMAIL_FROM") || "ASTRA MD <noreply@astramd.com>"

    // Prepare email content based on action type
    let emailContent: {
      subject: string
      html: string
      text?: string
    }

    // Get the site URL for links
    const siteUrl = email_data.site_url || Deno.env.get("SITE_URL") || "https://astramd.com"

    switch (email_action_type) {
      case "signup":
      case "confirmation": {
        // Email verification for new sign-ups
        const confirmationUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=signup`
        emailContent = {
          subject: "Verify your ASTRA MD account",
          html: getVerificationEmailTemplate({
            userName: user.user_metadata?.full_name || user.email,
            confirmationUrl,
            userEmail: user.email
          })
        }
        break
      }

      case "recovery":
      case "reset": {
        // Password reset email
        const resetUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=recovery`
        emailContent = {
          subject: "Reset your ASTRA MD password",
          html: getPasswordResetTemplate({
            userName: user.user_metadata?.full_name || user.email,
            resetUrl,
            userEmail: user.email
          })
        }
        break
      }

      case "magic_link": {
        // Magic link for passwordless sign-in
        const magicLinkUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink`
        emailContent = {
          subject: "Your ASTRA MD sign-in link",
          html: getMagicLinkTemplate({
            userName: user.user_metadata?.full_name || user.email,
            magicLinkUrl,
            userEmail: user.email
          })
        }
        break
      }

      case "invite": {
        // User invitation email
        const inviteUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=invite`
        emailContent = {
          subject: "You've been invited to ASTRA MD",
          html: getVerificationEmailTemplate({
            userName: user.email,
            confirmationUrl: inviteUrl,
            userEmail: user.email,
            isInvite: true
          })
        }
        break
      }

      case "reauthentication": {
        // Re-authentication email for sensitive operations
        const reauthUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=reauthentication`
        emailContent = {
          subject: "Confirm your ASTRA MD identity",
          html: getVerificationEmailTemplate({
            userName: user.user_metadata?.full_name || user.email,
            confirmationUrl: reauthUrl,
            userEmail: user.email,
            isReauth: true
          })
        }
        break
      }

      default: {
        // Fallback for unknown email types
        console.warn(`Unknown email action type: ${email_action_type}`)
        const defaultUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}`
        emailContent = {
          subject: "ASTRA MD Account Notification",
          html: getVerificationEmailTemplate({
            userName: user.email,
            confirmationUrl: defaultUrl,
            userEmail: user.email
          })
        }
      }
    }

    // Send email via Resend
    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [user.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          "X-Entity-Ref-ID": user.id, // Track user ID
        },
        tags: [
          { name: "category", value: email_action_type },
          { name: "user_id", value: user.id }
        ]
      })

      if (error) {
        console.error("Resend API error:", error?.name || "resend_error")
        return new Response(
          JSON.stringify({ error: "Failed to send email", details: error }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      console.log("Email sent successfully via Resend")

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          email_id: data?.id
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )

    } catch (err) {
      console.error("Error sending email:", err instanceof Error ? err.name : "UnknownError")
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: err instanceof Error ? err.message : String(err)
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

  } catch (err) {
    console.error("Unexpected error in email hook:", err instanceof Error ? err.name : "UnknownError")
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
