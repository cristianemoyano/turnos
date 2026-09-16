import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment, Business, Professional } from "@/lib/associations";
import { timeStringToMinutes } from "@/lib/format";
import { zonedTimeToUtc } from "@/lib/tz";
import sequelize from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 60;

const createSchema = z
  .object({
    from_date: z.string().regex(DATE_RE),
    to_date: z.string().regex(DATE_RE),
    from_time: z.string().min(1),
    to_time: z.string().min(1),
    professional_id: z.string().uuid().optional().nullable(),
    reason: z.string().trim().max(300).optional().nullable(),
  })
  .refine((v) => v.to_date >= v.from_date, { message: "La fecha de fin debe ser posterior a la de inicio", path: ["to_date"] })
  .refine((v) => timeStringToMinutes(v.to_time) > timeStringToMinutes(v.from_time), {
    message: "El horario de fin debe ser posterior al de inicio",
    path: ["to_time"],
  });

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const blocks = await Appointment.findAll({
    where: { business_id: ctx.businessId, kind: "block" },
    include: [{ model: Professional, as: "professional" }],
    order: [["start_at", "ASC"]],
    limit: 100,
  });
  return NextResponse.json({ data: blocks });
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

  const business = await Business.findByPk(ctx.businessId);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { from_date, to_date, from_time, to_time, professional_id, reason } = parsed.data;
  if (professional_id) {
    const professional = await Professional.findOne({ where: { id: professional_id, business_id: ctx.businessId } });
    if (!professional) {
      return NextResponse.json({ error: "Profesional no encontrado", code: "PROFESSIONAL_NOT_FOUND" }, { status: 404 });
    }
  }
  const durationMinutes = timeStringToMinutes(to_time) - timeStringToMinutes(from_time);

  const dateKeys: string[] = [];
  let cursor = from_date;
  while (cursor <= to_date) {
    dateKeys.push(cursor);
    if (dateKeys.length > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `El rango no puede superar ${MAX_RANGE_DAYS} días`, code: "RANGE_TOO_LONG" },
        { status: 422 },
      );
    }
    cursor = addDaysToDateKey(cursor, 1);
  }

  const blocks = await sequelize.transaction((t) =>
    Promise.all(
      dateKeys.map((dateKey) =>
        Appointment.create(
          {
            business_id: ctx.businessId,
            professional_id: professional_id ?? null,
            client_id: null,
            service_id: null,
            kind: "block",
            status: "confirmed",
            source: "staff",
            start_at: zonedTimeToUtc(dateKey, from_time, business.timezone),
            duration_minutes: durationMinutes,
            price: null,
            reason: reason || "Bloqueado",
          },
          { transaction: t },
        ),
      ),
    ),
  );

  return NextResponse.json({ data: blocks }, { status: 201 });
}
