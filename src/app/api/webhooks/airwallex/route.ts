import { initOrderProviders } from "@/server/order/services/init-providers";
import { handlePaymentWebhook, handleSubscriptionWebhook } from "@/server/order/services/handle-webhooks";
import { db } from "@/server/db";

export async function POST(req: Request) {
  initOrderProviders();

  const rawBody = await req.clone().text();

  // Best-effort parse for logging (signature verification happens in provider)
  let eventId: string | null = null;
  let eventType: string | null = null;
  let logId: string | null = null;

  try {
    const parsed = JSON.parse(rawBody) as { id?: string; name?: string; type?: string; sourceId?: string };
    eventId =
      typeof parsed.id === "string"
        ? parsed.id
        : [parsed.name ?? parsed.type ?? "unknown", parsed.sourceId ?? "no_source"].filter(Boolean).join("_");
    eventType = typeof parsed.name === "string" ? parsed.name : typeof parsed.type === "string" ? parsed.type : "unknown";

    const log = await db.paymentWebhookLog.upsert({
      where: { gateway_eventId: { gateway: "AIRWALLEX", eventId } },
      create: {
        gateway: "AIRWALLEX",
        eventId,
        eventType,
        status: "RECEIVED",
        payload: (JSON.parse(rawBody) as object) ?? {},
      },
      update: { status: "RECEIVED" },
    });
    logId = log.id;
  } catch {
    // ignore logging parse failures
  }

  try {
    const paymentResult = await handlePaymentWebhook("AIRWALLEX", req.clone());
    const subscriptionResult = await handleSubscriptionWebhook("AIRWALLEX", req);

    if (logId) {
      const isIgnored =
        (!!paymentResult &&
          typeof paymentResult === "object" &&
          "status" in paymentResult &&
          (paymentResult as { status?: unknown }).status === "ignored") &&
        (!!subscriptionResult &&
          typeof subscriptionResult === "object" &&
          "status" in subscriptionResult &&
          (subscriptionResult as { status?: unknown }).status === "ignored");
      await db.paymentWebhookLog.update({
        where: { id: logId },
        data: { status: isIgnored ? "IGNORED" : "PROCESSED", processedAt: new Date() },
      });
    }

    return Response.json({ ok: true, payment: paymentResult, subscription: subscriptionResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (logId) {
      await db.paymentWebhookLog.update({
        where: { id: logId },
        data: { status: "FAILED", error: message, processedAt: new Date() },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}


