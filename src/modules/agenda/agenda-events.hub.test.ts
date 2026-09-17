import { describe, it, expect, beforeEach } from "vitest";
import {
  publishAgendaEvent,
  subscribeAgendaEvents,
  clearAgendaEventListeners,
  agendaListenerCount,
} from "./agenda-events.hub";

beforeEach(() => {
  clearAgendaEventListeners();
});

describe("agenda-events.hub", () => {
  it("delivers events only to subscribers of that business", () => {
    const seenA: string[] = [];
    const seenB: string[] = [];
    subscribeAgendaEvents("biz-a", (e) => seenA.push(e.type));
    subscribeAgendaEvents("biz-b", (e) => seenB.push(e.type));

    publishAgendaEvent("biz-a", { type: "appointment.created", appointmentId: "1" });
    publishAgendaEvent("biz-b", { type: "block.changed" });

    expect(seenA).toEqual(["appointment.created"]);
    expect(seenB).toEqual(["block.changed"]);
  });

  it("unsubscribe stops delivery and clears empty sets", () => {
    const seen: string[] = [];
    const unsub = subscribeAgendaEvents("biz-a", (e) => seen.push(e.type));
    expect(agendaListenerCount("biz-a")).toBe(1);
    unsub();
    expect(agendaListenerCount("biz-a")).toBe(0);
    publishAgendaEvent("biz-a", { type: "appointment.updated" });
    expect(seen).toEqual([]);
  });

  it("adds an ISO timestamp", () => {
    let at = "";
    subscribeAgendaEvents("biz-a", (e) => {
      at = e.at;
    });
    publishAgendaEvent("biz-a", { type: "appointment.cancelled" });
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
