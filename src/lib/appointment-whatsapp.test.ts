import { describe, expect, it } from "vitest";
import { buildAppointmentWhatsAppMessage } from "./appointment-whatsapp";

describe("buildAppointmentWhatsAppMessage", () => {
  const base = {
    clientName: "María",
    serviceName: "Corte femenino",
    professionalName: "Ana",
    // 2026-09-18 15:30 America/Argentina/Buenos_Aires = 18:30 UTC
    startAt: "2026-09-18T18:30:00.000Z",
    timezone: "America/Argentina/Buenos_Aires",
    address: "Av. San Martín 123",
    confirmationToken: "abc-token",
    origin: "https://turnos.andiko.cloud",
  };

  it("builds a confirm-request with deposit, bank details, confirm + cancel", () => {
    const msg = buildAppointmentWhatsAppMessage({
      ...base,
      kind: "confirm_request",
      depositRequired: "5000",
      depositPaid: false,
      bankDetails: "Alias: fiore.mp\nCBU: 0000003100012345678901",
    });

    expect(msg).toContain("Hola María! Te agendé un turno:");
    expect(msg).toContain("📅");
    expect(msg).toContain("a las 15:30");
    expect(msg).toContain("Corte femenino · con Ana");
    expect(msg).toContain("📍 Av. San Martín 123");
    expect(msg).toContain("Seña requerida: $5.000");
    expect(msg).toContain("Datos para transferir:");
    expect(msg).toContain("Alias: fiore.mp");
    expect(msg).toContain("https://turnos.andiko.cloud/confirmar/abc-token");
    expect(msg).toContain("https://turnos.andiko.cloud/cancelar/abc-token");
  });

  it("builds a reminder without confirm link but with cancel", () => {
    const msg = buildAppointmentWhatsAppMessage({
      ...base,
      kind: "reminder",
      depositRequired: null,
    });

    expect(msg).toContain("Te recordamos tu turno:");
    expect(msg).not.toContain("/confirmar/");
    expect(msg).toContain("/cancelar/abc-token");
    expect(msg).not.toContain("Seña");
  });

  it("omits bank details when deposit already paid", () => {
    const msg = buildAppointmentWhatsAppMessage({
      ...base,
      kind: "reminder",
      depositRequired: "5000",
      depositPaid: true,
      bankDetails: "Alias: x",
    });

    expect(msg).toContain("Seña: $5.000 (ya registrada)");
    expect(msg).not.toContain("Datos para transferir");
  });
});
