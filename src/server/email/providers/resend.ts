import { Resend } from "resend";
import { logger } from "@/lib/logger";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "../types";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const defaultFrom =
  process.env.EMAIL_FROM ??
  (process.env.NODE_ENV === "production"
    ? "AI SaaS App <noreply@example.com>"
    : "AI SaaS App <onboarding@resend.dev>");

export const resendProvider: EmailProvider = {
  name: "resend",

  isAvailable() {
    return !!apiKey;
  },

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const to = Array.isArray(params.to) ? params.to : [params.to];
    const from = params.from ?? defaultFrom;

    logger.info({ to, provider: "resend" }, "Sending email via Resend");

    const { data, error } = await resend!.emails.send({
      from,
      to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      react: params.react,
      replyTo: params.replyTo,
    });

    if (error) {
      logger.error(
        { to, resendError: JSON.stringify(error) },
        `Resend API error: ${error.name} - ${error.message}`,
      );
      throw new Error(`Resend failed: [${error.name}] ${error.message}`);
    }

    logger.info({ to, emailId: data?.id, provider: "resend" }, "Email sent via Resend");
    return { provider: "resend", messageId: data?.id ?? "unknown" };
  },
};
