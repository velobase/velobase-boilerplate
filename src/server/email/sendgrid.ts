import sgMail from "@sendgrid/mail";
import { logger } from "@/lib/logger";

const SITE_DOMAIN = "example.com";
const EMAIL_BRAND_NAME = "AI SaaS App";

// 初始化 SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

/**
 * Generate Magic Link email HTML (pure string, no React)
 * Mirrors the template in ./templates/magic-link.tsx
 */
function generateMagicLinkHtml(url: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in to AI SaaS App</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <tr>
        <td style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">AI SaaS App</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1e293b;">Sign in to your account</h2>
          <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #64748b;">Click the button below to securely sign in. This link will expire in 15 minutes.</p>
          <table cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="text-align: center; padding: 8px 0 24px 0;">
                <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Sign in to AI SaaS App</a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Or copy and paste this URL into your browser:</p>
          <p style="margin: 0; font-size: 12px; color: #f97316; word-break: break-all; background-color: #fef3c7; padding: 12px; border-radius: 6px;">${url}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
            If you didn't request this email, you can safely ignore it.<br />
            This link will expire in 15 minutes for security reasons.
          </p>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 24px auto 0 auto;">
      <tr>
        <td style="text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${year} AI SaaS App. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

interface SendMagicLinkParams {
  to: string;
  url: string;
}

/**
 * Send Magic Link email via SendGrid
 */
export async function sendMagicLinkEmailViaSendGrid({
  to,
  url,
}: SendMagicLinkParams) {
  if (!apiKey) {
    throw new Error("Email service not configured: SENDGRID_API_KEY is missing");
  }

  logger.info({ to, provider: "sendgrid" }, "Sending magic link email via SendGrid");

  const fromAddress = "noreply@example.com";

  const msg = {
    to,
    from: {
      email: fromAddress,
      name: EMAIL_BRAND_NAME,
    },
    subject: `Sign in to ${EMAIL_BRAND_NAME}`,
    text: `Sign in to ${EMAIL_BRAND_NAME}\n\nClick the link below to sign in:\n${url}\n\nThis link will expire in 15 minutes.`,
    html: generateMagicLinkHtml(url),
  };

  try {
    const [response] = await sgMail.send(msg);
    const headers = response.headers as Record<string, string>;
    const messageId = headers["x-message-id"] ?? "unknown";
    logger.info(
      { to, messageId, provider: "sendgrid" },
      "Magic link email sent successfully via SendGrid"
    );
    return { id: messageId };
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown; statusCode?: number } };
    logger.error(
      {
        to,
        provider: "sendgrid",
        statusCode: err.response?.statusCode,
        body: err.response?.body,
      },
      "SendGrid API error"
    );
    throw new Error(
      `Failed to send email via SendGrid: ${JSON.stringify(err.response?.body)}`
    );
  }
}

