import { describe, expect, it } from "vitest";
import { buildOrderCallback, ORDER_ACTIONS, parseOrderCallback } from "./order-callback";

const ID = "33333333-3333-4333-8333-333333333333";

describe("order callback data", () => {
  it.each(ORDER_ACTIONS)("round-trips %s and fits 64 bytes", (action) => {
    const data = buildOrderCallback(action, ID);
    expect(parseOrderCallback(data)).toEqual({ action, orderId: ID });
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
  });

  it.each([undefined, "", "order", "order:accept", "order:take:" + ID, "lead:accept:" + ID, "order:accept:abc", `order:accept:${ID}:x`])(
    "rejects %s",
    (data) => {
      expect(parseOrderCallback(data)).toBeNull();
    },
  );

  it("is not mistaken for lead or invite buttons", () => {
    expect(buildOrderCallback("accept", ID).startsWith("lead:")).toBe(false);
    expect(buildOrderCallback("accept", ID).startsWith("inv:")).toBe(false);
  });
});
