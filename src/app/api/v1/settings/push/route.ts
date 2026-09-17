import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import {
  generateVapidKeyPair,
  getPublicPushVapidSettings,
  PushVapidSettingsValidationError,
  updatePushVapidSettings,
} from "@/modules/notifications/push-vapid-settings.service";
import { pushVapidSettingsUpdateSchema } from "@/modules/notifications/push-vapid-settings.schema";

/** Platform VAPID settings (singleton). Any authenticated staff can manage for now. */
export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const settings = await getPublicPushVapidSettings();
  return NextResponse.json({ data: settings });
}

export async function PUT(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => null);
  if (body && typeof body === "object" && (body as { action?: string }).action === "generate") {
    const keys = generateVapidKeyPair();
    return NextResponse.json({ data: keys });
  }

  const parsed = pushVapidSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const settings = await updatePushVapidSettings(parsed.data);
    return NextResponse.json({ data: settings });
  } catch (err) {
    if (err instanceof PushVapidSettingsValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    throw err;
  }
}
