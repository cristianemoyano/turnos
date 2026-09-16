import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Business } from "@/lib/associations";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
});

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const business = await Business.findByPk(ctx.businessId);
  return NextResponse.json({ data: business });
}

export async function PATCH(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const business = await Business.findByPk(ctx.businessId);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { name, phone, address } = parsed.data;
  if (name !== undefined) business.name = name;
  if (phone !== undefined) business.phone = phone;
  if (address !== undefined) business.address = address;
  await business.save();

  return NextResponse.json({ data: business });
}
