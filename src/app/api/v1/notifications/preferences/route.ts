import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import {
  listNotificationPreferences,
  updateNotificationPreferences,
} from "@/modules/notifications/notification-preferences.service";
import { notificationPreferencesUpdateSchema } from "@/modules/notifications/notification-preference.schema";

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const data = await listNotificationPreferences(authResult.ctx);
  return NextResponse.json({ data });
}

export async function PUT(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;

  const parsed = notificationPreferencesUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const data = await updateNotificationPreferences(parsed.data, authResult.ctx);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "NOTIFICATION_PREFERENCE_NOT_CONFIGURABLE") {
      return NextResponse.json(
        { error: "Preferencia no configurable", code: "NOT_CONFIGURABLE" },
        { status: 400 },
      );
    }
    throw err;
  }
}
