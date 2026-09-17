import { describe, expect, it } from "vitest";
import { isValidShareablePhone, optionalPhoneSchema, requiredPhoneSchema, toE164, toWhatsAppDigits } from "./phone";

describe("toWhatsAppDigits", () => {
  it("keeps full AR mobile with country code", () => {
    expect(toWhatsAppDigits("+54 9 261 555-1234")).toBe("5492615551234");
    expect(toWhatsAppDigits("5492615551234")).toBe("5492615551234");
  });

  it("adds 54 and 9 for local 10-digit mobiles", () => {
    expect(toWhatsAppDigits("261 555 1234")).toBe("5492615551234");
    expect(toWhatsAppDigits("11 1234 5678")).toBe("5491112345678");
  });

  it("strips leading 0 and international 00", () => {
    expect(toWhatsAppDigits("02615551234")).toBe("5492615551234");
    expect(toWhatsAppDigits("0054 9 11 1234 5678")).toBe("5491112345678");
  });

  it("rejects empty / too short", () => {
    expect(toWhatsAppDigits("")).toBeNull();
    expect(toWhatsAppDigits("123")).toBeNull();
    expect(toWhatsAppDigits(null)).toBeNull();
  });
});

describe("toE164", () => {
  it("prefixes plus", () => {
    expect(toE164("11 1234 5678")).toBe("+5491112345678");
  });
});

describe("schemas", () => {
  it("requiredPhoneSchema normalizes", () => {
    const r = requiredPhoneSchema.safeParse("11 1234 5678");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("+5491112345678");
  });

  it("optionalPhoneSchema clears empty", () => {
    expect(optionalPhoneSchema.parse("")).toBeNull();
    expect(optionalPhoneSchema.parse(null)).toBeNull();
    expect(optionalPhoneSchema.parse(undefined)).toBeUndefined();
  });

  it("optionalPhoneSchema rejects garbage", () => {
    expect(optionalPhoneSchema.safeParse("abc").success).toBe(false);
  });
});

describe("isValidShareablePhone", () => {
  it("accepts common AR formats", () => {
    expect(isValidShareablePhone("+54 9 11 1234-5678")).toBe(true);
    expect(isValidShareablePhone("1112345678")).toBe(true);
  });
});
