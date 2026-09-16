import { NextResponse } from "next/server";
import { z } from "zod";
import { Business, Service, ServiceSegment } from "@/lib/associations";
import { computeAvailability, segmentsFromService } from "@/modules/agenda/availability.service";
import { wallClockMinutes } from "@/modules/agenda/segments";
import { availabilityAfter } from "@/lib/tz";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date"),
    serviceId: url.searchParams.get("serviceId"),
    professionalId: url.searchParams.get("professionalId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const { date, serviceId, professionalId } = parsed.data;

  const business = await Business.findOne({ where: { slug }, attributes: ["id", "timezone"] });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const service = await Service.findOne({
    where: { id: serviceId, business_id: business.id, active: true },
    include: [{ model: ServiceSegment, as: "segments" }],
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado", code: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  const after = availabilityAfter(date, business.timezone);
  const segments = segmentsFromService(service);
  const durationMinutes = wallClockMinutes(service.duration_minutes, segments);

  const times = await computeAvailability(
    business.id,
    date,
    business.timezone,
    after,
    professionalId,
    durationMinutes,
    undefined,
    segments,
  );
  return NextResponse.json({ data: times });
}
