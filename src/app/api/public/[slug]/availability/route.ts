import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { z } from "zod";
import { Business, BusinessHours, Service, Appointment } from "@/lib/associations";
import { timeStringToMinutes, minutesToTimeString } from "@/lib/format";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid(),
});

// MVP simplification: Argentina does not observe DST, so its timezone is a
// fixed -03:00 offset year-round. Good enough for this single-country product;
// revisit if/when other timezones are supported.
function fixedOffsetFor(timezone: string): string {
  return timezone.includes("Argentina") ? "-03:00" : "+00:00";
}

function instantFor(ymd: string, hhmm: string, timezone: string): Date {
  return new Date(`${ymd}T${hhmm}:00${fixedOffsetFor(timezone)}`);
}

function weekdayKeyFor(ymd: string): (typeof WEEKDAYS)[number] {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

const SLOT_STEP_MINUTES = 15;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date"),
    serviceId: url.searchParams.get("serviceId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const { date, serviceId } = parsed.data;

  const business = await Business.findOne({ where: { slug }, attributes: ["id", "timezone"] });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const service = await Service.findOne({
    where: { id: serviceId, business_id: business.id, active: true },
    attributes: ["id", "duration_minutes"],
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado", code: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  const weekday = weekdayKeyFor(date);
  const hours = await BusinessHours.findOne({ where: { business_id: business.id, day_of_week: weekday } });
  if (!hours || !hours.is_open || hours.shifts.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const dayStart = instantFor(date, "00:00", business.timezone);
  const dayEnd = instantFor(date, "23:59", business.timezone);
  const existing = await Appointment.findAll({
    where: {
      business_id: business.id,
      status: { [Op.ne]: "cancelled" },
      start_at: { [Op.between]: [dayStart, dayEnd] },
    },
    attributes: ["start_at", "duration_minutes"],
  });
  const busyIntervals = existing.map((a) => ({
    start: a.start_at.getTime(),
    end: a.start_at.getTime() + a.duration_minutes * 60_000,
  }));

  const now = Date.now();
  const times = new Set<string>();
  for (const shift of hours.shifts) {
    const shiftStart = timeStringToMinutes(shift.from);
    const shiftEnd = timeStringToMinutes(shift.to);
    for (
      let candidate = shiftStart;
      candidate + service.duration_minutes <= shiftEnd;
      candidate += SLOT_STEP_MINUTES
    ) {
      const hhmm = minutesToTimeString(candidate);
      const slotStart = instantFor(date, hhmm, business.timezone).getTime();
      if (slotStart < now) continue;
      const slotEnd = slotStart + service.duration_minutes * 60_000;
      const overlaps = busyIntervals.some((b) => slotStart < b.end && slotEnd > b.start);
      if (!overlaps) times.add(hhmm);
    }
  }

  return NextResponse.json({ data: Array.from(times).sort() });
}
