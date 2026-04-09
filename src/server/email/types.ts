export interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  react?: React.ReactElement;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  provider: string;
  messageId: string;
}

export interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
  isAvailable(): boolean;
}
