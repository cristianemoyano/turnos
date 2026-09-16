import { NextResponse } from "next/server";
import { z } from "zod";
import { Op } from "sequelize";
import { requireBusiness } from "@/lib/api-auth";
import { Business, BusinessHours, Appointment } from "@/lib/associations";
import { dayBoundsInTz, weekdayInTz, dateKeyInTz } from "@/lib/tz";

const querySchema = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(req: Request) {
  const auth = await requireBusiness();
  if ("error" in auth) return auth.error;
  const { businessId } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });

  const business = await Business.findByPk(businessId);
  if (!business) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });

  const hours = await BusinessHours.findAll({ where: { business_id: businessId } });
  const hoursByDay = new Map(hours.map((h) => [h.day_of_week, h]));

  const [y, m, d] = parsed.data.start.split("-").map(Number);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    return dateKeyInTz(date, business.timezone);
  });

  const { start } = dayBoundsInTz(days[0], business.timezone);
  const { end } = dayBoundsInTz(days[6], business.timezone);
  const appointments = await Appointment.findAll({
    where: { business_id: businessId, kind: "appointment", status: { [Op.ne]: "cancelled" }, start_at: { [Op.gte]: start, [Op.lt]: end } },
    attributes: ["start_at"],
  });

  const counts = new Map<string, number>();
  for (const a of appointments) {
    const key = dateKeyInTz(a.start_at, business.timezone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result = days.map((dateKey) => {
    const anchor = dayBoundsInTz(dateKey, business.timezone).start;
    const weekday = weekdayInTz(anchor, business.timezone);
    const isOpen = hoursByDay.get(weekday)?.is_open ?? false;
    const shifts = hoursByDay.get(weekday)?.shifts ?? [];
    return { date: dateKey, isOpen, count: counts.get(dateKey) ?? 0, shifts };
  });

  return NextResponse.json({ data: result });
}
