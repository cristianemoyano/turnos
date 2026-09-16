import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { z } from "zod";
import sequelize from "@/lib/db";
import { Business, Service, Client, Appointment } from "@/lib/associations";

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(30),
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
  const { serviceId, startAt, name, phone } = parsed.data;

  const business = await Business.findOne({ where: { slug }, attributes: ["id", "timezone"] });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const service = await Service.findOne({
    where: { id: serviceId, business_id: business.id, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado", code: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  const start = new Date(startAt);
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);

  try {
    const appointment = await sequelize.transaction(async (t) => {
      const candidates = await Appointment.findAll({
        where: {
          business_id: business.id,
          status: { [Op.ne]: "cancelled" },
          start_at: { [Op.lt]: end },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const hasConflict = candidates.some(
        (a) => a.start_at.getTime() + a.duration_minutes * 60_000 > start.getTime(),
      );
      if (hasConflict) {
        throw new Error("SLOT_TAKEN");
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
          professional_id: null,
          client_id: client.id,
          service_id: service.id,
          kind: "appointment",
          status: "confirmed",
          source: "online",
          start_at: start,
          duration_minutes: service.duration_minutes,
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
