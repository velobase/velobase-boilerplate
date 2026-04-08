import { Resend } from "resend";
import { logger } from "@/lib/logger";
import type { SendEmailParams, SendEmailResult } from "./types";

const resendApiKey = process.env.RESEND_API_KEY;

const resend = new Resend(resendApiKey);

export async function sendEmailViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const from =
    params.from ??
    (process.env.NODE_ENV === "production"
      ? "AI SaaS App <support@example.com>"
      : "AI SaaS App <onboarding@resend.dev>");

  logger.info({ to: params.to, provider: "resend" }, "Sending email via Resend");

  const { data, error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  if (error) {
    logger.error(
      { to: params.to, resendError: JSON.stringify(error) },
      "Resend API error"
    );
    throw new Error(`Resend failed: ${error.message}`);
  }

  return { provider: "resend", messageId: data?.id ?? "unknown" };
}


