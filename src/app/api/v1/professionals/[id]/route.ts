import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Professional } from "@/lib/associations";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
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

  const professional = await Professional.findOne({ where: { id, business_id: ctx.businessId } });
  if (!professional) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { name, phone } = parsed.data;
  if (name !== undefined) professional.name = name;
  if (phone !== undefined) professional.phone = phone;
  await professional.save();

  return NextResponse.json({ data: professional });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const professional = await Professional.findOne({ where: { id, business_id: ctx.businessId } });
  if (!professional) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });

  await professional.destroy();
  return NextResponse.json({ data: { id } });
}
