import { describe, expect, it } from "vitest";
import { parseNewsletter } from "./schema";

describe("parseNewsletter", () => {
  it("accepts a valid email with consent and normalises it", () => {
    expect(parseNewsletter({ email: "  Office@Firma.CZ ", consent: "on" })).toEqual({
      ok: true,
      email: "office@firma.cz",
    });
  });

  it("rejects an empty or malformed email", () => {
    expect(parseNewsletter({ email: "", consent: "on" })).toEqual({ ok: false, code: "invalid_email" });
    expect(parseNewsletter({ email: "firma.cz", consent: "on" })).toEqual({ ok: false, code: "invalid_email" });
  });

  it("requires consent", () => {
    expect(parseNewsletter({ email: "office@firma.cz", consent: "" })).toEqual({
      ok: false,
      code: "consent_required",
    });
  });

  it("reports the email first when both are wrong", () => {
    expect(parseNewsletter({ email: "x", consent: "" })).toEqual({ ok: false, code: "invalid_email" });
  });
});
