import { Resend } from "resend";
import { MagicLinkEmailTemplate } from "./templates/magic-link";
import { sendMagicLinkEmailViaSendGrid } from "./sendgrid";
import { logger } from "@/lib/logger";

const SITE_DOMAIN = "example.com";
const resendApiKey = process.env.RESEND_API_KEY;

const sendgridApiKey = process.env.SENDGRID_API_KEY;

// EMAIL_PROVIDER: "resend" | "sendgrid" | "auto" (默认 auto)
// auto 模式: 优先 Resend，失败时 fallback 到 SendGrid
const emailProvider = process.env.EMAIL_PROVIDER || "auto";

if (!resendApiKey && !sendgridApiKey) {
  logger.warn("No email API key configured - email sending will fail");
}

export const resend = new Resend(resendApiKey);

// 邮件发送配置
const EMAIL_FROM_DOMAIN = SITE_DOMAIN;
const EMAIL_BRAND_NAME = "AI SaaS App";

interface SendMagicLinkParams {
  to: string;
  url: string;
}

/**
 * Send Magic Link email via Resend (internal)
 */
async function sendViaResend({ to, url }: SendMagicLinkParams) {
  logger.info({ to, provider: "resend" }, "Sending magic link email via Resend");

  const fromAddress = process.env.NODE_ENV === "production" 
    ? `${EMAIL_BRAND_NAME} <noreply@example.com>`
    : "AI SaaS App <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject: `Sign in to ${EMAIL_BRAND_NAME}`,
    react: MagicLinkEmailTemplate({ url }),
  });

  if (error) {
    logger.error({ 
      resendError: JSON.stringify(error),
      errorName: error.name,
      errorMessage: error.message,
      to,
    }, `Resend API error: ${error.name} - ${error.message}`);
    throw new Error(`Failed to send email: [${error.name}] ${error.message}`);
  }

  logger.info({ to, emailId: data?.id, provider: "resend" }, "Magic link email sent successfully via Resend");
  return data;
}

/**
 * Send Magic Link email for authentication
 * 
 * Supports multiple providers with automatic fallback:
 * - EMAIL_PROVIDER=resend: Only use Resend
 * - EMAIL_PROVIDER=sendgrid: Only use SendGrid
 * - EMAIL_PROVIDER=auto (default): Try Resend first, fallback to SendGrid on failure
 *
 * @param to - Recipient email address
 * @param url - Magic Link URL for authentication
 * @returns Email API response
 */
export async function sendMagicLinkEmail({ to, url }: SendMagicLinkParams) {
  // 强制使用 Resend
  if (emailProvider === "resend") {
    if (!resendApiKey) {
      throw new Error("Email service not configured: RESEND_API_KEY is missing");
    }
    return sendViaResend({ to, url });
  }

  // 强制使用 SendGrid
  if (emailProvider === "sendgrid") {
    if (!sendgridApiKey) {
      throw new Error("Email service not configured: SENDGRID_API_KEY is missing");
    }
    return sendMagicLinkEmailViaSendGrid({ to, url });
  }

  // Auto 模式: Resend 优先，SendGrid 作为 fallback
  // 如果 Resend 没配置，直接用 SendGrid
  if (!resendApiKey) {
    if (!sendgridApiKey) {
      throw new Error("Email service not configured: No API key available");
    }
    logger.info({ to }, "Resend not configured, using SendGrid directly");
    return sendMagicLinkEmailViaSendGrid({ to, url });
  }

  // 尝试 Resend，失败则 fallback 到 SendGrid
  try {
    return await sendViaResend({ to, url });
  } catch (resendError) {
    logger.warn(
      { to, error: resendError instanceof Error ? resendError.message : String(resendError) },
      "Resend failed, attempting fallback to SendGrid"
    );

    if (!sendgridApiKey) {
      logger.error({ to }, "SendGrid fallback not available - no API key configured");
      throw resendError; // 没有 fallback，抛出原始错误
    }

    try {
      const result = await sendMagicLinkEmailViaSendGrid({ to, url });
      logger.info({ to }, "Email sent successfully via SendGrid fallback");
      return result;
    } catch (sendgridError) {
      logger.error(
        { 
          to, 
          resendError: resendError instanceof Error ? resendError.message : String(resendError),
          sendgridError: sendgridError instanceof Error ? sendgridError.message : String(sendgridError),
        },
        "Both Resend and SendGrid failed to send email"
      );
      throw new Error("Failed to send email: All providers failed");
    }
  }
}

