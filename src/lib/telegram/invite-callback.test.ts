import { describe, expect, it } from "vitest";
import { buildInviteCallback, parseInviteCallback } from "./invite-callback";

const ID = "11111111-1111-4111-8111-111111111111";

describe("invite callback data", () => {
  it.each(["new", "unlink"] as const)("round-trips %s", (action) => {
    expect(parseInviteCallback(buildInviteCallback(action, ID))).toEqual({ action, contactId: ID });
  });

  it("fits the Telegram limit of 64 bytes", () => {
    expect(Buffer.byteLength(buildInviteCallback("unlink", ID))).toBeLessThanOrEqual(64);
  });

  it("normalizes the uuid case", () => {
    expect(parseInviteCallback(`inv:new:${ID.toUpperCase().replace("1", "A")}`)?.contactId).toBe(ID.replace("1", "a"));
  });

  it.each([
    undefined,
    "",
    "inv",
    "inv:new",
    "inv:new:",
    "inv:new:abc",
    "inv:drop:" + ID,
    "lead:new:" + ID,
    `inv:new:${ID}:extra`,
  ])("rejects %s", (data) => {
    expect(parseInviteCallback(data)).toBeNull();
  });
});
