import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { getUnreadSnapshot } from "@/modules/notifications/notifications.service";

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const snapshot = await getUnreadSnapshot(authResult.ctx);
  return NextResponse.json(snapshot);
}
