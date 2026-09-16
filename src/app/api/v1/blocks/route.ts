import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment, Business } from "@/lib/associations";
import { timeStringToMinutes } from "@/lib/format";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const createSchema = z.object({
  day: z.enum(DAY_LABELS as [string, ...string[]]),
  from: z.string().min(1),
  to: z.string().min(1),
  reason: z.string().trim().max(300).optional().nullable(),
});

/**
 * The prototype models a block as "next Friday 15:00–17:00", not a specific
 * date — we honor that simplified UX by resolving it to the next upcoming
 * occurrence of that weekday, in the business's timezone.
 */
function nextOccurrence(dayLabel: string, timeStr: string, timeZone: string): Date {
  const targetDow = DAY_LABELS.indexOf(dayLabel);
  const [hh, mm] = timeStr.split(":").map((n) => parseInt(n, 10) || 0);

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayDow = weekdayMap[get("weekday")] ?? 0;

  let deltaDays = targetDow - todayDow;
  if (deltaDays < 0) deltaDays += 7;

  const base = new Date(Date.UTC(year, month - 1, day + deltaDays, hh, mm));
  return base;
}

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const blocks = await Appointment.findAll({
    where: { business_id: ctx.businessId, kind: "block" },
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

  const { day, from, to, reason } = parsed.data;
  const startAt = nextOccurrence(day, from, business.timezone);
  const durationMinutes = Math.max(timeStringToMinutes(to) - timeStringToMinutes(from), 15);

  const block = await Appointment.create({
    business_id: ctx.businessId,
    professional_id: null,
    client_id: null,
    service_id: null,
    kind: "block",
    status: "confirmed",
    source: "staff",
    start_at: startAt,
    duration_minutes: durationMinutes,
    price: null,
    reason: reason || "Bloqueado",
  });

  return NextResponse.json({ data: block }, { status: 201 });
}
