import sgMail from "@sendgrid/mail";
import { logger } from "@/lib/logger";
import type { SendEmailParams, SendEmailResult } from "./types";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendEmailViaSendGrid(params: SendEmailParams): Promise<SendEmailResult> {
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is missing");
  }

  const from =
    params.from ??
    (process.env.NODE_ENV === "production"
      ? "support@example.com"
      : "support@example.com");

  logger.info({ to: params.to, provider: "sendgrid" }, "Sending email via SendGrid");

  const msg = {
    to: params.to,
    from,
    subject: params.subject,
    text: params.text,
    html: params.html,
  };

  const [response] = await sgMail.send(msg);
  const headers = response.headers as Record<string, string>;
  const messageId = headers["x-message-id"] ?? "unknown";
  return { provider: "sendgrid", messageId };
}


