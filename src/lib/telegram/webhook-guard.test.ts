import { describe, expect, it } from "vitest";
import { isWebhookConfigured } from "./webhook-guard";

describe("isWebhookConfigured", () => {
  it("is false when no webhook is set", () => {
    expect(isWebhookConfigured({})).toBe(false);
    expect(isWebhookConfigured({ url: "" })).toBe(false);
  });

  it("is true when a webhook url is set", () => {
    expect(isWebhookConfigured({ url: "https://skorouvas.cz/api/telegram/dispatch" })).toBe(true);
  });
});
