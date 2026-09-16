import { Op } from "sequelize";
import { Appointment, BusinessHours, Professional } from "@/lib/associations";
import type { Weekday } from "@/modules/business/business-hours.model";
import { timeStringToMinutes, minutesToTimeString } from "@/lib/format";

const WEEKDAY_BY_INDEX: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SLOT_STEP_MINUTES = 30;

/** Weekday for a "YYYY-MM-DD" calendar date. Timezone-independent: the string
 * already represents the business's local date, so we only need its calendar
 * components, never an instant conversion. */
export function weekdayForDate(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split("-").map(Number);
  const idx = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
  return WEEKDAY_BY_INDEX[idx];
}

/**
 * Converts a "YYYY-MM-DD" date + "HH:mm" wall-clock time in the given IANA
 * timezone into the equivalent UTC Date. Uses an iterative offset-guess
 * trick (no external tz library in this project) — converges in one or two
 * passes and is accurate to the minute, which is the granularity we need for
 * scheduling. Ambiguous/skipped clock times during a DST transition are not
 * specially handled; acceptable for MVP (Argentina has not observed DST
 * since 2009).
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // `target` is the wall-clock we want, reinterpreted as a UTC instant — a
  // fixed reference point, NOT updated between iterations.
  const target = new Date(`${dateStr}T${timeStr}:00.000Z`).getTime();
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const parts = dtf.formatToParts(new Date(guess)).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    const asUtcIfLocalWereUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    // offset(guess) = formatted-local-as-UTC − guess; solve guess = target − offset.
    const offset = asUtcIfLocalWereUtc - guess;
    const nextGuess = target - offset;
    if (nextGuess === guess) break;
    guess = nextGuess;
  }
  return new Date(guess);
}

export interface BusyRange {
  start: number;
  end: number;
}

/**
 * Busy ranges for a given professional, in the "affected professionals"
 * model: a row with `professional_id: null` affects the whole business (e.g.
 * a "Todos" block, or any row from a single-professional business where no
 * professional is ever selected), so it always counts. A row scoped to a
 * specific professional only counts when asking about that same professional.
 * Pass `professionalId: null` to get only the business-wide rows.
 */
async function getBusyRangesForProfessional(
  businessId: string,
  dateStr: string,
  timeZone: string,
  professionalId: string | null,
): Promise<BusyRange[]> {
  const dayStart = zonedTimeToUtc(dateStr, "00:00", timeZone);
  const dayEnd = zonedTimeToUtc(dateStr, "23:59", timeZone);

  const busy = await Appointment.findAll({
    where: {
      business_id: businessId,
      status: { [Op.ne]: "cancelled" },
      start_at: { [Op.between]: [dayStart, dayEnd] },
      [Op.or]: professionalId
        ? [{ professional_id: null }, { professional_id: professionalId }]
        : [{ professional_id: null }],
    },
  });

  return busy.map((a) => {
    const start = a.start_at.getTime();
    return { start, end: start + a.duration_minutes * 60_000 };
  });
}

function overlaps(aStart: number, aEnd: number, ranges: BusyRange[]): boolean {
  return ranges.some((r) => aStart < r.end && aEnd > r.start);
}

/**
 * Returns free "HH:mm" slot starts for the given business/date, derived from
 * BusinessHours shifts minus existing bookings. `after` (a UTC instant) can
 * be passed to drop slots that already started (used to hide past times when
 * the requested date is today).
 *
 * `professionalId`: pass a specific professional to get *their* free times
 * (accounting for business-wide blocks too). Omit it to get slots free for
 * *at least one* professional — used before the client has picked who — which
 * degrades to the plain business-wide calendar when there are 0 or 1
 * professionals.
 *
 * `durationMinutes`: how long the appointment being scheduled actually is —
 * a slot only counts as free if the *entire* duration fits without
 * conflicting, not just the first step. Defaults to the slot grid step
 * (used when the caller doesn't know the service yet, e.g. before it's
 * picked in the staff flow — correctness is still enforced by `hasConflict`
 * at creation time either way).
 */
export async function computeAvailability(
  businessId: string,
  dateStr: string,
  timeZone: string,
  after?: Date,
  professionalId?: string,
  durationMinutes: number = SLOT_STEP_MINUTES,
): Promise<string[]> {
  const weekday = weekdayForDate(dateStr);
  const hours = await BusinessHours.findOne({ where: { business_id: businessId, day_of_week: weekday } });
  if (!hours || !hours.is_open || !hours.shifts?.length) return [];

  let isBlocked: (start: number, end: number) => boolean;
  if (professionalId) {
    const busyRanges = await getBusyRangesForProfessional(businessId, dateStr, timeZone, professionalId);
    isBlocked = (start, end) => overlaps(start, end, busyRanges);
  } else {
    const professionals = await Professional.findAll({ where: { business_id: businessId }, attributes: ["id"] });
    if (professionals.length <= 1) {
      const busyRanges = await getBusyRangesForProfessional(businessId, dateStr, timeZone, null);
      isBlocked = (start, end) => overlaps(start, end, busyRanges);
    } else {
      const perProfessionalRanges = await Promise.all(
        professionals.map((p) => getBusyRangesForProfessional(businessId, dateStr, timeZone, p.id)),
      );
      // A slot only truly has no availability if every professional is busy then.
      isBlocked = (start, end) => perProfessionalRanges.every((ranges) => overlaps(start, end, ranges));
    }
  }

  const afterMs = after?.getTime() ?? -Infinity;
  const slots: string[] = [];
  for (const shift of hours.shifts) {
    const shiftStartMin = timeStringToMinutes(shift.from);
    const shiftEndMin = timeStringToMinutes(shift.to);
    for (let m = shiftStartMin; m + durationMinutes <= shiftEndMin; m += SLOT_STEP_MINUTES) {
      const timeStr = minutesToTimeString(m);
      const slotStart = zonedTimeToUtc(dateStr, timeStr, timeZone).getTime();
      const slotEnd = slotStart + durationMinutes * 60_000;
      if (slotStart < afterMs) continue;
      if (isBlocked(slotStart, slotEnd)) continue;
      slots.push(timeStr);
    }
  }
  return slots;
}

/**
 * True if a candidate [startAt, startAt+durationMinutes) range overlaps any
 * existing non-cancelled row that affects `professionalId`. A `null`
 * `professionalId` means the candidate itself is business-wide (a "Todos"
 * block, or any booking in a single-professional business) — that always
 * conflicts with any existing row regardless of professional, since it
 * would occupy everyone's time. A specific `professionalId` only conflicts
 * with that professional's own rows plus any business-wide row.
 */
export async function hasConflict(
  businessId: string,
  startAt: Date,
  durationMinutes: number,
  professionalId: string | null = null,
): Promise<boolean> {
  const start = startAt.getTime();
  const end = start + durationMinutes * 60_000;
  const pad = 24 * 60 * 60_000;

  const candidates = await Appointment.findAll({
    where: {
      business_id: businessId,
      status: { [Op.ne]: "cancelled" },
      start_at: { [Op.between]: [new Date(start - pad), new Date(end + pad)] },
      ...(professionalId ? { [Op.or]: [{ professional_id: null }, { professional_id: professionalId }] } : {}),
    },
  });

  return candidates.some((a) => {
    const aStart = a.start_at.getTime();
    const aEnd = aStart + a.duration_minutes * 60_000;
    return start < aEnd && end > aStart;
  });
}
