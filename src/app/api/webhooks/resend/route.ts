import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // For bounce events
    bounce?: {
      message: string;
      bounce_type: string;
    };
    // For complaint events
    complaint?: {
      complaint_type: string;
    };
  };
}

/**
 * Resend Webhook Handler
 *
 * Events:
 * - email.sent: Email accepted by Resend
 * - email.delivered: Email delivered to recipient's mailbox
 * - email.delivery_delayed: Temporary delivery issue
 * - email.bounced: Email bounced (invalid address)
 * - email.complained: Recipient marked as spam
 * - email.opened: Email opened (if tracking enabled)
 * - email.clicked: Link clicked (if tracking enabled)
 */
export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    logger.error("RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Get headers for verification
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn("Missing Svix headers in Resend webhook");
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Get raw body for signature verification
  const body = await req.text();

  // Verify webhook signature
  let payload: ResendWebhookPayload;

  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: errMsg }, "Failed to verify Resend webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Log the event
  const { type, data } = payload;
  const recipient = data.to?.[0] ?? "unknown";

  logger.info(
    {
      event: type,
      emailId: data.email_id,
      to: recipient,
      subject: data.subject,
    },
    `Resend webhook: ${type}`
  );

  // Handle specific events
  switch (type) {
    case "email.sent":
      // Best-effort: mark touch record as SENT if we can map it.
      // We rely on providerMessageId (=email_id) which we store in TouchRecord.
      try {
        await db.touchRecord.updateMany({
          where: { provider: "resend", providerMessageId: data.email_id },
          data: { status: "SENT", occurredAt: new Date(payload.created_at) },
        });
      } catch {
        // ignored
      }
      break;

    case "email.delivered":
      try {
        await db.touchRecord.updateMany({
          where: { provider: "resend", providerMessageId: data.email_id },
          data: { status: "DELIVERED", occurredAt: new Date(payload.created_at) },
        });
      } catch {
        // ignored
      }
      break;

    case "email.delivery_delayed":
      try {
        await db.touchRecord.updateMany({
          where: { provider: "resend", providerMessageId: data.email_id },
          data: { status: "DELIVERY_DELAYED", occurredAt: new Date(payload.created_at) },
        });
      } catch {
        // ignored
      }
      break;

    case "email.bounced":
      logger.warn(
        {
          email: recipient,
          bounceType: data.bounce?.bounce_type,
          message: data.bounce?.message,
        },
        "Email bounced"
      );
      // Mark user's email as bounced
      try {
        await db.user.updateMany({
          where: { email: recipient },
          data: { emailBounced: true },
        });
        logger.info({ email: recipient }, "Marked user email as bounced");
      } catch (err) {
        logger.error({ email: recipient, err }, "Failed to mark email as bounced");
      }

      // Best-effort: update touch record status.
      try {
        await db.touchRecord.updateMany({
          where: { provider: "resend", providerMessageId: data.email_id },
          data: { status: "BOUNCED", occurredAt: new Date(payload.created_at) },
        });
      } catch {
        // ignored
      }
      break;

    case "email.complained":
      logger.warn(
        {
          email: recipient,
          complaintType: data.complaint?.complaint_type,
        },
        "Email complaint received"
      );
      // Mark user's email as complained (spam report)
      try {
        await db.user.updateMany({
          where: { email: recipient },
          data: { emailComplained: true },
        });
        logger.info({ email: recipient }, "Marked user email as complained");
      } catch (err) {
        logger.error({ email: recipient, err }, "Failed to mark email as complained");
      }

      // Best-effort: update touch record status.
      try {
        await db.touchRecord.updateMany({
          where: { provider: "resend", providerMessageId: data.email_id },
          data: { status: "COMPLAINED", occurredAt: new Date(payload.created_at) },
        });
      } catch {
        // ignored
      }
      break;

    default:
      // email.sent, email.opened, email.clicked, etc.
      break;
  }

  return NextResponse.json({ received: true });
}

