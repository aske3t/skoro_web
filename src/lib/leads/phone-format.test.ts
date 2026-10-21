import { describe, expect, it } from "vitest";
import { composePhone, findPhoneCountry, formatLocalPhone } from "./phone-format";

describe("formatLocalPhone", () => {
  it("groups Czech numbers 3-3-3", () => {
    expect(formatLocalPhone("777123456", "CZ")).toBe("777 123 456");
    expect(formatLocalPhone("777 12", "CZ")).toBe("777 12");
  });

  it("uses country-specific groups", () => {
    expect(formatLocalPhone("671234567", "UA")).toBe("67 123 45 67");
    expect(formatLocalPhone("15123456789", "DE")).toBe("151 2345 6789");
  });

  it("keeps extra digits as the last group", () => {
    expect(formatLocalPhone("7771234567", "CZ")).toBe("777 123 456 7");
  });

  it("strips non-digits from local input", () => {
    expect(formatLocalPhone("(777)-123a456", "CZ")).toBe("777 123 456");
  });

  it("leaves international input as typed, minus junk", () => {
    expect(formatLocalPhone("+49 30 1234567", "CZ")).toBe("+49 30 1234567");
    expect(formatLocalPhone("+49-30x1", "CZ")).toBe("+49301");
  });
});

describe("composePhone", () => {
  it("prefixes the selected country code", () => {
    expect(composePhone("777 123 456", "CZ")).toBe("+420 777 123 456");
    expect(composePhone("901 123 456", "SK")).toBe("+421 901 123 456");
  });

  it("drops the national trunk zero", () => {
    expect(composePhone("067 123 45 67", "UA")).toBe("+380 67 123 45 67");
  });

  it("ignores the country for international input", () => {
    expect(composePhone("+49 30 1234567", "CZ")).toBe("+49 30 1234567");
    expect(composePhone("00420777123456", "SK")).toBe("00420777123456");
  });

  it("returns empty string for empty input", () => {
    expect(composePhone("   ", "CZ")).toBe("");
  });

  it("falls back to the default country for unknown codes", () => {
    expect(composePhone("777123456", "XX")).toBe("+420 777123456");
    expect(findPhoneCountry(undefined).code).toBe("CZ");
  });
});

describe("composePhone + normalizePhone (form → schema)", () => {
  it("produces E.164 for every listed country example", async () => {
    const { normalizePhone } = await import("./schema");
    const { PHONE_COUNTRIES } = await import("./constants");
    for (const c of PHONE_COUNTRIES) {
      const e164 = normalizePhone(composePhone(c.example, c.code));
      expect(e164, c.code).toBe(c.dial + c.example.replace(/\D/g, ""));
    }
  });
});
