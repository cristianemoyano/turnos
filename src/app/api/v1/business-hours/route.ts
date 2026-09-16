import { NextResponse } from "next/server";
import { z } from "zod";
import sequelize from "@/lib/db";
import { requireBusiness } from "@/lib/api-auth";
import { BusinessHours } from "@/lib/associations";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const shiftSchema = z.object({ from: z.string(), to: z.string() });
const dayRowSchema = z.object({
  day_of_week: z.enum(WEEKDAYS),
  is_open: z.boolean(),
  shifts: z.array(shiftSchema),
});
const putSchema = z.object({ days: z.array(dayRowSchema).length(7) });

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const rows = await BusinessHours.findAll({ where: { business_id: ctx.businessId } });
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
  const ordered = WEEKDAYS.map((d) => byDay.get(d)).filter(Boolean);
  return NextResponse.json({ data: ordered });
}

export async function PUT(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  await sequelize.transaction(async (t) => {
    for (const day of parsed.data.days) {
      await BusinessHours.update(
        { is_open: day.is_open, shifts: day.shifts },
        { where: { business_id: ctx.businessId, day_of_week: day.day_of_week }, transaction: t },
      );
    }
  });

  const rows = await BusinessHours.findAll({ where: { business_id: ctx.businessId } });
  return NextResponse.json({ data: rows });
}
