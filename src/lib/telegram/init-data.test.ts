import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyInitData } from "./init-data";

const CLIENT_TOKEN = "123456:client-test-token";
const SERVICE_TOKEN = "654321:service-test-token";
const NOW = new Date("2026-11-05T12:00:00Z");
const NOW_SECONDS = NOW.getTime() / 1000;
const USER = { id: 42, first_name: "Иван", username: "ivan" };

/** Подпись по алгоритму из документации Telegram, независимо от проверяемого кода. */
function sign(fields: Record<string, string>, token: string): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

const fields = (overrides: Record<string, string> = {}) => ({
  auth_date: String(NOW_SECONDS - 60),
  query_id: "AAH",
  user: JSON.stringify(USER),
  ...overrides,
});

describe("verifyInitData", () => {
  it("accepts data signed by the bot", () => {
    const result = verifyInitData(sign(fields(), CLIENT_TOKEN), CLIENT_TOKEN, NOW);
    expect(result).toEqual({
      ok: true,
      user: USER,
      authDate: new Date((NOW_SECONDS - 60) * 1000),
      startParam: null,
    });
  });

  it("keeps signature in the checked string", () => {
    const data = sign(fields({ signature: "c2lnbmF0dXJl" }), CLIENT_TOKEN);
    expect(verifyInitData(data, CLIENT_TOKEN, NOW).ok).toBe(true);
  });

  it("returns the start parameter", () => {
    const data = sign(fields({ start_param: "order" }), CLIENT_TOKEN);
    expect(verifyInitData(data, CLIENT_TOKEN, NOW)).toMatchObject({ ok: true, startParam: "order" });
  });

  it("rejects data signed by the service bot", () => {
    const data = sign(fields(), SERVICE_TOKEN);
    expect(verifyInitData(data, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it("rejects tampered data", () => {
    const params = new URLSearchParams(sign(fields(), CLIENT_TOKEN));
    params.set("user", JSON.stringify({ ...USER, id: 43 }));
    expect(verifyInitData(params.toString(), CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it("rejects an added field", () => {
    const data = `${sign(fields(), CLIENT_TOKEN)}&extra=1`;
    expect(verifyInitData(data, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it.each([
    ["empty data", ""],
    ["no hash", "auth_date=1&user=%7B%7D"],
    ["a short hash", "auth_date=1&hash=abc"],
    ["a non-hex hash", `auth_date=1&hash=${"z".repeat(64)}`],
  ])("rejects %s", (_name, data) => {
    expect(verifyInitData(data, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it("rejects an empty bot token", () => {
    expect(verifyInitData(sign(fields(), ""), "", NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it("accepts data just under 24 hours old and rejects older", () => {
    const fresh = sign(fields({ auth_date: String(NOW_SECONDS - 86_400) }), CLIENT_TOKEN);
    const stale = sign(fields({ auth_date: String(NOW_SECONDS - 86_401) }), CLIENT_TOKEN);
    expect(verifyInitData(fresh, CLIENT_TOKEN, NOW).ok).toBe(true);
    expect(verifyInitData(stale, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "expired" });
  });

  it("allows small clock skew but not a date in the future", () => {
    const skewed = sign(fields({ auth_date: String(NOW_SECONDS + 60) }), CLIENT_TOKEN);
    const future = sign(fields({ auth_date: String(NOW_SECONDS + 3600) }), CLIENT_TOKEN);
    expect(verifyInitData(skewed, CLIENT_TOKEN, NOW).ok).toBe(true);
    expect(verifyInitData(future, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });

  it.each([
    ["no auth_date", { auth_date: "" }],
    ["a text auth_date", { auth_date: "soon" }],
    ["no user", { user: "" }],
    ["a broken user", { user: "{" }],
    ["a user without id", { user: '{"first_name":"Иван"}' }],
    ["a user with a text id", { user: '{"id":"42"}' }],
  ])("rejects a correctly signed payload with %s", (_name, overrides) => {
    const data = sign(fields(overrides), CLIENT_TOKEN);
    expect(verifyInitData(data, CLIENT_TOKEN, NOW)).toEqual({ ok: false, code: "invalid" });
  });
});
