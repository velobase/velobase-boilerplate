export type EmailProviderName = "resend" | "sendgrid";

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface SendEmailResult {
  provider: EmailProviderName;
  messageId: string;
}


