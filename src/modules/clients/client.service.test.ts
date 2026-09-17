import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const destroy = vi.fn();

vi.mock("@/lib/associations", () => ({
  Client: {
    findOne: (...args: unknown[]) => findOne(...args),
  },
}));

import { softDeleteClient } from "./client.service";

describe("softDeleteClient", () => {
  beforeEach(() => {
    findOne.mockReset();
    destroy.mockReset();
  });

  it("returns not_found when the client is missing or outside the business", async () => {
    findOne.mockResolvedValue(null);
    await expect(softDeleteClient("biz-1", "client-1")).resolves.toBe("not_found");
    expect(destroy).not.toHaveBeenCalled();
  });

  it("soft-destroys a client scoped to the business", async () => {
    findOne.mockResolvedValue({ destroy });
    destroy.mockResolvedValue(undefined);

    await expect(softDeleteClient("biz-1", "client-1")).resolves.toBe("ok");
    expect(findOne).toHaveBeenCalledWith({
      where: { id: "client-1", business_id: "biz-1" },
    });
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
