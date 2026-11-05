import { describe, expect, it } from "vitest";
import { isWebhookConfigured, leavesProdWebhook } from "./webhook-guard";

describe("isWebhookConfigured", () => {
  it("is false when no webhook is set", () => {
    expect(isWebhookConfigured({})).toBe(false);
    expect(isWebhookConfigured({ url: "" })).toBe(false);
  });

  it("is true when a webhook url is set", () => {
    expect(isWebhookConfigured({ url: "https://skorouvas.cz/api/telegram/dispatch" })).toBe(true);
  });
});

describe("leavesProdWebhook", () => {
  const PROD = "https://skorouvas.cz/api/telegram/dispatch";
  const PREVIEW = "https://skoro-git-branch.vercel.app/api/telegram/dispatch?x-vercel-protection-bypass=s";

  it("detects moving a production webhook elsewhere", () => {
    expect(leavesProdWebhook(PROD, PREVIEW)).toBe(true);
  });

  it("detects removing a production webhook", () => {
    expect(leavesProdWebhook(PROD, null)).toBe(true);
  });

  it("allows setting the production webhook again", () => {
    expect(leavesProdWebhook(PROD, PROD)).toBe(false);
  });

  it("allows anything for a bot that is not on production", () => {
    expect(leavesProdWebhook(undefined, PREVIEW)).toBe(false);
    expect(leavesProdWebhook("", PREVIEW)).toBe(false);
    expect(leavesProdWebhook(PREVIEW, null)).toBe(false);
    expect(leavesProdWebhook(PREVIEW, PROD)).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(leavesProdWebhook("https://skorouvas.cz.example.test/x", PREVIEW)).toBe(false);
  });
});
