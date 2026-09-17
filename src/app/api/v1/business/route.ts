import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { Business } from "@/lib/associations";
import { optionalPhoneSchema } from "@/lib/phone";

const mapsUrlSchema = z
  .union([z.string(), z.null()])
  .optional()
  .superRefine((v, ctx) => {
    if (v === undefined || v === null) return;
    const trimmed = v.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: 500, type: "string", inclusive: true, origin: "string" });
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pegá el link completo de Google Maps (https://...)",
      });
    }
  })
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || !v.trim()) return null;
    return v.trim();
  });

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  phone: optionalPhoneSchema,
  address: z.string().trim().max(300).nullable().optional(),
  mapsUrl: mapsUrlSchema,
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

  const { name, phone, address, mapsUrl } = parsed.data;
  if (name !== undefined) business.name = name;
  if (phone !== undefined) business.phone = phone;
  if (address !== undefined) business.address = address;
  if (mapsUrl !== undefined) business.maps_url = mapsUrl;
  await business.save();

  return NextResponse.json({ data: business });
}
