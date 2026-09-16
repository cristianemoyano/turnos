import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Service } from "@/lib/associations";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  duration_minutes: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().min(0).optional(),
  deposit_amount: z.coerce.number().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const service = await Service.findOne({ where: { id, business_id: ctx.businessId } });
  if (!service) return NextResponse.json({ error: "Servicio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { name, duration_minutes, price, deposit_amount, active } = parsed.data;
  if (name !== undefined) service.name = name;
  if (duration_minutes !== undefined) service.duration_minutes = duration_minutes;
  if (price !== undefined) service.price = String(price);
  if (deposit_amount !== undefined) service.deposit_amount = deposit_amount != null ? String(deposit_amount) : null;
  if (active !== undefined) service.active = active;
  await service.save();

  return NextResponse.json({ data: service });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const service = await Service.findOne({ where: { id, business_id: ctx.businessId } });
  if (!service) return NextResponse.json({ error: "Servicio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  // Soft delete (paranoid) — appointments that already reference this
  // service keep their historical service_id/price snapshot intact.
  await service.destroy();
  return NextResponse.json({ data: { id, removed: true } });
}
