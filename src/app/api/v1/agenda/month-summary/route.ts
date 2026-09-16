import { NextResponse } from "next/server";
import { z } from "zod";
import { Op } from "sequelize";
import { requireBusiness } from "@/lib/api-auth";
import { Business, Appointment } from "@/lib/associations";
import { dayBoundsInTz, dateKeyInTz } from "@/lib/tz";

const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });

export async function GET(req: Request) {
  const auth = await requireBusiness();
  if ("error" in auth) return auth.error;
  const { businessId } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });

  const business = await Business.findByPk(businessId);
  if (!business) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });

  const [y, m] = parsed.data.month.split("-").map(Number);
  const firstKey = `${y}-${String(m).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastKey = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { start } = dayBoundsInTz(firstKey, business.timezone);
  const { end } = dayBoundsInTz(lastKey, business.timezone);
  const appointments = await Appointment.findAll({
    where: { business_id: businessId, kind: "appointment", status: { [Op.ne]: "cancelled" }, start_at: { [Op.gte]: start, [Op.lt]: end } },
    attributes: ["start_at"],
  });

  const daysWithAppointments = new Set(appointments.map((a) => dateKeyInTz(a.start_at, business.timezone)));

  return NextResponse.json({ data: { days: Array.from(daysWithAppointments) } });
}
