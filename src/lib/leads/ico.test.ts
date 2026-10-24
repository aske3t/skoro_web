import { describe, expect, it } from "vitest";
import { isValidIco, normalizeIco } from "./ico";

describe("isValidIco", () => {
  it("accepts real IČO with a correct check digit", () => {
    expect(isValidIco("45274649")).toBe(true); // ČEZ
    expect(isValidIco("27074358")).toBe(true); // Asseco Central Europe
    expect(isValidIco("00006947")).toBe(true); // Ministerstvo financí
  });

  it("handles remainders 0 and 1", () => {
    // 2559664: сумма mod 11 = 0 → контрольная 1
    expect(isValidIco("25596641")).toBe(true);
    expect(isValidIco("25596640")).toBe(false);
    // 1000002: сумма mod 11 = 1 → контрольная 0
    expect(isValidIco("10000020")).toBe(true);
    expect(isValidIco("10000021")).toBe(false);
  });

  it("rejects a wrong check digit and adjacent swaps", () => {
    expect(isValidIco("45274648")).toBe(false);
    expect(isValidIco("45724649")).toBe(false);
  });

  it("rejects wrong length and non-digits", () => {
    expect(isValidIco("4527464")).toBe(false);
    expect(isValidIco("452746490")).toBe(false);
    expect(isValidIco("4527464a")).toBe(false);
  });
});

describe("normalizeIco", () => {
  it("strips spaces and separators", () => {
    expect(normalizeIco(" 452 74 649 ")).toBe("45274649");
    expect(normalizeIco("CZ45274649")).toBe("45274649");
  });
});
