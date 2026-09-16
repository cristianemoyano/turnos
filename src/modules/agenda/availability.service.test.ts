import { describe, it, expect } from "vitest";
import { weekdayForDate, zonedTimeToUtc } from "./availability.service";

describe("weekdayForDate", () => {
  it("maps a known Tuesday correctly", () => {
    // 2026-09-15 is a Tuesday.
    expect(weekdayForDate("2026-09-15")).toBe("tue");
  });

  it("maps a known Sunday correctly", () => {
    expect(weekdayForDate("2026-09-20")).toBe("sun");
  });
});

describe("zonedTimeToUtc", () => {
  it("converts a Buenos Aires wall-clock time to the correct UTC instant (UTC-3, no DST)", () => {
    const utc = zonedTimeToUtc("2026-09-15", "09:00", "America/Argentina/Buenos_Aires");
    expect(utc.toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });

  it("round-trips back to the same wall-clock time via Intl formatting", () => {
    const utc = zonedTimeToUtc("2026-01-01", "23:30", "America/Argentina/Buenos_Aires");
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(utc);
    expect(formatted).toBe("23:30");
  });
});
