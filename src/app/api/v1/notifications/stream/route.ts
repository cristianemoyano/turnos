import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSseResponse, encodeSseComment, encodeSseEvent, isAbortError, sleep } from "@/lib/sse";
import { getUnreadSnapshot, type UnreadSnapshot } from "@/modules/notifications/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMIT_INTERVAL_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_STREAM_MS = 5 * 60_000;

function snapshotSignature(snapshot: UnreadSnapshot): string {
  return `${snapshot.unread_count}:${snapshot.latest[0]?.id ?? ""}:${snapshot.latest[0]?.read_at ?? ""}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.businessId || !session.user.id) {
    return NextResponse.json({ error: "No autenticado", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const ctx = { businessId: session.user.businessId, userId: session.user.id };
  const signal = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: Uint8Array) => {
        if (signal.aborted) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // Controller already closed.
        }
      };

      const startedAt = Date.now();
      let lastHeartbeatAt = 0;
      let lastSignature: string | null = null;
      let eventId = 0;

      const emitUnread = async (force: boolean) => {
        const snapshot = await getUnreadSnapshot(ctx);
        const signature = snapshotSignature(snapshot);
        if (!force && signature === lastSignature) return;
        lastSignature = signature;
        eventId += 1;
        enqueue(encodeSseEvent({ event: "unread", id: String(eventId), data: snapshot }));
      };

      try {
        await emitUnread(true);
        lastHeartbeatAt = Date.now();

        while (!signal.aborted && Date.now() - startedAt < MAX_STREAM_MS) {
          await sleep(EMIT_INTERVAL_MS, signal);
          if (signal.aborted) break;

          const now = Date.now();
          if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
            enqueue(encodeSseComment("ping"));
            lastHeartbeatAt = now;
          }

          await emitUnread(false);
        }
      } catch (err: unknown) {
        if (!isAbortError(err) && !signal.aborted) {
          enqueue(
            encodeSseEvent({
              event: "error",
              data: {
                error: err instanceof Error ? err.message : "Stream error",
                code: "STREAM_ERROR",
              },
            }),
          );
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
    cancel() {
      // Client disconnected.
    },
  });

  return createSseResponse(stream);
}
