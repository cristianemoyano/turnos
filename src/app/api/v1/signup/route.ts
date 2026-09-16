import { NextResponse } from "next/server";
import { signupSchema } from "@/modules/business/business.schema";
import { signupBusiness, EmailInUseError } from "@/modules/business/business.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const { business } = await signupBusiness(parsed.data);
    return NextResponse.json({ data: { slug: business.slug } }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return NextResponse.json({ error: "Ese email ya está registrado", code: "EMAIL_IN_USE" }, { status: 409 });
    }
    throw err;
  }
}
