import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Service, ServiceSegment } from "@/lib/associations";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  duration_minutes: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0),
});

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const services = await Service.findAll({
    where: { business_id: ctx.businessId },
    include: [{ model: ServiceSegment, as: "segments" }],
    order: [["name", "ASC"]],
  });
  return NextResponse.json({ data: services });
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

  const service = await Service.create({
    business_id: ctx.businessId,
    name: parsed.data.name,
    duration_minutes: parsed.data.duration_minutes,
    price: String(parsed.data.price),
    active: true,
  });
  return NextResponse.json({ data: service }, { status: 201 });
}
