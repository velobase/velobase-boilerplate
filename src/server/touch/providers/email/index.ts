import { logger } from "@/lib/logger";
import type { SendEmailParams, SendEmailResult } from "./types";
import { sendEmailViaResend } from "./resend";
import { sendEmailViaSendGrid } from "./sendgrid";

const emailProvider = process.env.EMAIL_PROVIDER || "auto";

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (emailProvider === "resend") {
    return sendEmailViaResend(params);
  }
  if (emailProvider === "sendgrid") {
    return sendEmailViaSendGrid(params);
  }

  // auto: prefer resend, fallback to sendgrid
  try {
    return await sendEmailViaResend(params);
  } catch (err) {
    logger.warn(
      { to: params.to, error: err instanceof Error ? err.message : String(err) },
      "Resend failed, attempting SendGrid fallback"
    );
    return sendEmailViaSendGrid(params);
  }
}


