import { minutesToTimeString, timeStringToMinutes } from "@/lib/format";

export type Shift = { from: string; to: string };

/** Extra grid before the first shift / after the last, for staff sobreturnos. */
export const OVERTIME_PAD_BEFORE = 60;
export const OVERTIME_PAD_AFTER = 90;
const SLOT_STEP = 30;
const DAY_MINUTES = 24 * 60;

export function containingShift(shifts: Shift[], time: string): Shift | null {
  const m = timeStringToMinutes(time);
  return (
    [...shifts]
      .sort((a, b) => timeStringToMinutes(a.from) - timeStringToMinutes(b.from))
      .find((s) => m >= timeStringToMinutes(s.from) && m < timeStringToMinutes(s.to)) ?? null
  );
}

export function longestShiftMinutes(shifts: Shift[]): number {
  return shifts.reduce((max, s) => Math.max(max, timeStringToMinutes(s.to) - timeStringToMinutes(s.from)), 0);
}

/** Why `durationMinutes` starting at `time` cannot finish inside a shift. Null if it fits. */
export function whyDoesNotFit(
  shifts: Shift[],
  time: string,
  durationMinutes: number,
): { code: "outside_hours" } | { code: "does_not_fit"; shiftTo: string; remaining: number } | null {
  const shift = containingShift(shifts, time);
  if (!shift) return { code: "outside_hours" };
  const remaining = timeStringToMinutes(shift.to) - timeStringToMinutes(time);
  if (durationMinutes > remaining) {
    return { code: "does_not_fit", shiftTo: shift.to, remaining };
  }
  return null;
}

export function isStaffOvertimeFit(
  reason: "closed" | "outside_hours" | "does_not_fit" | "past" | "busy" | undefined,
): boolean {
  return reason === "outside_hours" || reason === "does_not_fit";
}

function snapDown(mins: number): number {
  return Math.max(0, Math.floor(mins / SLOT_STEP) * SLOT_STEP);
}

function snapUp(mins: number): number {
  return Math.min(DAY_MINUTES, Math.ceil(mins / SLOT_STEP) * SLOT_STEP);
}

export type DayRegion = {
  from: number;
  to: number;
  overtime: boolean;
  kind: "hours" | "before" | "pausa" | "after";
};

/** Continuous day tracks: in-hours shifts plus staff-only overtime pads and pausas. */
export function buildDayRegions(
  shifts: Shift[],
  extraRanges: { start: number; end: number }[] = [],
): DayRegion[] {
  const ordered = [...shifts].sort((a, b) => timeStringToMinutes(a.from) - timeStringToMinutes(b.from));
  if (ordered.length === 0) return [];

  const first = timeStringToMinutes(ordered[0].from);
  const last = timeStringToMinutes(ordered[ordered.length - 1].to);
  const extraStarts = extraRanges.map((r) => r.start);
  const extraEnds = extraRanges.map((r) => r.end);
  const start = snapDown(Math.min(first - OVERTIME_PAD_BEFORE, first, ...extraStarts));
  const end = snapUp(Math.max(last + OVERTIME_PAD_AFTER, last, ...extraEnds));

  const regions: DayRegion[] = [];
  if (start < first) regions.push({ from: start, to: first, overtime: true, kind: "before" });

  ordered.forEach((shift, i) => {
    const from = timeStringToMinutes(shift.from);
    const to = timeStringToMinutes(shift.to);
    if (to > from) regions.push({ from, to, overtime: false, kind: "hours" });
    const next = ordered[i + 1];
    if (next) {
      const gapTo = timeStringToMinutes(next.from);
      if (gapTo > to) regions.push({ from: to, to: gapTo, overtime: true, kind: "pausa" });
    }
  });

  if (end > last) regions.push({ from: last, to: end, overtime: true, kind: "after" });
  return regions.filter((r) => r.to > r.from);
}

export function regionLabel(kind: DayRegion["kind"]): string | null {
  if (kind === "before") return "Antes de abrir";
  if (kind === "pausa") return "Pausa";
  if (kind === "after") return "Después de cerrar";
  return null;
}

export function minutesRangeLabel(from: number, to: number): string {
  return `${minutesToTimeString(from)}–${minutesToTimeString(to)}`;
}
