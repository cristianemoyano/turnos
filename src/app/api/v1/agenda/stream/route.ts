import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSseResponse, encodeSseComment, encodeSseEvent, isAbortError, sleep } from "@/lib/sse";
import { subscribeAgendaEvents, type AgendaLiveEvent } from "@/modules/agenda/agenda-events.hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;
/** Cycle the stream so proxies / idle limits cannot leave a zombie connection. */
const MAX_STREAM_MS = 5 * 60_000;

/**
 * Live agenda SSE for the authenticated business.
 * Clients refresh day data when they receive `event: agenda`.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "No autenticado", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const businessId = session.user.businessId;
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

      let eventId = 0;
      const onEvent = (event: AgendaLiveEvent) => {
        eventId += 1;
        enqueue(encodeSseEvent({ event: "agenda", id: String(eventId), data: event }));
      };

      const unsubscribe = subscribeAgendaEvents(businessId, onEvent);
      const startedAt = Date.now();
      let lastHeartbeatAt = Date.now();

      // Hello so the client knows the stream is live.
      eventId += 1;
      enqueue(
        encodeSseEvent({
          event: "agenda",
          id: String(eventId),
          data: { type: "connected", at: new Date().toISOString() },
        }),
      );

      try {
        while (!signal.aborted && Date.now() - startedAt < MAX_STREAM_MS) {
          await sleep(5_000, signal);
          if (signal.aborted) break;
          const now = Date.now();
          if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
            enqueue(encodeSseComment("ping"));
            lastHeartbeatAt = now;
          }
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
        unsubscribe();
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
