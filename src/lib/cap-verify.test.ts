import { afterEach, describe, expect, it, vi } from "vitest";

describe("verifyCapToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns true when Cap is not configured", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "");
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("any")).resolves.toBe(true);
  });

  it("returns true for placeholder secret", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "cap-secret-not-configured");
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("any")).resolves.toBe(true);
  });

  it("returns false for empty token when Cap is configured", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "real-secret");
    vi.stubEnv("CAP_VERIFY_URL", "https://cap.example/siteverify");
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("")).resolves.toBe(false);
  });

  it("returns true when siteverify succeeds", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "real-secret");
    vi.stubEnv("CAP_VERIFY_URL", "https://cap.example/siteverify");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("valid-token")).resolves.toBe(true);
  });

  it("returns false when siteverify rejects the token", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "real-secret");
    vi.stubEnv("CAP_VERIFY_URL", "https://cap.example/siteverify");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    );
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("bad-token")).resolves.toBe(false);
  });

  it("returns false when siteverify request fails", async () => {
    vi.stubEnv("CAP_SECRET_KEY", "real-secret");
    vi.stubEnv("CAP_VERIFY_URL", "https://cap.example/siteverify");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { verifyCapToken } = await import("./cap-verify");
    await expect(verifyCapToken("token")).resolves.toBe(false);
  });
});
