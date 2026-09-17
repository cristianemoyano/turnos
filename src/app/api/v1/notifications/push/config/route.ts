import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/api-auth";
import { getPublicPushVapidSettings } from "@/modules/notifications/push-vapid-settings.service";

export async function GET() {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const settings = await getPublicPushVapidSettings();
  return NextResponse.json({ enabled: settings.enabled, public_key: settings.public_key });
}
