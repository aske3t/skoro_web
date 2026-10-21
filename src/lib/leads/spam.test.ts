import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, hashIp, isFilledTooFast, MIN_FILL_TIME_MS } from "./spam";

describe("isFilledTooFast", () => {
  it("blocks submissions faster than the threshold", () => {
    expect(isFilledTooFast("0")).toBe(true);
    expect(isFilledTooFast(String(MIN_FILL_TIME_MS - 1))).toBe(true);
  });

  it("lets human-speed submissions through", () => {
    expect(isFilledTooFast(String(MIN_FILL_TIME_MS))).toBe(false);
    expect(isFilledTooFast("5000")).toBe(false);
  });

  it("does not block when the field is missing (JS disabled)", () => {
    expect(isFilledTooFast("")).toBe(false);
  });

  it("does not block on garbage values", () => {
    expect(isFilledTooFast("abc")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("takes the first x-forwarded-for address", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  it("returns null without headers", () => {
    expect(getClientIp(new Headers())).toBeNull();
  });
});

describe("hashIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("hashes ip with the salt", () => {
    vi.stubEnv("LEAD_IP_SALT", "salt-a");
    const a = hashIp("203.0.113.7");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    vi.stubEnv("LEAD_IP_SALT", "salt-b");
    expect(hashIp("203.0.113.7")).not.toBe(a);
  });

  it("throws without a salt", () => {
    vi.stubEnv("LEAD_IP_SALT", "");
    expect(() => hashIp("203.0.113.7")).toThrow("LEAD_IP_SALT");
  });
});
