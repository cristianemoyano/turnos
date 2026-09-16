import { describe, it, expect } from "vitest";
import { expandSegments, rangesOverlap, wallClockMinutes, workRangesMs } from "./segments";

const COLOR = [
  { type: "work" as const, duration_minutes: 30, position: 0, label: "Aplicar" },
  { type: "wait" as const, duration_minutes: 45, position: 1, label: "Reposo" },
  { type: "work" as const, duration_minutes: 30, position: 2, label: "Enjuague" },
];

describe("expandSegments", () => {
  it("treats a service without etapas as one work block", () => {
    expect(expandSegments(45)).toEqual([
      { type: "work", offsetMinutes: 0, durationMinutes: 45, label: "" },
    ]);
  });

  it("keeps wait pieces in the timeline", () => {
    const pieces = expandSegments(105, COLOR);
    expect(pieces.map((p) => [p.type, p.offsetMinutes, p.durationMinutes])).toEqual([
      ["work", 0, 30],
      ["wait", 30, 45],
      ["work", 75, 30],
    ]);
  });
});

describe("workRangesMs", () => {
  it("drops wait gaps so another turno can fit in them", () => {
    const start = Date.parse("2026-09-16T13:00:00.000Z");
    const ranges = workRangesMs(start, 105, COLOR);
    expect(ranges).toEqual([
      { start, end: start + 30 * 60_000 },
      { start: start + 75 * 60_000, end: start + 105 * 60_000 },
    ]);
  });

  it("does not collide a 30-min corte sitting in the wait", () => {
    const colorStart = Date.parse("2026-09-16T13:00:00.000Z");
    const corteStart = colorStart + 30 * 60_000;
    const colorWork = workRangesMs(colorStart, 105, COLOR);
    const corteWork = workRangesMs(corteStart, 30);
    expect(rangesOverlap(colorWork, corteWork)).toBe(false);
  });

  it("does collide a corte that overlaps the second work piece", () => {
    const colorStart = Date.parse("2026-09-16T13:00:00.000Z");
    const corteStart = colorStart + 60 * 60_000;
    const colorWork = workRangesMs(colorStart, 105, COLOR);
    const corteWork = workRangesMs(corteStart, 30);
    expect(rangesOverlap(colorWork, corteWork)).toBe(true);
  });
});

describe("wallClockMinutes", () => {
  it("sums etapas including espera", () => {
    expect(wallClockMinutes(30, COLOR)).toBe(105);
  });
});
