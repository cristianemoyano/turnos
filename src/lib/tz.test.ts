import { describe, expect, it } from "vitest";
import { availabilityAfter, isStartInPast } from "./tz";

describe("isStartInPast", () => {
  it("is true only when start is strictly before now", () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    expect(isStartInPast(new Date("2026-09-16T11:59:59.000Z"), now)).toBe(true);
    expect(isStartInPast(now, now)).toBe(false);
    expect(isStartInPast(new Date("2026-09-16T12:00:01.000Z"), now)).toBe(false);
  });
});

describe("availabilityAfter", () => {
  const tz = "America/Argentina/Buenos_Aires";
  const now = new Date("2026-09-16T15:00:00.000Z"); // 12:00 in Buenos Aires

  it("returns now for today and earlier dates", () => {
    expect(availabilityAfter("2026-09-16", tz, now)).toBe(now);
    expect(availabilityAfter("2026-09-15", tz, now)).toBe(now);
  });

  it("leaves future dates uncut", () => {
    expect(availabilityAfter("2026-09-17", tz, now)).toBeUndefined();
  });
});
