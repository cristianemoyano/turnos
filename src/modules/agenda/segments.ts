export type SegmentLike = {
  type: "work" | "wait";
  duration_minutes: number;
  position?: number;
  label?: string;
};

export type SegmentPiece = {
  type: "work" | "wait";
  offsetMinutes: number;
  durationMinutes: number;
  label: string;
};

export type TimeRangeMs = { start: number; end: number };

/** Wall-clock pieces of a service, in order. No segments → one work block. */
export function expandSegments(
  durationMinutes: number,
  segments?: SegmentLike[] | null,
): SegmentPiece[] {
  const source =
    segments && segments.length > 0
      ? [...segments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [{ type: "work" as const, duration_minutes: durationMinutes, label: "" }];

  const pieces: SegmentPiece[] = [];
  let offset = 0;
  for (const s of source) {
    const mins = Number(s.duration_minutes) || 0;
    if (mins <= 0) continue;
    pieces.push({
      type: s.type === "wait" ? "wait" : "work",
      offsetMinutes: offset,
      durationMinutes: mins,
      label: s.label ?? "",
    });
    offset += mins;
  }
  if (pieces.length === 0) {
    return [{ type: "work", offsetMinutes: 0, durationMinutes, label: "" }];
  }
  return pieces;
}

/**
 * Intervals when the professional is actually occupied. Wait pieces are omitted
 * so another turno can sit in that gap. A service with no work pieces falls
 * back to the full duration (blocks / misconfigured etapas).
 */
export function workRangesMs(
  startMs: number,
  durationMinutes: number,
  segments?: SegmentLike[] | null,
): TimeRangeMs[] {
  const work = expandSegments(durationMinutes, segments).filter((p) => p.type === "work");
  if (work.length === 0) {
    return [{ start: startMs, end: startMs + durationMinutes * 60_000 }];
  }
  return work.map((p) => ({
    start: startMs + p.offsetMinutes * 60_000,
    end: startMs + (p.offsetMinutes + p.durationMinutes) * 60_000,
  }));
}

export function rangesOverlap(a: TimeRangeMs[], b: TimeRangeMs[]): boolean {
  return a.some((x) => b.some((y) => x.start < y.end && x.end > y.start));
}

export function wallClockMinutes(durationMinutes: number, segments?: SegmentLike[] | null): number {
  if (segments && segments.length > 0) {
    const sum = segments.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0);
    return sum > 0 ? sum : durationMinutes;
  }
  return durationMinutes;
}
