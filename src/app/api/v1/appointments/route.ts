import { NextResponse } from "next/server";
import { z } from "zod";
import { Op } from "sequelize";
import sequelize from "@/lib/db";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment, Business, Client, Professional, Service, ServiceSegment } from "@/lib/associations";
import { zonedTimeToUtc, hasConflict } from "@/modules/agenda/availability.service";
import type { ServiceSegment as ServiceSegmentModel } from "@/modules/catalog/service-segment.model";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const includeForDetail = [
  { model: Client, as: "client" as const },
  { model: Service, as: "service" as const, include: [{ model: ServiceSegment, as: "segments" as const }] },
  { model: Professional, as: "professional" as const },
];

export async function GET(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const dateStr = new URL(req.url).searchParams.get("date");
  if (!dateStr || !DATE_RE.test(dateStr)) {
    return NextResponse.json({ error: "Parámetro date inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const business = await Business.findByPk(ctx.businessId, { attributes: ["timezone"] });
  const timeZone = business?.timezone || "America/Argentina/Buenos_Aires";
  const dayStart = zonedTimeToUtc(dateStr, "00:00", timeZone);
  const dayEnd = zonedTimeToUtc(dateStr, "23:59", timeZone);

  const appointments = await Appointment.findAll({
    where: { business_id: ctx.businessId, start_at: { [Op.between]: [dayStart, dayEnd] } },
    include: includeForDetail,
    order: [["start_at", "ASC"]],
  });

  return NextResponse.json({ data: appointments });
}

const newClientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional().nullable(),
});

const appointmentSchema = z.object({
  kind: z.literal("appointment"),
  professional_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional(),
  client: newClientSchema.optional(),
  service_id: z.string().uuid(),
  start_at: z.string().min(1),
  source: z.enum(["staff", "online"]).optional(),
});

const blockSchema = z.object({
  kind: z.literal("block"),
  professional_id: z.string().uuid().optional().nullable(),
  start_at: z.string().min(1),
  duration_minutes: z.coerce.number().int().positive().max(480).optional(),
  reason: z.string().trim().min(1).max(300),
});

const createSchema = z.discriminatedUnion("kind", [appointmentSchema, blockSchema]);

export async function POST(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const startAt = new Date(input.start_at);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Fecha/hora inválida", code: "VALIDATION_ERROR" }, { status: 422 });
  }

  if (input.kind === "block") {
    const durationMinutes = input.duration_minutes ?? 30;
    if (await hasConflict(ctx.businessId, startAt, durationMinutes)) {
      return NextResponse.json({ error: "Ese horario ya está ocupado", code: "SLOT_TAKEN" }, { status: 409 });
    }
    const block = await Appointment.create({
      business_id: ctx.businessId,
      professional_id: input.professional_id ?? null,
      client_id: null,
      service_id: null,
      kind: "block",
      status: "confirmed",
      source: "staff",
      start_at: startAt,
      duration_minutes: durationMinutes,
      price: null,
      reason: input.reason,
    });
    return NextResponse.json({ data: block }, { status: 201 });
  }

  if (!input.client_id && !input.client) {
    return NextResponse.json(
      { error: "Debe indicar un cliente existente o los datos de un cliente nuevo", code: "VALIDATION_ERROR" },
      { status: 422 },
    );
  }

  const service = await Service.findOne({
    where: { id: input.service_id, business_id: ctx.businessId },
    include: [{ model: ServiceSegment, as: "segments" }],
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }
  const segments = (service.get("segments") as ServiceSegmentModel[] | undefined) ?? [];
  const totalDuration = segments.length
    ? segments.reduce((sum, s) => sum + s.duration_minutes, 0)
    : service.duration_minutes;

  if (await hasConflict(ctx.businessId, startAt, totalDuration)) {
    return NextResponse.json({ error: "Ese horario ya está ocupado", code: "SLOT_TAKEN" }, { status: 409 });
  }

  let created: Appointment;
  try {
    created = await sequelize.transaction(async (t) => {
      let clientId = input.client_id ?? null;
      if (!clientId && input.client) {
        const client = await Client.create(
          { business_id: ctx.businessId, name: input.client.name, phone: input.client.phone || null, notes: null },
          { transaction: t },
        );
        clientId = client.id;
      } else if (clientId) {
        const existing = await Client.findOne({
          where: { id: clientId, business_id: ctx.businessId },
          transaction: t,
        });
        if (!existing) throw new Error("CLIENT_NOT_FOUND");
      }

      const source = input.source ?? "staff";
      return Appointment.create(
        {
          business_id: ctx.businessId,
          professional_id: input.professional_id ?? null,
          client_id: clientId,
          service_id: service.id,
          kind: "appointment",
          // Staff-created bookings start pending — the client themselves must
          // confirm (via the WhatsApp link) before it counts as guaranteed.
          // Online self-bookings are already a confirming action by nature.
          status: source === "online" ? "confirmed" : "pending",
          source,
          start_at: startAt,
          duration_minutes: totalDuration,
          price: service.price,
          deposit_required: service.deposit_amount,
          reason: null,
        },
        { transaction: t },
      );
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CLIENT_NOT_FOUND") {
      return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    throw e;
  }

  const full = await Appointment.findByPk(created.id, { include: includeForDetail });
  return NextResponse.json({ data: full }, { status: 201 });
}
