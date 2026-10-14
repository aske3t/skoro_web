import { describe, expect, it } from "vitest";
import { isValidWebhookSecret } from "./webhook-secret";

describe("isValidWebhookSecret", () => {
  it("accepts a matching secret", () => {
    expect(isValidWebhookSecret("s3cret", "s3cret")).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isValidWebhookSecret("wrong", "s3cret")).toBe(false);
  });

  it("rejects a secret of different length", () => {
    expect(isValidWebhookSecret("short", "a-much-longer-secret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidWebhookSecret(null, "s3cret")).toBe(false);
  });

  it("rejects when expected secret is empty", () => {
    expect(isValidWebhookSecret("anything", "")).toBe(false);
  });
});
