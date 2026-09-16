import { describe, expect, it } from "vitest";
import {
  buildDayRegions,
  containingShift,
  isStaffOvertimeFit,
  longestShiftMinutes,
  whyDoesNotFit,
} from "./slot-fit";

const morning = { from: "09:00", to: "12:00" };
const afternoon = { from: "15:00", to: "19:00" };

describe("whyDoesNotFit", () => {
  it("flags a 90-min service at 11:00 when the shift ends at 12:00", () => {
    expect(whyDoesNotFit([morning, afternoon], "11:00", 90)).toEqual({
      code: "does_not_fit",
      shiftTo: "12:00",
      remaining: 60,
    });
  });

  it("allows a 60-min service at 11:00", () => {
    expect(whyDoesNotFit([morning], "11:00", 60)).toBeNull();
  });

  it("flags a time that falls in the lunch gap", () => {
    expect(whyDoesNotFit([morning, afternoon], "13:00", 30)).toEqual({ code: "outside_hours" });
  });
});

describe("longestShiftMinutes", () => {
  it("returns the longest open block", () => {
    expect(longestShiftMinutes([morning, afternoon])).toBe(240);
  });
});

describe("containingShift", () => {
  it("finds the morning block", () => {
    expect(containingShift([morning, afternoon], "11:00")).toEqual(morning);
  });
});

describe("isStaffOvertimeFit", () => {
  it("allows outside hours and overflow past close", () => {
    expect(isStaffOvertimeFit("outside_hours")).toBe(true);
    expect(isStaffOvertimeFit("does_not_fit")).toBe(true);
    expect(isStaffOvertimeFit("busy")).toBe(false);
    expect(isStaffOvertimeFit("past")).toBe(false);
  });
});

describe("buildDayRegions", () => {
  it("adds before/after pads and a pausa between shifts", () => {
    const regions = buildDayRegions([morning, afternoon]);
    expect(regions).toEqual([
      { from: 8 * 60, to: 9 * 60, overtime: true, kind: "before" },
      { from: 9 * 60, to: 12 * 60, overtime: false, kind: "hours" },
      { from: 12 * 60, to: 15 * 60, overtime: true, kind: "pausa" },
      { from: 15 * 60, to: 19 * 60, overtime: false, kind: "hours" },
      { from: 19 * 60, to: 20 * 60 + 30, overtime: true, kind: "after" },
    ]);
  });

  it("extends the grid to cover an existing sobreturno", () => {
    const regions = buildDayRegions([morning], [{ start: 7 * 60 + 30, end: 8 * 60 }]);
    expect(regions[0]).toEqual({ from: 7 * 60 + 30, to: 9 * 60, overtime: true, kind: "before" });
  });
});
