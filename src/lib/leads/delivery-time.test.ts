import { describe, expect, it } from "vitest";
import { evaluateDeliveryTime } from "./delivery-time";
import { getFieldErrors, leadSchema } from "./schema";

const DATA = {
  slots: [
    { label: "В течение дня", max_lead_minutes: null },
    { label: "Экспресс", max_lead_minutes: 60 },
    { label: "За 3 часа", max_lead_minutes: 180 },
  ],
  hours: { operating_start_minute: 360, operating_end_minute: 1440 },
};

// 12:00 по Праге (зимнее время).
const NOW = new Date("2026-11-05T11:00:00Z");

describe("evaluateDeliveryTime", () => {
  it("names the slot for a time in working hours", () => {
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-05T11:30:00Z"), DATA)).toEqual({ status: "ok", slotLabel: "Экспресс" });
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-05T13:00:00Z"), DATA)).toEqual({ status: "ok", slotLabel: "За 3 часа" });
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-05T16:00:00Z"), DATA)).toEqual({ status: "ok", slotLabel: "В течение дня" });
  });

  it("rejects a time in the past", () => {
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-05T10:59:00Z"), DATA)).toEqual({ status: "past" });
  });

  it("rejects a time outside working hours", () => {
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-06T02:00:00Z"), DATA)).toEqual({ status: "outside_hours" });
  });

  it("reports when no slot fits", () => {
    expect(evaluateDeliveryTime(NOW, new Date("2026-11-05T12:00:00Z"), { ...DATA, slots: [] })).toEqual({ status: "no_slot" });
  });
});

describe("leadSchema delivery time", () => {
  const delivery = {
    kind: "delivery",
    firstName: "Иван",
    lastName: "",
    email: "ivan@example.com",
    phone: "777123456",
    message: "",
    pickupAddress: "Brno, Česká 1",
    deliveryAddress: "Brno, Veveří 2",
    paymentMethod: "cash",
    customerType: "person",
  };

  const parse = (input: Record<string, unknown>) => leadSchema.safeParse({ ...delivery, ...input });
  const errorsOf = (input: Record<string, unknown>) => {
    const result = parse(input);
    if (result.success) throw new Error("expected validation to fail");
    return getFieldErrors(result.error);
  };

  it("means as soon as possible when the fields are absent or empty", () => {
    expect(parse({}).data?.deliveryAt).toBeNull();
    expect(parse({ deliveryMode: "", deliveryAt: "" }).data?.deliveryAt).toBeNull();
    expect(parse({ deliveryMode: "asap" }).data?.deliveryAt).toBeNull();
  });

  it("ignores a time left over in the as soon as possible mode", () => {
    expect(parse({ deliveryMode: "asap", deliveryAt: "2026-07-15T12:00" }).data?.deliveryAt).toBeNull();
  });

  it("reads the chosen time as Prague time", () => {
    const result = parse({ deliveryMode: "at", deliveryAt: "2026-07-15T12:00" });
    expect(result.data?.deliveryAt?.toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("does not put the mode into the parsed lead", () => {
    expect(parse({ deliveryMode: "at", deliveryAt: "2026-07-15T12:00" }).data).not.toHaveProperty("deliveryMode");
  });

  it("requires the time in the at mode", () => {
    expect(errorsOf({ deliveryMode: "at" })).toEqual({ deliveryAt: "required" });
    expect(errorsOf({ deliveryMode: "at", deliveryAt: "  " })).toEqual({ deliveryAt: "required" });
  });

  it("rejects a time that cannot be read or does not exist", () => {
    expect(errorsOf({ deliveryMode: "at", deliveryAt: "tomorrow" })).toEqual({ deliveryAt: "invalid" });
    expect(errorsOf({ deliveryMode: "at", deliveryAt: "2026-03-29T02:30" })).toEqual({ deliveryAt: "invalid" });
  });

  it("rejects an unknown mode", () => {
    expect(errorsOf({ deliveryMode: "tomorrow" })).toEqual({ deliveryAt: "invalid" });
  });

  it("drops the time for a question", () => {
    const result = parse({ kind: "question", message: "Вопрос", deliveryMode: "at", deliveryAt: "2026-07-15T12:00" });
    expect(result.data?.deliveryAt).toBeNull();
  });
});
