import { describe, expect, it, vi } from "vitest";
import { lookupIco, parseAresResponse } from "./ares";

const cez = {
  ico: "45274649",
  obchodniJmeno: "ČEZ, a. s.",
  sidlo: { textovaAdresa: "Duhová 1444/2, Michle, 14000 Praha 4" },
  seznamRegistraci: { stavZdrojeRes: "AKTIVNI" },
};

describe("parseAresResponse", () => {
  it("returns name and address for an active company", () => {
    expect(parseAresResponse(200, cez)).toEqual({
      status: "found",
      name: "ČEZ, a. s.",
      address: "Duhová 1444/2, Michle, 14000 Praha 4",
    });
  });

  it("collapses whitespace in the company name", () => {
    const result = parseAresResponse(200, { ...cez, obchodniJmeno: "VIENNA INTERNATIONAL   a.s." });
    expect(result).toMatchObject({ name: "VIENNA INTERNATIONAL a.s." });
  });

  it("treats 404 as not found", () => {
    expect(parseAresResponse(404, { kod: "NENALEZENO" })).toEqual({ status: "not_found" });
  });

  it("detects a dissolved company", () => {
    expect(
      parseAresResponse(200, { ...cez, seznamRegistraci: { stavZdrojeRes: "HISTORICKY" } }),
    ).toEqual({ status: "inactive", name: "ČEZ, a. s." });
    expect(parseAresResponse(200, { ...cez, datumZaniku: "2020-01-01" })).toMatchObject({
      status: "inactive",
    });
  });

  it("treats other responses as unavailable", () => {
    expect(parseAresResponse(500, null)).toEqual({ status: "unavailable" });
    expect(parseAresResponse(200, { kod: "CHYBA" })).toEqual({ status: "unavailable" });
  });
});

describe("lookupIco", () => {
  it("queries ARES by IČO", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(cez), { status: 200 }));
    const result = await lookupIco("45274649", fetchMock as unknown as typeof fetch);
    expect(result.status).toBe("found");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/ekonomicke-subjekty\/45274649$/);
  });

  it("returns unavailable on network errors instead of throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => {
      throw new Error("timeout");
    });
    await expect(lookupIco("45274649", fetchMock as unknown as typeof fetch)).resolves.toEqual({
      status: "unavailable",
    });
    warn.mockRestore();
  });
});
