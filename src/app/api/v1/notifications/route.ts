import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import {
  getUnreadSnapshot,
  listUserNotifications,
} from "@/modules/notifications/notifications.service";
import { notificationListQuerySchema } from "@/modules/notifications/notification.schema";

export async function GET(req: Request) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const url = new URL(req.url);
  if (url.searchParams.get("snapshot") === "1") {
    const snapshot = await getUnreadSnapshot(ctx);
    return NextResponse.json(snapshot);
  }

  const parsed = notificationListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await listUserNotifications(parsed.data, ctx);
  return NextResponse.json(result);
}
