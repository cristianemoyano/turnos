import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { pushSubscribeSchema } from "@/modules/notifications/push-subscription.schema";
import { upsertPushSubscription } from "@/modules/notifications/push-subscription.service";

export async function POST(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;

  const parsed = pushSubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const userAgent = req.headers.get("user-agent");
  const row = await upsertPushSubscription(parsed.data, authResult.ctx, userAgent);
  return NextResponse.json({ id: row.id }, { status: 201 });
}
