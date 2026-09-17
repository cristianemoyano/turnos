import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/api-auth";
import { markNotificationRead } from "@/modules/notifications/notifications.service";

const patchSchema = z.object({ read: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireBusiness();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const item = await markNotificationRead(id, parsed.data.read, authResult.ctx);
    return NextResponse.json({ data: item });
  } catch (err) {
    if (err instanceof Error && err.message === "NOTIFICATION_NOT_FOUND") {
      return NextResponse.json({ error: "Notificación no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    throw err;
  }
}
