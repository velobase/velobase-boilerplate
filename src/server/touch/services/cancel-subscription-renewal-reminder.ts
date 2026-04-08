import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { buildTouchDedupeKey } from "./utils";

export async function cancelSubscriptionRenewalReminderSchedule(params: {
  cycleId: string;
  reason?: string;
}) {
  const sceneKey = "sub_renewal_reminder_d1";

  const dedupeKey = buildTouchDedupeKey({
    channel: "EMAIL",
    sceneKey,
    referenceType: "SUBSCRIPTION_CYCLE",
    referenceId: params.cycleId,
  });

  const schedule = await db.touchSchedule.findUnique({ where: { dedupeKey } });
  if (!schedule) return { ok: true, action: "skipped" as const, reason: "not_found" as const };

  if (schedule.status !== "PENDING" && schedule.status !== "PROCESSING") {
    return { ok: true, action: "skipped" as const, reason: "already_final" as const };
  }

  const updated = await db.touchSchedule.update({
    where: { id: schedule.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      lastError: params.reason ?? null,
      lockedAt: null,
      lockId: null,
    },
  });

  logger.info(
    { scheduleId: updated.id, cycleId: params.cycleId },
    "Cancelled subscription renewal reminder schedule"
  );

  return { ok: true, action: "cancelled" as const, scheduleId: updated.id };
}


