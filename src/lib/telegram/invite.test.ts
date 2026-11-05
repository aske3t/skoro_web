import { describe, expect, it } from "vitest";
import {
  buildInviteLink,
  generateInviteToken,
  hashInviteToken,
  inviteExpiry,
  isInviteExpired,
  parseInviteStart,
} from "./invite";

describe("generateInviteToken", () => {
  it("makes 32 hex characters, different each time", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(generateInviteToken()).not.toBe(token);
  });
});

describe("hashInviteToken", () => {
  it("is SHA-256 in hex", () => {
    expect(hashInviteToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("invite link", () => {
  it("round-trips through the start parameter", () => {
    const token = generateInviteToken();
    const link = new URL(buildInviteLink("skoro_client_bot", token));
    expect(link.origin + link.pathname).toBe("https://t.me/skoro_client_bot");
    expect(parseInviteStart(link.searchParams.get("start"))).toBe(token);
  });

  it("fits the Telegram limit for a start parameter", () => {
    const start = new URL(buildInviteLink("bot", generateInviteToken())).searchParams.get("start") ?? "";
    expect(start).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
});

describe("parseInviteStart", () => {
  it.each([
    [undefined],
    [null],
    [""],
    ["hello"],
    ["inv_"],
    ["inv_abc"],
    [`inv_${"a".repeat(31)}`],
    [`inv_${"a".repeat(33)}`],
    [`inv_${"A".repeat(32)}`],
    [`inv_${"g".repeat(32)}`],
    [`xinv_${"a".repeat(32)}`],
  ])("rejects %s", (payload) => {
    expect(parseInviteStart(payload)).toBeNull();
  });
});

describe("invite expiry", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("lasts seven days", () => {
    expect(inviteExpiry(now).toISOString()).toBe("2026-11-12T12:00:00.000Z");
  });

  it("expires exactly at the deadline", () => {
    const expiresAt = inviteExpiry(now);
    expect(isInviteExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false);
    expect(isInviteExpired(expiresAt, expiresAt)).toBe(true);
  });
});
