import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment } from "@/lib/associations";

/**
 * Status transitions use `{ status }` for real appointments ("confirmed" —
 * staff manually confirming a pending turno without waiting for the client's
 * link click — | "done" | "cancelled"; "pending" is the creation state and
 * not settable here). `{ deposit_paid }` toggles the manual deposit-tracking
 * flag. Removing a block uses `{ action: "unblock" }` instead of DELETE so
 * all mutations share one endpoint/shape family (PATCH + structured body).
 */
const patchSchema = z.union([
  z.object({ status: z.enum(["confirmed", "done", "cancelled"]) }),
  z.object({ deposit_paid: z.boolean() }),
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

  const appointment = await Appointment.findOne({ where: { id, business_id: ctx.businessId } });
  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  if ("action" in parsed.data) {
    if (appointment.kind !== "block") {
      return NextResponse.json(
        { error: "Solo se puede desbloquear un bloqueo", code: "INVALID_KIND" },
        { status: 400 },
      );
    }
    await appointment.destroy();
    return NextResponse.json({ data: { id: appointment.id, removed: true } });
  }

  if (appointment.kind !== "appointment") {
    return NextResponse.json(
      { error: "Solo se puede cambiar el estado de un turno", code: "INVALID_KIND" },
      { status: 400 },
    );
  }

  if ("deposit_paid" in parsed.data) {
    appointment.deposit_paid = parsed.data.deposit_paid;
  } else {
    appointment.status = parsed.data.status;
  }
  await appointment.save();
  return NextResponse.json({ data: appointment });
}
