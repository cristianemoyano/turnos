import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("./emit-notification.service", () => ({ emitNotification: vi.fn() }));
vi.mock("./notification-recipients.service", () => ({ resolveInAppRecipients: vi.fn() }));
vi.mock("./notification-preferences.service", () => ({ resolveEnabledChannels: vi.fn() }));

import logger from "@/lib/logger";
import { emitNotification } from "./emit-notification.service";
import { resolveEnabledChannels } from "./notification-preferences.service";
import { resolveInAppRecipients } from "./notification-recipients.service";
import { emitInAppNotification } from "./emit-in-app.service";

const PAYLOAD = { appointment_id: "00000000-0000-4000-8000-000000000001" };
const OPTIONS = { businessId: "biz-1", actorId: "actor-1" };

beforeEach(() => {
  vi.clearAllMocks();
  (emitNotification as Mock).mockResolvedValue({ status: "sent" });
});

describe("emitInAppNotification", () => {
  it("emits one notification per recipient with their own channels", async () => {
    (resolveInAppRecipients as Mock).mockResolvedValue([
      { id: "u1", email: "u1@test.com" },
      { id: "u2", email: "u2@test.com" },
    ]);
    (resolveEnabledChannels as Mock).mockResolvedValue(
      new Map([
        ["u1", ["in_app"]],
        ["u2", ["in_app", "push"]],
      ]),
    );

    const result = await emitInAppNotification(
      { eventKey: "agenda.appointment_created", payload: PAYLOAD },
      OPTIONS,
    );

    expect(result).toEqual({ emitted_count: 2 });
    expect(emitNotification).toHaveBeenNthCalledWith(
      1,
      {
        eventKey: "agenda.appointment_created",
        recipient: { kind: "user", userId: "u1" },
        payload: PAYLOAD,
        channels: ["in_app"],
      },
      { businessId: "biz-1", actorId: "actor-1" },
    );
  });

  it("passes the actor through so the fan-out can exclude them", async () => {
    (resolveInAppRecipients as Mock).mockResolvedValue([]);

    await emitInAppNotification({ eventKey: "agenda.appointment_created", payload: PAYLOAD }, OPTIONS);

    expect(resolveInAppRecipients).toHaveBeenCalledWith({
      businessId: "biz-1",
      eventKey: "agenda.appointment_created",
      excludeUserId: "actor-1",
    });
  });

  it("skips recipients who disabled every channel", async () => {
    (resolveInAppRecipients as Mock).mockResolvedValue([{ id: "u1", email: "u1@test.com" }]);
    (resolveEnabledChannels as Mock).mockResolvedValue(new Map([["u1", []]]));

    expect(
      await emitInAppNotification({ eventKey: "agenda.appointment_created", payload: PAYLOAD }, OPTIONS),
    ).toEqual({ emitted_count: 0 });
    expect(emitNotification).not.toHaveBeenCalled();
  });

  it("keeps going when one recipient fails", async () => {
    (resolveInAppRecipients as Mock).mockResolvedValue([
      { id: "u1", email: "u1@test.com" },
      { id: "u2", email: "u2@test.com" },
    ]);
    (resolveEnabledChannels as Mock).mockResolvedValue(
      new Map([
        ["u1", ["in_app"]],
        ["u2", ["in_app"]],
      ]),
    );
    (emitNotification as Mock)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ status: "sent" });

    const result = await emitInAppNotification(
      { eventKey: "agenda.appointment_cancelled", payload: PAYLOAD },
      OPTIONS,
    );

    expect(result).toEqual({ emitted_count: 1 });
    expect(logger.error).toHaveBeenCalled();
  });
});
