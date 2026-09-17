import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { z } from "zod";
import sequelize from "@/lib/db";
import { Business, Service, ServiceSegment, Client, Appointment, Professional, BusinessHours } from "@/lib/associations";
import { rangesOverlap, wallClockMinutes, workRangesMs } from "@/modules/agenda/segments";
import { segmentsFromService, weekdayForDate } from "@/modules/agenda/availability.service";
import { whyDoesNotFit } from "@/modules/agenda/slot-fit";
import { formatTimeInTz } from "@/lib/format";
import { dateKeyInTz, isStartInPast } from "@/lib/tz";
import { isCapServerConfigured, verifyCapToken } from "@/lib/cap-verify";
import { requiredPhoneSchema } from "@/lib/phone";

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  name: z.string().trim().min(2).max(200),
  phone: requiredPhoneSchema,
  capToken: z.string().optional(),
});

function dayLabelFor(startAt: Date, timezone: string): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const startStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(startAt);
  if (startStr === todayStr) return "Hoy";
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(tomorrow);
  if (startStr === tomorrowStr) return "Mañana";
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", timeZone: timezone }).format(startAt);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { serviceId, professionalId, startAt, name, phone, capToken } = parsed.data;

  if (isCapServerConfigured()) {
    const capOk = await verifyCapToken(capToken ?? "");
    if (!capOk) {
      return NextResponse.json({ error: "Verificación fallida", code: "CAP_FAILED" }, { status: 403 });
    }
  }

  const business = await Business.findOne({ where: { slug }, attributes: ["id", "timezone"] });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const service = await Service.findOne({
    where: { id: serviceId, business_id: business.id, active: true },
    include: [{ model: ServiceSegment, as: "segments" }],
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado", code: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  let resolvedProfessionalId: string | null = null;
  let resolvedProfessionalName: string | null = null;
  if (professionalId) {
    const professional = await Professional.findOne({ where: { id: professionalId, business_id: business.id } });
    if (!professional) {
      return NextResponse.json({ error: "Profesional no encontrado", code: "PROFESSIONAL_NOT_FOUND" }, { status: 404 });
    }
    resolvedProfessionalId = professional.id;
    resolvedProfessionalName = professional.name || null;
  }

  const start = new Date(startAt);
  if (isStartInPast(start)) {
    return NextResponse.json(
      { error: "Ese horario ya no está disponible", code: "PAST_SLOT" },
      { status: 409 },
    );
  }
  const segments = segmentsFromService(service);
  const durationMinutes = wallClockMinutes(service.duration_minutes, segments);
  const candidateWork = workRangesMs(start.getTime(), durationMinutes, segments);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const dateKey = dateKeyInTz(start, business.timezone);
  const hours = await BusinessHours.findOne({
    where: { business_id: business.id, day_of_week: weekdayForDate(dateKey) },
  });
  const publicFit = whyDoesNotFit(hours?.is_open ? (hours.shifts ?? []) : [], formatTimeInTz(start, business.timezone), durationMinutes);
  if (!hours?.is_open || publicFit) {
    return NextResponse.json(
      { error: "Ese horario no está disponible para reserva online", code: "OUTSIDE_HOURS" },
      { status: 409 },
    );
  }

  try {
    const appointment = await sequelize.transaction(async (t) => {
      const professionals = resolvedProfessionalId
        ? []
        : await Professional.findAll({
            where: { business_id: business.id },
            attributes: ["id", "name"],
            order: [["created_at", "ASC"]],
            transaction: t,
          });

      // Lock only Appointment rows. Postgres rejects FOR UPDATE on the nullable
      // side of LEFT OUTER JOINs (services / segments includes).
      const candidates = await Appointment.findAll({
        where: {
          business_id: business.id,
          status: { [Op.ne]: "cancelled" },
          start_at: { [Op.lt]: end },
          // A specific professional is only occupied by their own bookings
          // plus anything business-wide (professional_id null); booking with
          // no professional chosen yet must see everyone's rows so we can
          // assign the first person actually free at this slot.
          ...(resolvedProfessionalId
            ? { [Op.or]: [{ professional_id: null }, { professional_id: resolvedProfessionalId }] }
            : {}),
        },
        include: [{ model: Service, as: "service", include: [{ model: ServiceSegment, as: "segments" }] }],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: Appointment },
      });
      const overlapping = candidates.filter((a) =>
        rangesOverlap(
          candidateWork,
          workRangesMs(a.start_at.getTime(), a.duration_minutes, segmentsFromService(a.get("service"))),
        ),
      );

      if (resolvedProfessionalId) {
        if (overlapping.length > 0) throw new Error("SLOT_TAKEN");
      } else {
        const free = professionals.find(
          (p) => !overlapping.some((a) => a.professional_id === null || a.professional_id === p.id),
        );
        if (professionals.length > 0 && !free) throw new Error("SLOT_TAKEN");
        resolvedProfessionalId = free?.id ?? null;
        resolvedProfessionalName = free?.name || null;
      }

      let client = await Client.findOne({
        where: { business_id: business.id, phone },
        transaction: t,
      });
      if (!client) {
        client = await Client.create(
          { business_id: business.id, name, phone, notes: null },
          { transaction: t },
        );
      }

      return Appointment.create(
        {
          business_id: business.id,
          professional_id: resolvedProfessionalId,
          client_id: client.id,
          service_id: service.id,
          kind: "appointment",
          status: "confirmed",
          source: "online",
          start_at: start,
          duration_minutes: durationMinutes,
          price: service.price,
          deposit_required: service.deposit_amount,
        },
        { transaction: t },
      );
    });

    return NextResponse.json(
      {
        data: {
          serviceName: service.name,
          time: new Intl.DateTimeFormat("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: business.timezone,
          }).format(appointment.start_at),
          dayLabel: dayLabelFor(appointment.start_at, business.timezone),
          professionalName: resolvedProfessionalName,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: "Ese horario ya no está disponible", code: "SLOT_TAKEN" }, { status: 409 });
    }
    throw err;
  }
}
