const LA_TZ = "America/Los_Angeles";

export function getCurrentLAHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LA_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour");
  return parseInt(hourPart?.value ?? "0", 10) % 24;
}

function toLAMidnight(now: Date): Date {
  const laStr = now.toLocaleString("en-US", { timeZone: LA_TZ });
  const laDate = new Date(laStr);
  laDate.setHours(0, 0, 0, 0);
  const offset = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: LA_TZ })).getTime();
  return new Date(laDate.getTime() + offset);
}

export function getHourlyWindowLA(now: Date): { start: Date; end: Date; label: string } {
  const laHour = getCurrentLAHour(now);
  const prevHour = (laHour - 1 + 24) % 24;

  const midnight = toLAMidnight(now);
  const start = new Date(midnight.getTime() + prevHour * 3600_000);
  const end = new Date(midnight.getTime() + laHour * 3600_000);

  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { timeZone: LA_TZ, month: "short", day: "numeric", hour: "2-digit", hour12: false });
  return { start, end, label: `${fmt(start)} – ${fmt(end)} (LA)` };
}

export function getDailyWindowLA(now: Date): { start: Date; end: Date; label: string } {
  const midnight = toLAMidnight(now);
  const start = new Date(midnight.getTime() - 24 * 3600_000);
  const end = midnight;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: LA_TZ, month: "short", day: "numeric", year: "numeric" });
  return { start, end, label: fmt(start) };
}
