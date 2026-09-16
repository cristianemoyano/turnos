import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { Business, Professional, Service, ServiceSegment } from "@/lib/associations";
import { computeAvailability } from "@/modules/agenda/availability.service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const dateStr = new URL(req.url).searchParams.get("date");
  if (!dateStr || !DATE_RE.test(dateStr)) {
    return NextResponse.json({ error: "Parámetro date inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const business = await Business.findByPk(ctx.businessId, { attributes: ["timezone"] });
  const timeZone = business?.timezone || "America/Argentina/Buenos_Aires";

  // Hide slots that already started when the requested date is "today".
  const isToday = dateStr === new Date().toLocaleDateString("en-CA", { timeZone });
  const after = isToday ? new Date() : undefined;

  const [times, services, professionals] = await Promise.all([
    computeAvailability(ctx.businessId, dateStr, timeZone, after),
    Service.findAll({
      where: { business_id: ctx.businessId, active: true },
      include: [{ model: ServiceSegment, as: "segments" }],
      order: [["name", "ASC"]],
    }),
    Professional.findAll({ where: { business_id: ctx.businessId }, order: [["created_at", "ASC"]] }),
  ]);

  return NextResponse.json({ data: { times, services, professionals } });
}
