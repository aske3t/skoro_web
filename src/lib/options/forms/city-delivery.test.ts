import { describe, expect, it } from "vitest";
import { cityDelivery } from "./city-delivery";
import { getFormFieldErrors, getFormKind } from "./index";

const LOCATION = "11111111-1111-4111-8111-111111111111";
const BASE = { pickupAddress: "Brno, Česká 1", deliveryAddress: "Brno, Veveří 2" };

const parse = (input: Record<string, unknown>) => cityDelivery.schema.safeParse(input);

function errorsOf(input: Record<string, unknown>) {
  const result = parse(input);
  if (result.success) throw new Error("expected a validation error");
  return getFormFieldErrors(result.error);
}

function valuesOf(input: Record<string, unknown>) {
  const result = parse(input);
  if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  return result.data;
}

describe("city_delivery schema", () => {
  it("accepts the minimal form as soon as possible", () => {
    expect(valuesOf(BASE)).toEqual({
      pickupLocationId: null,
      pickupAddress: "Brno, Česká 1",
      deliveryAddress: "Brno, Veveří 2",
      recipientName: null,
      recipientPhone: null,
      deliveryAt: null,
      comment: null,
    });
  });

  it("trims text and turns empty optional fields into null", () => {
    const values = valuesOf({ ...BASE, deliveryAddress: "  Brno, Veveří 2 ", recipientName: "   ", comment: "" });
    expect(values.deliveryAddress).toBe("Brno, Veveří 2");
    expect(values.recipientName).toBeNull();
    expect(values.comment).toBeNull();
  });

  describe("pickup", () => {
    it("accepts a client location instead of an address", () => {
      const values = valuesOf({ pickupLocationId: LOCATION, deliveryAddress: "Brno, Veveří 2" });
      expect(values.pickupLocationId).toBe(LOCATION);
      expect(values.pickupAddress).toBeNull();
    });

    it("prefers the location when both are sent", () => {
      expect(valuesOf({ ...BASE, pickupLocationId: LOCATION }).pickupAddress).toBeNull();
    });

    it("requires one of the two", () => {
      expect(errorsOf({ deliveryAddress: "Brno" })).toEqual({ pickupAddress: "required" });
    });

    it("rejects a location that is not a uuid", () => {
      expect(errorsOf({ ...BASE, pickupLocationId: "office" })).toEqual({ pickupLocationId: "invalid" });
    });
  });

  it("requires the delivery address", () => {
    expect(errorsOf({ pickupAddress: "Brno" })).toEqual({ deliveryAddress: "required" });
  });

  it("reuses the phone rule from leads", () => {
    expect(valuesOf({ ...BASE, recipientPhone: "777 123 456" }).recipientPhone).toBe("+420777123456");
    expect(errorsOf({ ...BASE, recipientPhone: "123" })).toEqual({ recipientPhone: "invalid" });
  });

  it("reuses the length limits from leads", () => {
    expect(errorsOf({ ...BASE, deliveryAddress: "x".repeat(301) })).toEqual({ deliveryAddress: "too_long" });
    expect(errorsOf({ ...BASE, recipientName: "x".repeat(101) })).toEqual({ recipientName: "too_long" });
    expect(errorsOf({ ...BASE, comment: "x".repeat(4001) })).toEqual({ comment: "too_long" });
  });

  describe("delivery time", () => {
    it("reads the time as Prague time", () => {
      const values = valuesOf({ ...BASE, deliveryMode: "at", deliveryAt: "2026-07-15T12:00" });
      expect(values.deliveryAt?.toISOString()).toBe("2026-07-15T10:00:00.000Z");
    });

    it("ignores the time when the mode is as soon as possible", () => {
      expect(valuesOf({ ...BASE, deliveryMode: "asap", deliveryAt: "2026-07-15T12:00" }).deliveryAt).toBeNull();
    });

    it("requires the time in the at mode", () => {
      expect(errorsOf({ ...BASE, deliveryMode: "at" })).toEqual({ deliveryAt: "required" });
    });

    it("rejects a time that cannot be read or does not exist", () => {
      expect(errorsOf({ ...BASE, deliveryMode: "at", deliveryAt: "tomorrow" })).toEqual({ deliveryAt: "invalid" });
      expect(errorsOf({ ...BASE, deliveryMode: "at", deliveryAt: "2026-03-29T02:30" })).toEqual({ deliveryAt: "invalid" });
    });

    it("rejects an unknown mode", () => {
      expect(errorsOf({ ...BASE, deliveryMode: "tomorrow" })).toEqual({ deliveryMode: "invalid" });
    });
  });
});

describe("city_delivery tariff request", () => {
  it("passes the slot and the pickup location", () => {
    const values = valuesOf({ pickupLocationId: LOCATION, deliveryAddress: "Brno" });
    expect(cityDelivery.toTariffRequest(values, "express")).toEqual({ slotSlug: "express", locationId: LOCATION });
  });

  it("has no location for a typed address", () => {
    expect(cityDelivery.toTariffRequest(valuesOf(BASE), "slot_day")).toEqual({ slotSlug: "slot_day", locationId: null });
  });
});

describe("city_delivery summary", () => {
  const noLocation = { pickupLocationName: null };

  it("shows only what was filled", () => {
    expect(cityDelivery.summarize(valuesOf(BASE), noLocation)).toEqual([
      { field: "pickup", label: "Откуда", value: "Brno, Česká 1" },
      { field: "deliveryAddress", label: "Куда", value: "Brno, Veveří 2" },
      { field: "deliveryTime", label: "Когда доставить", value: "Как можно скорее" },
    ]);
  });

  it("shows everything for a full form", () => {
    const values = valuesOf({
      pickupLocationId: LOCATION,
      deliveryAddress: "Brno",
      recipientName: "Иван",
      recipientPhone: "+420777123456",
      deliveryMode: "at",
      deliveryAt: "2026-07-15T12:05",
      comment: "Позвонить заранее",
    });
    expect(cityDelivery.summarize(values, { pickupLocationName: "Склад" })).toEqual([
      { field: "pickup", label: "Откуда", value: "Склад" },
      { field: "deliveryAddress", label: "Куда", value: "Brno" },
      { field: "deliveryTime", label: "Когда доставить", value: "15.07.2026, 12:05" },
      { field: "recipientName", label: "Имя получателя", value: "Иван" },
      { field: "recipientPhone", label: "Телефон получателя", value: "+420777123456" },
      { field: "comment", label: "Комментарий по заказу", value: "Позвонить заранее" },
    ]);
  });
});

describe("city_delivery defaults", () => {
  it("accepts a fixed pickup point", () => {
    expect(cityDelivery.defaultsSchema.safeParse({ pickupLocationId: LOCATION }).success).toBe(true);
    expect(cityDelivery.defaultsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a typo instead of ignoring it", () => {
    expect(cityDelivery.defaultsSchema.safeParse({ pickup_location: LOCATION }).success).toBe(false);
    expect(cityDelivery.defaultsSchema.safeParse({ pickupLocationId: "office" }).success).toBe(false);
  });
});

describe("registry", () => {
  it("finds city_delivery", () => {
    expect(getFormKind("city_delivery")?.fields.map((f) => f.name)).toContain("deliveryAddress");
  });

  it.each(["unknown", "", "constructor"])("has no form kind %s", (kind) => {
    expect(getFormKind(kind)).toBeNull();
  });
});
