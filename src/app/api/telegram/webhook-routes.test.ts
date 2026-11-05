import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telegram/bot", () => ({ createBot: vi.fn(() => ({})) }));
vi.mock("@/lib/telegram/client/bot", () => ({ createClientBot: vi.fn(() => ({})) }));
vi.mock("grammy", () => ({
  webhookCallback: vi.fn(() => async () => new Response(null, { status: 200 })),
}));

import { POST as clientPost } from "./client/route";
import { POST as dispatchPost } from "./dispatch/route";

const SERVICE_SECRET = "service-secret";
const CLIENT_SECRET = "client-secret";

function requestWith(secret?: string): Request {
  return new Request("https://example.test/webhook", {
    method: "POST",
    headers: secret ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {},
  });
}

describe.each([
  { name: "service route", post: dispatchPost, own: SERVICE_SECRET, other: CLIENT_SECRET, env: "TELEGRAM_WEBHOOK_SECRET" },
  { name: "client route", post: clientPost, own: CLIENT_SECRET, other: SERVICE_SECRET, env: "TELEGRAM_CLIENT_WEBHOOK_SECRET" },
])("$name", ({ post, own, other, env }) => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SERVICE_SECRET);
    vi.stubEnv("TELEGRAM_CLIENT_WEBHOOK_SECRET", CLIENT_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts its own secret", async () => {
    expect((await post(requestWith(own))).status).toBe(200);
  });

  it("rejects the other bot's secret", async () => {
    expect((await post(requestWith(other))).status).toBe(401);
  });

  it("rejects a request without a secret", async () => {
    expect((await post(requestWith())).status).toBe(401);
  });

  it("rejects everything when its secret is not configured", async () => {
    vi.stubEnv(env, "");
    expect((await post(requestWith(own))).status).toBe(401);
  });
});
