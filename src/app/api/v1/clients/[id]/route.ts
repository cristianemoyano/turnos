import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Client, Appointment, Service } from "@/lib/associations";
import { softDeleteClient } from "@/modules/clients/client.service";
import { optionalPhoneSchema } from "@/lib/phone";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: optionalPhoneSchema,
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const client = await Client.findOne({ where: { id, business_id: ctx.businessId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const appointments = await Appointment.findAll({
    where: { client_id: client.id, business_id: ctx.businessId, kind: "appointment" },
    include: [{ model: Service, as: "service", attributes: ["name"] }],
    order: [["start_at", "DESC"]],
    limit: 50,
  });

  return NextResponse.json({ data: { client, appointments } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const client = await Client.findOne({ where: { id, business_id: ctx.businessId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });

  if (parsed.data.name !== undefined) client.name = parsed.data.name;
  if (parsed.data.phone !== undefined) client.phone = parsed.data.phone;
  if (parsed.data.notes !== undefined) client.notes = parsed.data.notes;
  await client.save();
  return NextResponse.json({ data: client });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const result = await softDeleteClient(ctx.businessId, id);
  if (result === "not_found") {
    return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ data: { id, removed: true } });
}
