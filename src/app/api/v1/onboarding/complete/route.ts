import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { Business } from "@/lib/associations";

export async function POST() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const business = await Business.findByPk(ctx.businessId);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  business.onboarding_completed_at = new Date();
  await business.save();

  return NextResponse.json({ data: { slug: business.slug } });
}
