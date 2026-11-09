import { describe, expect, it } from "vitest";
import { buildAppUrl, buildWebhookUrl, maskUrl } from "./app-url";

const PREVIEW =
  "https://skoro-git-branch.vercel.app?x-vercel-protection-bypass=s3cret&x-vercel-set-bypass-cookie=samesitenone";

describe("buildWebhookUrl", () => {
  it("uses the production address as is", () => {
    expect(buildWebhookUrl("https://skorouvas.cz", "/api/telegram/client")).toBe(
      "https://skorouvas.cz/api/telegram/client",
    );
  });

  it("keeps only the bypass secret, never the redirecting cookie parameter", () => {
    expect(buildWebhookUrl(PREVIEW, "/api/telegram/dispatch")).toBe(
      "https://skoro-git-branch.vercel.app/api/telegram/dispatch?x-vercel-protection-bypass=s3cret",
    );
  });

  it("rejects anything but https without echoing the value", () => {
    expect(() => buildWebhookUrl("http://example.test?x-vercel-protection-bypass=s3cret", "/x")).toThrow(/^(?!.*s3cret)/);
    expect(() => buildWebhookUrl("http://example.test", "/x")).toThrow("https://");
    expect(() => buildWebhookUrl("s3cret", "/x")).toThrow("APP_URL не является адресом");
  });
});

describe("buildAppUrl", () => {
  it("keeps every parameter of APP_URL, including the cookie one", () => {
    expect(buildAppUrl(PREVIEW, "/tg/order/abc")).toBe(
      "https://skoro-git-branch.vercel.app/tg/order/abc?x-vercel-protection-bypass=s3cret&x-vercel-set-bypass-cookie=samesitenone",
    );
  });

  it("uses the production address as is", () => {
    expect(buildAppUrl("https://skorouvas.cz", "/tg/order/abc")).toBe("https://skorouvas.cz/tg/order/abc");
  });

  it("rejects anything but https", () => {
    expect(() => buildAppUrl("http://example.test", "/tg")).toThrow("https://");
  });
});

describe("maskUrl", () => {
  it("hides every parameter value", () => {
    const masked = maskUrl(PREVIEW);
    expect(masked).not.toContain("s3cret");
    expect(masked).toBe(
      "https://skoro-git-branch.vercel.app/?x-vercel-protection-bypass=***&x-vercel-set-bypass-cookie=***",
    );
  });

  it("leaves an address without parameters unchanged", () => {
    expect(maskUrl("https://skorouvas.cz/api/telegram/dispatch")).toBe(
      "https://skorouvas.cz/api/telegram/dispatch",
    );
  });

  it("does not print what it cannot parse", () => {
    expect(maskUrl("not a url s3cret")).toBe("<нераспознанный адрес>");
  });
});
