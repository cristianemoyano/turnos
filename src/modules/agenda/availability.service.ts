import { Op } from "sequelize";
import { Appointment, BusinessHours, Professional, Service, ServiceSegment } from "@/lib/associations";
import type { Weekday } from "@/modules/business/business-hours.model";
import { timeStringToMinutes, minutesToTimeString } from "@/lib/format";
import { rangesOverlap, workRangesMs, type SegmentLike } from "@/modules/agenda/segments";
import { whyDoesNotFit } from "@/modules/agenda/slot-fit";
import type { ServiceSegment as ServiceSegmentModel } from "@/modules/catalog/service-segment.model";

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

export type { SegmentLike };

const serviceSegmentsInclude = {
  model: Service,
  as: "service" as const,
  include: [{ model: ServiceSegment, as: "segments" as const }],
};

export function segmentsFromService(service: unknown): SegmentLike[] | null {
  if (!service || typeof service !== "object") return null;
  const obj = service as { get?: (key: string) => unknown; segments?: SegmentLike[] };
  const raw =
    (typeof obj.get === "function" ? (obj.get("segments") as ServiceSegmentModel[] | undefined) : undefined) ??
    obj.segments;
  if (!raw || raw.length === 0) return null;
  return raw.map((s) => ({
    type: s.type === "wait" ? "wait" : "work",
    duration_minutes: s.duration_minutes,
    position: "position" in s ? Number(s.position) || 0 : undefined,
    label: "label" in s ? String(s.label ?? "") : "",
  }));
}

function busyRangesForAppointment(a: Appointment): BusyRange[] {
  return workRangesMs(a.start_at.getTime(), a.duration_minutes, segmentsFromService(a.get("service")));
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
  excludeAppointmentId?: string,
): Promise<BusyRange[]> {
  const dayStart = zonedTimeToUtc(dateStr, "00:00", timeZone);
  const dayEnd = zonedTimeToUtc(dateStr, "23:59", timeZone);

  const busy = await Appointment.findAll({
    where: {
      business_id: businessId,
      status: { [Op.ne]: "cancelled" },
      start_at: { [Op.between]: [dayStart, dayEnd] },
      ...(excludeAppointmentId ? { id: { [Op.ne]: excludeAppointmentId } } : {}),
      [Op.or]: professionalId
        ? [{ professional_id: null }, { professional_id: professionalId }]
        : [{ professional_id: null }],
    },
    include: [serviceSegmentsInclude],
  });

  return busy.flatMap(busyRangesForAppointment);
}

export type WantedSlot =
  | { time: string; available: true }
  | {
      time: string;
      available: false;
      reason: "closed" | "outside_hours" | "does_not_fit" | "past" | "busy";
      shiftTo?: string;
    };

export type DayAvailability = {
  times: string[];
  closed: boolean;
  shifts: { from: string; to: string }[];
  durationMinutes: number;
  wanted: WantedSlot | null;
};

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
 * `durationMinutes`: wall-clock span of the appointment being scheduled
 * (work + wait). A slot only counts if that span still fits inside the
 * shift. Conflict checks use work pieces only — wait gaps stay free for
 * other turnos.
 *
 * `excludeAppointmentId`: ignore this row when computing busy ranges, so a
 * turno being rescheduled still sees its own current slot as free.
 *
 * `candidateSegments`: etapas of the service being booked. Wait pieces do
 * not block existing work, and existing waits do not block this service's
 * work.
 *
 * `wantedTime`: optional "HH:mm" the UI already had in mind (tapped slot).
 * When it is not in `times`, `wanted` explains why so the form can say so
 * instead of only disabling Continuar.
 */
