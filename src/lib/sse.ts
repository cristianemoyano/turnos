import { NextResponse } from "next/server";

export type SseEventInput = {
  /** Named event type (e.g. `unread`). Omit for the default `message` event. */
  event?: string;
  /** JSON-serializable payload (or a pre-stringified string). */
  data: unknown;
  /** Optional event id for Last-Event-ID resume. */
  id?: string;
};

const textEncoder = new TextEncoder();

/**
 * Encode one Server-Sent Event (UTF-8 bytes).
 * Multi-line `data` values are split into multiple `data:` lines per the SSE spec.
 */
export function encodeSseEvent(input: SseEventInput): Uint8Array {
  const lines: string[] = [];
  if (input.id != null && input.id !== "") {
    lines.push(`id: ${String(input.id).replace(/[\r\n]/g, "")}`);
  }
  if (input.event != null && input.event !== "") {
    lines.push(`event: ${String(input.event).replace(/[\r\n]/g, "")}`);
  }
  const raw = typeof input.data === "string" ? input.data : JSON.stringify(input.data);
  for (const line of raw.split(/\r?\n/)) {
    lines.push(`data: ${line}`);
  }
  lines.push("");
  return textEncoder.encode(`${lines.join("\n")}\n`);
}

/** SSE comment line (keeps proxies from closing idle connections). */
export function encodeSseComment(comment = "ping"): Uint8Array {
  const safe = String(comment).replace(/[\r\n]/g, " ");
  return textEncoder.encode(`: ${safe}\n\n`);
}

const DEFAULT_SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/** Wrap a ReadableStream as an SSE NextResponse with anti-buffering headers. */
export function createSseResponse(
  stream: ReadableStream<Uint8Array>,
  init?: { headers?: HeadersInit; status?: number },
): NextResponse {
  const headers = new Headers(DEFAULT_SSE_HEADERS);
  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return new NextResponse(stream, {
    status: init?.status ?? 200,
    headers,
  });
}

/** `setTimeout` cancelable por AbortSignal, para los loops de emisión de un stream SSE. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Un cliente que se desconecta aborta el request: no es un error que valga reportar. */
export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}
