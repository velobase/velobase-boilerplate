/**
 * Subscription renewal reminder schedule creation.
 *
 * Currently DISABLED for weekly billing cycles.
 * To re-enable, restore the logic from git history.
 */

export async function upsertSubscriptionRenewalReminderSchedule(_params: {
  cycleId: string;
}) {
  // Disabled: weekly subscriptions do not need renewal reminders.
  // Re-enable when targeting EU users or annual plans.
  return { ok: true, action: "skipped" as const, reason: "disabled" as const };
}