export async function computeDayAvailability(
  businessId: string,
  dateStr: string,
  timeZone: string,
  after?: Date,
  professionalId?: string,
  durationMinutes: number = SLOT_STEP_MINUTES,
  excludeAppointmentId?: string,
  candidateSegments?: SegmentLike[] | null,
  wantedTime?: string | null,
): Promise<DayAvailability> {
  const weekday = weekdayForDate(dateStr);
  const hours = await BusinessHours.findOne({ where: { business_id: businessId, day_of_week: weekday } });
  const shifts = hours?.shifts ?? [];
  const closed = !hours || !hours.is_open || shifts.length === 0;
  if (closed) {
    return {
      times: [],
      closed: true,
      shifts,
      durationMinutes,
      wanted: wantedTime ? { time: wantedTime, available: false, reason: "closed" } : null,
    };
  }

  let isBlocked: (ranges: BusyRange[]) => boolean;
  if (professionalId) {
    const busyRanges = await getBusyRangesForProfessional(
      businessId,
      dateStr,
      timeZone,
      professionalId,
      excludeAppointmentId,
    );
    isBlocked = (ranges) => rangesOverlap(ranges, busyRanges);
  } else {
    const professionals = await Professional.findAll({ where: { business_id: businessId }, attributes: ["id"] });
    if (professionals.length <= 1) {
      const busyRanges = await getBusyRangesForProfessional(
        businessId,
        dateStr,
        timeZone,
        null,
        excludeAppointmentId,
      );
      isBlocked = (ranges) => rangesOverlap(ranges, busyRanges);
    } else {
      const perProfessionalRanges = await Promise.all(
        professionals.map((p) =>
          getBusyRangesForProfessional(businessId, dateStr, timeZone, p.id, excludeAppointmentId),
        ),
      );
      isBlocked = (ranges) => perProfessionalRanges.every((busy) => rangesOverlap(ranges, busy));
    }
  }

  const afterMs = after?.getTime() ?? -Infinity;
  const times: string[] = [];
  for (const shift of shifts) {
    const shiftStartMin = timeStringToMinutes(shift.from);
    const shiftEndMin = timeStringToMinutes(shift.to);
    for (let m = shiftStartMin; m + durationMinutes <= shiftEndMin; m += SLOT_STEP_MINUTES) {
      const timeStr = minutesToTimeString(m);
      const slotStart = zonedTimeToUtc(dateStr, timeStr, timeZone).getTime();
      if (slotStart < afterMs) continue;
      const candidateWork = workRangesMs(slotStart, durationMinutes, candidateSegments);
      if (isBlocked(candidateWork)) continue;
      times.push(timeStr);
    }
  }

  let wanted: WantedSlot | null = null;
  if (wantedTime) {
    if (times.includes(wantedTime)) {
      wanted = { time: wantedTime, available: true };
    } else {
      const fit = whyDoesNotFit(shifts, wantedTime, durationMinutes);
      if (fit?.code === "outside_hours") {
        wanted = { time: wantedTime, available: false, reason: "outside_hours" };
      } else if (fit?.code === "does_not_fit") {
        wanted = { time: wantedTime, available: false, reason: "does_not_fit", shiftTo: fit.shiftTo };
      } else {
        const slotStart = zonedTimeToUtc(dateStr, wantedTime, timeZone).getTime();
        if (slotStart < afterMs) {
          wanted = { time: wantedTime, available: false, reason: "past" };
        } else {
          wanted = { time: wantedTime, available: false, reason: "busy" };
        }
      }
    }
  }

  return { times, closed: false, shifts, durationMinutes, wanted };
}

export async function computeAvailability(
  businessId: string,
  dateStr: string,
  timeZone: string,
  after?: Date,
  professionalId?: string,
  durationMinutes: number = SLOT_STEP_MINUTES,
  excludeAppointmentId?: string,
  candidateSegments?: SegmentLike[] | null,
): Promise<string[]> {
  const day = await computeDayAvailability(
    businessId,
    dateStr,
    timeZone,
    after,
    professionalId,
    durationMinutes,
    excludeAppointmentId,
    candidateSegments,
  );
  return day.times;
}

/**
 * True if the candidate's *work* pieces overlap any existing non-cancelled
 * work that affects `professionalId`. Wait gaps on either side do not
 * conflict. A `null` `professionalId` means the candidate itself is
 * business-wide (a "Todos" block, or any booking in a single-professional
 * business) — that always conflicts with any existing work regardless of
 * professional. A specific `professionalId` only conflicts with that
 * professional's own work plus any business-wide row.
 */
export async function hasConflict(
  businessId: string,
  startAt: Date,
  durationMinutes: number,
  professionalId: string | null = null,
  excludeAppointmentId?: string,
  candidateSegments?: SegmentLike[] | null,
): Promise<boolean> {
  const start = startAt.getTime();
  const end = start + durationMinutes * 60_000;
  const pad = 24 * 60 * 60_000;
  const candidateWork = workRangesMs(start, durationMinutes, candidateSegments);

  const candidates = await Appointment.findAll({
    where: {
      business_id: businessId,
      status: { [Op.ne]: "cancelled" },
      start_at: { [Op.between]: [new Date(start - pad), new Date(end + pad)] },
      ...(excludeAppointmentId ? { id: { [Op.ne]: excludeAppointmentId } } : {}),
      ...(professionalId ? { [Op.or]: [{ professional_id: null }, { professional_id: professionalId }] } : {}),
    },
    include: [serviceSegmentsInclude],
  });

  return candidates.some((a) => rangesOverlap(candidateWork, busyRangesForAppointment(a)));
}
