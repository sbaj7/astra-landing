// Email templates for ASTRA MD
// Professional, branded email templates with medical theme

interface EmailTemplateProps {
  userName: string
  confirmationUrl?: string
  resetUrl?: string
  magicLinkUrl?: string
  userEmail: string
  isInvite?: boolean
  isReauth?: boolean
}

// Base email template with ASTRA MD branding
const getBaseTemplate = (content: string, footerText: string = "ASTRA MD Team") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASTRA MD</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f9fc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7f9fc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 20px 30px; background: linear-gradient(135deg, #4A6B7D 0%, #5A7B8D 100%); border-radius: 12px 12px 0 0;">
              <!-- ASTRA MD Logo (Medical Cross with Star) -->
              <div style="display: inline-block; padding: 12px; background: white; border-radius: 12px; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="scale(0.267)">
                    <path d="M65 20 C65 20, 65 65, 65 65 L20 65 C20 65, 20 115, 20 115 L65 115 C65 115, 65 160, 65 160 L115 160 C115 160, 115 115, 115 115 L160 115 C160 115, 160 65, 160 65 L115 65 C115 65, 115 20, 115 20 Z" fill="#4A6B7D"/>
                    <path d="M90 50 L98 70 L120 72 L105 87 L110 108 L90 97 L70 108 L75 87 L60 72 L82 70 Z" fill="white"/>
                  </g>
                </svg>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ASTRA MD</h1>
              <p style="margin: 8px 0 0; color: #e3eef4; font-size: 14px; font-weight: 500; letter-spacing: 0.2px;">Medical Intelligence</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 21px;">
                Best regards,<br>
                <strong style="color: #4A6B7D;">${footerText}</strong>
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                © ${new Date().getFullYear()} ASTRA MD. All rights reserved.<br>
                AI-powered medical intelligence for healthcare professionals.
              </p>
              <p style="margin: 12px 0 0; color: #9ca3af; font-size: 12px;">
                <a href="https://astramd.com/privacy" style="color: #4A6B7D; text-decoration: none;">Privacy Policy</a>
                <span style="margin: 0 8px;">•</span>
                <a href="https://astramd.com/terms" style="color: #4A6B7D; text-decoration: none;">Terms of Service</a>
                <span style="margin: 0 8px;">•</span>
                <a href="https://astramd.com/support" style="color: #4A6B7D; text-decoration: none;">Support</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Security Notice -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 16px; text-align: center;">
                This email was sent to you because you signed up for ASTRA MD.
                If you didn't create an account, you can safely ignore this email.
                For security, this link will expire in 24 hours.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

// Email verification template
export const getVerificationEmailTemplate = ({
  userName,
  confirmationUrl,
  userEmail,
  isInvite = false,
  isReauth = false
}: EmailTemplateProps): string => {
  let title = "Verify Your Email Address"
  let message = "Welcome to ASTRA MD! We're excited to have you join our community of healthcare professionals."
  let buttonText = "Verify Email Address"

  if (isInvite) {
    title = "You're Invited to ASTRA MD"
    message = "You've been invited to join ASTRA MD, the AI-powered medical intelligence platform for healthcare professionals."
    buttonText = "Accept Invitation"
  } else if (isReauth) {
    title = "Confirm Your Identity"
    message = "For security purposes, please confirm your identity to continue with this sensitive operation."
    buttonText = "Confirm Identity"
  }

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">${title}</h2>

    <p style="margin: 0 0 8px; color: #4b5563; font-size: 16px; line-height: 24px;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 24px;">
      ${message}
    </p>

    <p style="margin: 0 0 32px; color: #4b5563; font-size: 16px; line-height: 24px;">
      Please click the button below to ${isInvite ? 'accept your invitation' : isReauth ? 'confirm your identity' : 'verify your email address'} and ${isInvite ? 'create your account' : isReauth ? 'proceed' : 'activate your account'}.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4A6B7D 0%, #5A7B8D 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(74, 107, 125, 0.2);">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 32px 0 16px; color: #6b7280; font-size: 14px; line-height: 21px;">
      Or copy and paste this link into your browser:
    </p>

    <div style="padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all;">
      <code style="color: #4A6B7D; font-size: 13px; font-family: 'Courier New', monospace;">
        ${confirmationUrl}
      </code>
    </div>

    <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 21px;">
        <strong>Security Notice:</strong> This verification link will expire in 24 hours.
        If you didn't ${isInvite ? 'receive this invitation' : 'create an account'}, please ignore this email.
      </p>
    </div>
  `

  return getBaseTemplate(content)
}

// Password reset template
export const getPasswordResetTemplate = ({
  userName,
  resetUrl,
  userEmail
}: EmailTemplateProps): string => {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Reset Your Password</h2>

    <p style="margin: 0 0 8px; color: #4b5563; font-size: 16px; line-height: 24px;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 24px;">
      We received a request to reset the password for your ASTRA MD account.
      If you made this request, click the button below to create a new password.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4A6B7D 0%, #5A7B8D 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(74, 107, 125, 0.2);">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 32px 0 16px; color: #6b7280; font-size: 14px; line-height: 21px;">
      Or copy and paste this link into your browser:
    </p>

    <div style="padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all;">
      <code style="color: #4A6B7D; font-size: 13px; font-family: 'Courier New', monospace;">
        ${resetUrl}
      </code>
    </div>

    <div style="margin-top: 32px; padding: 16px; background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 21px;">
        <strong>Important:</strong> If you didn't request a password reset, please ignore this email.
        Your password won't be changed unless you click the link above and create a new one.
      </p>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 21px;">
        <strong>Security Tip:</strong> For your security, this password reset link will expire in 1 hour.
        After resetting your password, consider enabling two-factor authentication for added protection.
      </p>
    </div>
  `

  return getBaseTemplate(content)
}

// Magic link template for passwordless sign-in
export const getMagicLinkTemplate = ({
  userName,
  magicLinkUrl,
  userEmail
}: EmailTemplateProps): string => {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Sign In to ASTRA MD</h2>

    <p style="margin: 0 0 8px; color: #4b5563; font-size: 16px; line-height: 24px;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 24px;">
      Click the button below to securely sign in to your ASTRA MD account.
      No password needed!
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4A6B7D 0%, #5A7B8D 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(74, 107, 125, 0.2);">
            Sign In to ASTRA MD
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 32px 0 16px; color: #6b7280; font-size: 14px; line-height: 21px;">
      Or copy and paste this link into your browser:
    </p>

    <div style="padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all;">
      <code style="color: #4A6B7D; font-size: 13px; font-family: 'Courier New', monospace;">
        ${magicLinkUrl}
      </code>
    </div>

    <div style="margin-top: 32px; padding: 16px; background-color: #f3f4f6; border-radius: 6px;">
      <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 600;">Why passwordless?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 21px;">
        <li>More secure - no password to steal or forget</li>
        <li>Faster - one click to sign in</li>
        <li>Convenient - works on all your devices</li>
      </ul>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 21px;">
        <strong>Security Notice:</strong> This sign-in link will expire in 10 minutes and can only be used once.
        If you didn't request this link, you can safely ignore this email.
      </p>
    </div>
  `

  return getBaseTemplate(content)
}

// Export all templates
export default {
  getVerificationEmailTemplate,
  getPasswordResetTemplate,
  getMagicLinkTemplate
}