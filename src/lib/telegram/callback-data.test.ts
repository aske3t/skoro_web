import { describe, expect, it } from "vitest";
import { buildLeadCallback, parseCallbackData } from "./callback-data";

const ID = "3f2b8c1e-9a47-4d6b-8e5f-1a2b3c4d5e6f";

describe("callback data", () => {
  it("round-trips both actions", () => {
    expect(parseCallbackData(buildLeadCallback("take", ID))).toEqual({
      kind: "lead",
      action: "take",
      leadId: ID,
    });
    expect(parseCallbackData(buildLeadCallback("spam", ID))?.action).toBe("spam");
    expect(parseCallbackData(buildLeadCallback("email", ID))?.action).toBe("email");
  });

  it("fits the 64-byte Telegram limit", () => {
    for (const action of ["take", "spam", "email"] as const) {
      expect(Buffer.byteLength(buildLeadCallback(action, ID))).toBeLessThanOrEqual(64);
    }
  });

  it("normalises uppercase uuid", () => {
    expect(parseCallbackData(`lead:take:${ID.toUpperCase()}`)?.leadId).toBe(ID);
  });

  it.each([
    undefined,
    "",
    "lead:take",
    "lead:take:not-a-uuid",
    `lead:delete:${ID}`,
    `order:take:${ID}`,
    `lead:take:${ID}:extra`,
  ])("rejects %j", (data) => {
    expect(parseCallbackData(data)).toBeNull();
  });
});
