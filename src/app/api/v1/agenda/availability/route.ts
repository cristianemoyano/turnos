import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { Business, Professional, Service, ServiceSegment } from "@/lib/associations";
import { computeDayAvailability, segmentsFromService } from "@/modules/agenda/availability.service";
import { wallClockMinutes } from "@/modules/agenda/segments";
import type { SegmentLike } from "@/modules/agenda/segments";
import { availabilityAfter } from "@/lib/tz";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr || !DATE_RE.test(dateStr)) {
    return NextResponse.json({ error: "Parámetro date inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const professionalId = searchParams.get("professionalId") || undefined;
  const durationParam = searchParams.get("durationMinutes");
  const serviceId = searchParams.get("serviceId") || undefined;
  const excludeAppointmentId = searchParams.get("excludeAppointmentId") || undefined;
  const wantedParam = searchParams.get("wantedTime");
  const wantedTime = wantedParam && TIME_RE.test(wantedParam) ? wantedParam : null;

  const business = await Business.findByPk(ctx.businessId, { attributes: ["timezone"] });
  const timeZone = business?.timezone || "America/Argentina/Buenos_Aires";

  // Hide slots that already started on today or any earlier calendar day.
  const after = availabilityAfter(dateStr, timeZone);

  let durationMinutes = durationParam ? Number(durationParam) || undefined : undefined;
  let candidateSegments: SegmentLike[] | null = null;
  if (serviceId) {
    const service = await Service.findOne({
      where: { id: serviceId, business_id: ctx.businessId },
      include: [{ model: ServiceSegment, as: "segments" }],
    });
    if (service) {
      candidateSegments = segmentsFromService(service);
      durationMinutes = wallClockMinutes(service.duration_minutes, candidateSegments);
    }
  }

  const [day, services, professionals] = await Promise.all([
    computeDayAvailability(
      ctx.businessId,
      dateStr,
      timeZone,
      after,
      professionalId,
      durationMinutes,
      excludeAppointmentId,
      candidateSegments,
      wantedTime,
    ),
    Service.findAll({
      where: { business_id: ctx.businessId, active: true },
      include: [{ model: ServiceSegment, as: "segments" }],
      order: [["name", "ASC"]],
    }),
    Professional.findAll({ where: { business_id: ctx.businessId }, order: [["created_at", "ASC"]] }),
  ]);

  return NextResponse.json({
    data: {
      times: day.times,
      closed: day.closed,
      shifts: day.shifts,
      durationMinutes: day.durationMinutes,
      wanted: day.wanted,
      services,
      professionals,
    },
  });
}
