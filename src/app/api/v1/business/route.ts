import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Business } from "@/lib/associations";
import { optionalPhoneSchema } from "@/lib/phone";
import { optionalHttpUrlSchema } from "@/lib/optional-http-url";

const mapsUrlSchema = optionalHttpUrlSchema("Pegá el link completo de Google Maps (https://...)");
const instagramUrlSchema = optionalHttpUrlSchema("Pegá el link completo de Instagram (https://...)");
const facebookUrlSchema = optionalHttpUrlSchema("Pegá el link completo de Facebook (https://...)");
const tiktokUrlSchema = optionalHttpUrlSchema("Pegá el link completo de TikTok (https://...)");

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  phone: optionalPhoneSchema,
  address: z.string().trim().max(300).nullable().optional(),
  mapsUrl: mapsUrlSchema,
  instagramUrl: instagramUrlSchema,
  facebookUrl: facebookUrlSchema,
  tiktokUrl: tiktokUrlSchema,
});

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const business = await Business.findByPk(ctx.businessId);
  return NextResponse.json({ data: business });
}

export async function PATCH(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const business = await Business.findByPk(ctx.businessId);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const { name, phone, address, mapsUrl, instagramUrl, facebookUrl, tiktokUrl } = parsed.data;
  if (name !== undefined) business.name = name;
  if (phone !== undefined) business.phone = phone;
  if (address !== undefined) business.address = address;
  if (mapsUrl !== undefined) business.maps_url = mapsUrl;
  if (instagramUrl !== undefined) business.instagram_url = instagramUrl;
  if (facebookUrl !== undefined) business.facebook_url = facebookUrl;
  if (tiktokUrl !== undefined) business.tiktok_url = tiktokUrl;
  await business.save();

  return NextResponse.json({ data: business });
}
