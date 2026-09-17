import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment, Client, Service, ServiceSegment, Professional } from "@/lib/associations";
import { hasConflict, segmentsFromService } from "@/modules/agenda/availability.service";
import { isStartInPast } from "@/lib/tz";

const includeForDetail = [
  // paranoid: false keeps soft-deleted clients visible in agenda history
  { model: Client, as: "client" as const, paranoid: false },
  { model: Service, as: "service" as const, include: [{ model: ServiceSegment, as: "segments" as const }] },
  { model: Professional, as: "professional" as const },
];

/**
 * Status transitions use `{ status }` for real appointments ("confirmed" —
 * staff manually confirming a pending turno without waiting for the client's
 * link click — | "done" | "cancelled"; "pending" is the creation state and
 * not settable here). `{ deposit_paid }` toggles the manual deposit-tracking
 * flag. `{ start_at, professional_id? }` reschedules a turno to a new
 * day/time and optionally reassigns it to a different professional (or to
 * "Todos" via `null`). Block edits use `{ action: "edit-block", start_at,
 * duration_minutes, reason, professional_id? }`. Removing a block uses
 * `{ action: "unblock" }` instead of DELETE so all mutations share one
 * endpoint/shape family (PATCH + structured body).
 */
const patchSchema = z.union([
  z.object({ status: z.enum(["confirmed", "done", "cancelled"]) }),
  z.object({ deposit_paid: z.boolean() }),
  z.object({
    action: z.literal("edit-block"),
    start_at: z.string().min(1),
    duration_minutes: z.coerce.number().int().positive().max(480),
    reason: z.string().trim().min(1).max(300),
    professional_id: z.string().uuid().nullable().optional(),
  }),
  z.object({ start_at: z.string().min(1), professional_id: z.string().uuid().nullable().optional() }),
  z.object({ action: z.literal("unblock") }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const appointment = await Appointment.findOne({
    where: { id, business_id: ctx.businessId },
    include: [{ model: Service, as: "service", include: [{ model: ServiceSegment, as: "segments" }] }],
  });
  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  if ("action" in parsed.data && parsed.data.action === "unblock") {
    if (appointment.kind !== "block") {
      return NextResponse.json(
        { error: "Solo se puede desbloquear un bloqueo", code: "INVALID_KIND" },
        { status: 400 },
      );
    }
    await appointment.destroy();
    return NextResponse.json({ data: { id: appointment.id, removed: true } });
  }

  if ("action" in parsed.data && parsed.data.action === "edit-block") {
    if (appointment.kind !== "block") {
      return NextResponse.json(
        { error: "Solo se puede editar un bloqueo", code: "INVALID_KIND" },
        { status: 400 },
      );
    }
    const startAt = new Date(parsed.data.start_at);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Fecha/hora inválida", code: "VALIDATION_ERROR" }, { status: 422 });
    }
    let nextProfessionalId =
      parsed.data.professional_id !== undefined ? parsed.data.professional_id : appointment.professional_id;
    if (nextProfessionalId) {
      const professional = await Professional.findOne({
        where: { id: nextProfessionalId, business_id: ctx.businessId },
        attributes: ["id"],
      });
      if (!professional) {
        return NextResponse.json({ error: "Profesional no encontrado", code: "NOT_FOUND" }, { status: 404 });
      }
      nextProfessionalId = professional.id;
    }
    if (await hasConflict(ctx.businessId, startAt, parsed.data.duration_minutes, nextProfessionalId, appointment.id)) {
      return NextResponse.json({ error: "Ese horario ya está ocupado", code: "SLOT_TAKEN" }, { status: 409 });
    }
    appointment.start_at = startAt;
    appointment.duration_minutes = parsed.data.duration_minutes;
    appointment.reason = parsed.data.reason;
    appointment.professional_id = nextProfessionalId;
    await appointment.save();
    const full = await Appointment.findByPk(appointment.id, { include: includeForDetail });
    return NextResponse.json({ data: full });
  }

  if (appointment.kind !== "appointment") {
    return NextResponse.json(
      { error: "Solo se puede cambiar el estado de un turno", code: "INVALID_KIND" },
      { status: 400 },
    );
  }

  if ("deposit_paid" in parsed.data) {
    appointment.deposit_paid = parsed.data.deposit_paid;
  } else if ("start_at" in parsed.data) {
    if (appointment.status === "cancelled" || appointment.status === "done") {
      return NextResponse.json(
        { error: "No se puede reprogramar un turno cancelado o atendido", code: "INVALID_STATUS" },
        { status: 400 },
      );
    }
    const startAt = new Date(parsed.data.start_at);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Fecha/hora inválida", code: "VALIDATION_ERROR" }, { status: 422 });
    }
    if (isStartInPast(startAt)) {
      return NextResponse.json(
        { error: "No se puede mover un turno a un horario que ya pasó.", code: "PAST_SLOT" },
        { status: 409 },
      );
    }
    let nextProfessionalId =
      parsed.data.professional_id !== undefined ? parsed.data.professional_id : appointment.professional_id;
    if (nextProfessionalId) {
      const professional = await Professional.findOne({
        where: { id: nextProfessionalId, business_id: ctx.businessId },
        attributes: ["id"],
      });
      if (!professional) {
        return NextResponse.json({ error: "Profesional no encontrado", code: "NOT_FOUND" }, { status: 404 });
      }
      nextProfessionalId = professional.id;
    }

    if (
      await hasConflict(
        ctx.businessId,
        startAt,
        appointment.duration_minutes,
        nextProfessionalId,
        appointment.id,
        segmentsFromService(appointment.get("service")),
      )
    ) {
      return NextResponse.json({ error: "Ese horario ya está ocupado", code: "SLOT_TAKEN" }, { status: 409 });
    }

    appointment.start_at = startAt;
    appointment.professional_id = nextProfessionalId;
  } else {
    appointment.status = parsed.data.status;
  }
  await appointment.save();

  const full = await Appointment.findByPk(appointment.id, { include: includeForDetail });
  return NextResponse.json({ data: full });
}
