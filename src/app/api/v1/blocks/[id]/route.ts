import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { Appointment } from "@/lib/associations";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const { id } = await params;

  const block = await Appointment.findOne({ where: { id, business_id: ctx.businessId, kind: "block" } });
  if (!block) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });

  await block.destroy();
  return NextResponse.json({ data: { id } });
}
