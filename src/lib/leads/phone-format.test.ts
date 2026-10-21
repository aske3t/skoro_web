import { describe, expect, it } from "vitest";
import {
  composePhone,
  countryFlag,
  detectPhoneCountry,
  findPhoneCountry,
  formatPhoneInput,
  withCountryCode,
} from "./phone-format";

describe("formatPhoneInput", () => {
  it("groups an international number by country rules", () => {
    expect(formatPhoneInput("+420777123456")).toBe("+420 777 123 456");
    expect(formatPhoneInput("+380671234567")).toBe("+380 67 123 45 67");
    expect(formatPhoneInput("+49 151 23456789")).toBe("+49 151 2345 6789");
  });

  it("formats while the code is still being typed", () => {
    expect(formatPhoneInput("+")).toBe("+");
    expect(formatPhoneInput("+42")).toBe("+42");
    expect(formatPhoneInput("+420")).toBe("+420");
    expect(formatPhoneInput("+4207")).toBe("+420 7");
  });

  it("treats 00 as an international prefix", () => {
    expect(formatPhoneInput("00420777123456")).toBe("+420 777 123 456");
  });

  it("groups unknown codes by three", () => {
    expect(formatPhoneInput("+1555123456")).toBe("+155 512 345 6");
  });

  it("groups a number without code as Czech", () => {
    expect(formatPhoneInput("777123456")).toBe("777 123 456");
    expect(formatPhoneInput("(777)-123a456")).toBe("777 123 456");
  });
});

describe("detectPhoneCountry", () => {
  it("prefers the longest matching code", () => {
    expect(detectPhoneCountry("+421 901")?.code).toBe("SK");
    expect(detectPhoneCountry("+43 664")?.code).toBe("AT");
    expect(detectPhoneCountry("777 123")).toBeNull();
    expect(detectPhoneCountry("+999")).toBeNull();
  });
});

describe("withCountryCode", () => {
  it("prepends a code to a national number", () => {
    expect(withCountryCode("777 123 456", findPhoneCountry("SK"))).toBe("+421 777 123 456");
    expect(withCountryCode("067 123 45 67", findPhoneCountry("UA"))).toBe("+380 67 123 45 67");
  });

  it("replaces an existing code and keeps the number", () => {
    expect(withCountryCode("+420 777 123 456", findPhoneCountry("SK"))).toBe("+421 777 123 456");
  });

  it("works on an empty field", () => {
    expect(withCountryCode("", findPhoneCountry("PL"))).toBe("+48");
  });
});

describe("composePhone", () => {
  it("adds the Czech code to a number without code", () => {
    expect(composePhone("777 123 456")).toBe("+420 777 123 456");
  });

  it("keeps international input", () => {
    expect(composePhone("+49 30 1234567")).toBe("+49 30 1234567");
  });

  it("returns empty string for empty input", () => {
    expect(composePhone("   ")).toBe("");
  });
});

describe("composePhone + normalizePhone (form → schema)", () => {
  it("produces E.164 for every listed country", async () => {
    const { normalizePhone } = await import("./schema");
    const { PHONE_COUNTRIES } = await import("./constants");
    for (const c of PHONE_COUNTRIES) {
      const typed = withCountryCode("123 456 789", c);
      expect(normalizePhone(composePhone(typed)), c.code).toBe(`${c.dial}123456789`);
    }
  });
});

it("builds flag emoji from a country code", () => {
  expect(countryFlag("CZ")).toBe("🇨🇿");
});
