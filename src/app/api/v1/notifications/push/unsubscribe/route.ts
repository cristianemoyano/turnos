import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { pushUnsubscribeSchema } from "@/modules/notifications/push-subscription.schema";
import { removePushSubscription } from "@/modules/notifications/push-subscription.service";

export async function POST(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;

  const parsed = pushUnsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await removePushSubscription(parsed.data.endpoint, authResult.ctx);
  return NextResponse.json(result);
}
