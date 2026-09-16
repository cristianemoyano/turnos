import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Professional } from "@/lib/associations";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional().nullable(),
});

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const professionals = await Professional.findAll({
    where: { business_id: ctx.businessId },
    order: [["created_at", "ASC"]],
  });
  return NextResponse.json({ data: professionals });
}

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

  const professional = await Professional.create({
    business_id: ctx.businessId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
  });
  return NextResponse.json({ data: professional }, { status: 201 });
}
