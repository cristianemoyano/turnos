import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { markAllNotificationsRead } from "@/modules/notifications/notifications.service";

export async function POST() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const result = await markAllNotificationsRead(authResult.ctx);
  return NextResponse.json(result);
}
