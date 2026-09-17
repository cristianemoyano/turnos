import { describe, it, expect } from "vitest";
import { renderInAppContent } from "./in-app-content";

const basePayload = {
  appointment_id: "00000000-0000-4000-8000-000000000001",
  client_name: "Ana",
  service_name: "Corte",
  professional_name: "Luis",
  start_at: "2026-09-17T15:00:00.000Z",
  date_label: "mié 17",
  time_label: "12:00",
  source: "online" as const,
  document_url: "http://localhost:3100/agenda?date=2026-09-17",
};

describe("renderInAppContent", () => {
  it("renders created with online origin", () => {
    const content = renderInAppContent("agenda.appointment_created", basePayload);
    expect(content).toEqual({
      title: "Turno nuevo (online)",
      body: "Ana · Corte · Luis · mié 17 12:00",
      url: "/agenda?date=2026-09-17",
      tone: "info",
    });
  });

  it("renders cancelled as warning", () => {
    const content = renderInAppContent("agenda.appointment_cancelled", {
      ...basePayload,
      source: "staff",
      professional_name: null,
    });
    expect(content?.title).toBe("Turno cancelado");
    expect(content?.tone).toBe("warning");
    expect(content?.body).toContain("Ana · Corte");
  });

  it("returns null for unknown event without freeform title", () => {
    expect(renderInAppContent("sales.order_created", {})).toBeNull();
  });
});
