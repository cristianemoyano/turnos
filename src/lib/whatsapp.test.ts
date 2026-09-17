import { describe, expect, it } from "vitest";
import { waLink } from "./whatsapp";

describe("waLink", () => {
  it("builds text-only share when phone is null/empty", () => {
    const msg = "Reservá tu turno: https://example.com/r/demo";
    expect(waLink(null, msg)).toBe(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
    );
    expect(waLink(undefined, msg)).toBe(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
    );
    expect(waLink("", msg)).toBe(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    expect(waLink("   ", msg)).toBe(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
    );
  });

  it("prefixes Argentina CC when phone has no country code", () => {
    const msg = "Hola";
    expect(waLink("9 261 555-1234", msg)).toBe(
      `https://wa.me/5492615551234?text=${encodeURIComponent(msg)}`,
    );
  });

  it("does not double-prefix when phone already has 54", () => {
    const msg = "Hola";
    expect(waLink("+54 9 261 555-1234", msg)).toBe(
      `https://wa.me/5492615551234?text=${encodeURIComponent(msg)}`,
    );
  });
});
