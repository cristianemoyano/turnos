import { NextResponse } from "next/server";
import { z } from "zod";
import sequelize from "@/lib/db";
import { requireBusiness } from "@/lib/api-auth";
import { Service, ServiceSegment } from "@/lib/associations";

const segmentSchema = z.object({
  type: z.enum(["work", "wait"]),
  label: z.string().trim().min(1).max(200),
  duration_minutes: z.coerce.number().int().positive(),
});

const putSchema = z.object({ segments: z.array(segmentSchema) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const service = await Service.findOne({ where: { id, business_id: ctx.businessId } });
  if (!service) return NextResponse.json({ error: "Servicio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const segments = await ServiceSegment.findAll({ where: { service_id: service.id }, order: [["position", "ASC"]] });
  return NextResponse.json({ data: segments });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const service = await Service.findOne({ where: { id, business_id: ctx.businessId } });
  if (!service) return NextResponse.json({ error: "Servicio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { segments } = parsed.data;

  const result = await sequelize.transaction(async (t) => {
    await ServiceSegment.destroy({ where: { service_id: service.id }, transaction: t });
    const created = await ServiceSegment.bulkCreate(
      segments.map((s, idx) => ({
        service_id: service.id,
        type: s.type,
        label: s.label,
        duration_minutes: s.duration_minutes,
        position: idx,
      })),
      { transaction: t },
    );
    if (segments.length > 0) {
      service.duration_minutes = segments.reduce((sum, s) => sum + s.duration_minutes, 0);
      await service.save({ transaction: t });
    }
    return created;
  });

  return NextResponse.json({ data: result });
}
