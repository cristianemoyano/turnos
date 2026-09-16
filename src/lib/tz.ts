export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const WEEKDAY_MAP: Record<string, Weekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

export function weekdayInTz(date: Date, timeZone: string): Weekday {
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(date);
  return WEEKDAY_MAP[wd] ?? "mon";
}

/** "YYYY-MM-DD" for `date` as seen in `timeZone`. */
export function dateKeyInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtc = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
  return (asUtc - date.getTime()) / 60000;
}

/** Converts a wall-clock "YYYY-MM-DD" + "HH:mm" in `timeZone` to the equivalent UTC instant. */
export function zonedTimeToUtc(dateKey: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const asUtcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMinutes(new Date(asUtcGuess), timeZone);
  return new Date(asUtcGuess - offset * 60000);
}

/** Start/end of the given "YYYY-MM-DD" day in `timeZone`, as UTC instants. */
export function dayBoundsInTz(dateKey: string, timeZone: string): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateKey, "00:00", timeZone);
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextKey = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  const end = zonedTimeToUtc(nextKey, "00:00", timeZone);
  return { start, end };
}

/** Minutes-since-midnight for `date` as seen in `timeZone` (client- and server-safe). */
export function localMinutesInTz(date: Date, timeZone: string): number {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** True when `startAt` is strictly before `now` (instant comparison). */
export function isStartInPast(startAt: Date, now = new Date()): boolean {
  return startAt.getTime() < now.getTime();
}

/**
 * Cutoff for bookable slot starts on `dateKey`. Today and earlier drop
 * anything before `now`; future calendar days have no cutoff.
 */
export function availabilityAfter(dateKey: string, timeZone: string, now = new Date()): Date | undefined {
  return dateKey <= dateKeyInTz(now, timeZone) ? now : undefined;
}

export function dateLabelInTz(date: Date, timeZone: string): string {
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
