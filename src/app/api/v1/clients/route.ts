import { NextResponse } from "next/server";
import { z } from "zod";
import { Op } from "sequelize";
import { requireBusiness } from "@/lib/api-auth";
import { Client, Appointment } from "@/lib/associations";
import { optionalPhoneSchema } from "@/lib/phone";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: optionalPhoneSchema,
});

export async function GET(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const where: Record<string, unknown> = { business_id: ctx.businessId };
  if (q) where.name = { [Op.iLike]: `%${q}%` };

  const clients = await Client.findAll({ where, order: [["name", "ASC"]], limit: 200 });

  const appointments = await Appointment.findAll({
    where: { business_id: ctx.businessId, kind: "appointment", status: { [Op.ne]: "cancelled" } },
    attributes: ["client_id", "start_at"],
  });
  const statsByClient = new Map<string, { visits: number; lastVisit: Date }>();
  for (const a of appointments) {
    if (!a.client_id) continue;
    const existing = statsByClient.get(a.client_id);
    if (!existing || a.start_at > existing.lastVisit) {
      statsByClient.set(a.client_id, { visits: (existing?.visits ?? 0) + 1, lastVisit: a.start_at });
    } else {
      existing.visits += 1;
    }
  }

  const data = clients.map((c) => {
    const stats = statsByClient.get(c.id);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      visits: stats?.visits ?? 0,
      lastVisit: stats?.lastVisit ?? null,
    };
  });

  return NextResponse.json({ data });
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

  const client = await Client.create({
    business_id: ctx.businessId,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    notes: null,
  });
  return NextResponse.json({ data: client }, { status: 201 });
}
