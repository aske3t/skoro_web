import { describe, expect, it } from "vitest";
import { quoteTariff } from "./index";

const CONTEXT = {
  optionName: "Доставка по городу",
  slots: [
    { slug: "express", label: "Экспресс", base_price: 240 },
    { slug: "slot_3h", label: "За 3 часа", base_price: 180 },
    { slug: "slot_day", label: "В течение дня", base_price: 150 },
  ],
};
const LOCATION = "11111111-1111-4111-8111-111111111111";
const OTHER_LOCATION = "22222222-2222-4222-8222-222222222222";
const INVALID = { ok: false, code: "tariff_invalid" };

const request = (slotSlug: string, locationId: string | null = null) => ({ slotSlug, locationId });

describe("slot_table", () => {
  const params = {
    default: { express: 220, slot_3h: 170 },
    byLocation: { [LOCATION]: { express: 200 } },
  };
  const totalFor = (slotSlug: string, locationId: string | null = null) => {
    const result = quoteTariff("slot_table", params, request(slotSlug, locationId), CONTEXT);
    return result.ok ? result.quote.total : null;
  };

  it("looks up location × slot first", () => {
    expect(totalFor("express", LOCATION)).toBe(200);
  });

  it("falls back to default × slot", () => {
    expect(totalFor("slot_3h", LOCATION)).toBe(170);
    expect(totalFor("express", OTHER_LOCATION)).toBe(220);
    expect(totalFor("express")).toBe(220);
  });

  it("falls back to the base price of the slot", () => {
    expect(totalFor("slot_day")).toBe(150);
    expect(totalFor("slot_day", LOCATION)).toBe(150);
  });

  it("keeps a zero price instead of falling through", () => {
    const result = quoteTariff("slot_table", { default: { express: 0 } }, request("express"), CONTEXT);
    expect(result).toMatchObject({ ok: true, quote: { total: 0 } });
  });

  it("works without byLocation", () => {
    const result = quoteTariff("slot_table", { default: { express: 220 } }, request("express"), CONTEXT);
    expect(result).toMatchObject({ ok: true, quote: { total: 220 } });
  });

  it("returns a full quote for the order snapshot", () => {
    expect(quoteTariff("slot_table", params, request("express"), CONTEXT)).toEqual({
      ok: true,
      quote: {
        total: 220,
        currency: "CZK",
        breakdown: [{ label: "Экспресс", amount: 220 }],
        pricingVersion: "slot_table/1",
      },
    });
  });

  it("gives two clients different prices on the same slot", () => {
    const first = quoteTariff("slot_table", { default: { express: 220 } }, request("express"), CONTEXT);
    const second = quoteTariff("slot_table", { default: { express: 199 } }, request("express"), CONTEXT);
    expect(first).toMatchObject({ quote: { total: 220 } });
    expect(second).toMatchObject({ quote: { total: 199 } });
  });

  it.each([
    ["null", null],
    ["a string", "220"],
    ["no default", {}],
    ["a price as text", { default: { express: "220" } }],
    ["a negative price", { default: { express: -1 } }],
    ["an unknown key", { default: {}, by_location: {} }],
    ["a location that is not a uuid", { default: {}, byLocation: { office: { express: 1 } } }],
    ["a misspelled slot in default", { default: { expres: 220 } }],
    ["a misspelled slot in a location", { default: {}, byLocation: { [LOCATION]: { expres: 200 } } }],
  ])("rejects broken params: %s", (_name, broken) => {
    expect(quoteTariff("slot_table", broken, request("express"), CONTEXT)).toEqual(INVALID);
  });

  it("rejects an unknown slot", () => {
    expect(quoteTariff("slot_table", params, request("night"), CONTEXT)).toEqual(INVALID);
  });
});

describe("flat", () => {
  it("charges the same price on any slot", () => {
    for (const slug of ["express", "slot_day"]) {
      expect(quoteTariff("flat", { price: 500 }, request(slug), CONTEXT)).toEqual({
        ok: true,
        quote: {
          total: 500,
          currency: "CZK",
          breakdown: [{ label: "Доставка по городу", amount: 500 }],
          pricingVersion: "flat/1",
        },
      });
    }
  });

  it.each([
    ["no price", {}],
    ["a negative price", { price: -1 }],
    ["an unknown key", { price: 1, extra: true }],
  ])("rejects broken params: %s", (_name, broken) => {
    expect(quoteTariff("flat", broken, request("express"), CONTEXT)).toEqual(INVALID);
  });
});

describe("registry", () => {
  it.each(["percent", "", "constructor", "__proto__"])("rejects an unknown kind: %s", (kind) => {
    expect(quoteTariff(kind, { price: 1 }, request("express"), CONTEXT)).toEqual(INVALID);
  });
});
