import { describe, expect, it } from "vitest";
import { pickSlotAsap, pickSlotForTime } from "./slot";

// Значения из таблицы delivery_slots и service_config (диагностика 2026-11-05).
const SLOTS = [
  { slug: "slot_day", max_lead_minutes: null },
  { slug: "express", max_lead_minutes: 60 },
  { slug: "slot_3h", max_lead_minutes: 180 },
];
const HOURS = { operating_start_minute: 360, operating_end_minute: 1440 };

// 12:00 по Праге (зимнее время).
const NOW = new Date("2026-11-05T11:00:00Z");
const after = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("pickSlotForTime", () => {
  it.each([
    [1, "express"],
    [60, "express"],
    [61, "slot_3h"],
    [180, "slot_3h"],
    [181, "slot_day"],
    [300, "slot_day"],
  ])("picks by lead time: %i min → %s", (minutes, slug) => {
    expect(pickSlotForTime(NOW, after(minutes), SLOTS, HOURS)).toMatchObject({ ok: true, slot: { slug } });
  });

  it("rounds a partial minute up", () => {
    const moment = new Date(NOW.getTime() + 60 * 60_000 + 1);
    expect(pickSlotForTime(NOW, moment, SLOTS, HOURS)).toMatchObject({ slot: { slug: "slot_3h" } });
  });

  it("rejects a time in the past or right now", () => {
    expect(pickSlotForTime(NOW, after(-1), SLOTS, HOURS)).toEqual({ ok: false, code: "slot_past" });
    expect(pickSlotForTime(NOW, NOW, SLOTS, HOURS)).toEqual({ ok: false, code: "slot_past" });
  });

  it("uses Prague working hours: 06:00 is open, 05:59 is not", () => {
    expect(pickSlotForTime(NOW, new Date("2026-11-06T05:00:00Z"), SLOTS, HOURS).ok).toBe(true);
    expect(pickSlotForTime(NOW, new Date("2026-11-06T04:59:00Z"), SLOTS, HOURS)).toEqual({
      ok: false,
      code: "slot_outside_hours",
    });
  });

  it("treats the end of working hours as closed", () => {
    const hours = { operating_start_minute: 360, operating_end_minute: 1200 };
    expect(pickSlotForTime(NOW, new Date("2026-11-05T18:59:00Z"), SLOTS, hours).ok).toBe(true);
    expect(pickSlotForTime(NOW, new Date("2026-11-05T19:00:00Z"), SLOTS, hours)).toEqual({
      ok: false,
      code: "slot_outside_hours",
    });
  });

  it("reports when no slot fits", () => {
    const limited = [{ slug: "express", max_lead_minutes: 60 }];
    expect(pickSlotForTime(NOW, after(61), limited, HOURS)).toEqual({ ok: false, code: "no_slot" });
    expect(pickSlotForTime(NOW, after(10), [], HOURS)).toEqual({ ok: false, code: "no_slot" });
  });
});

describe("pickSlotAsap", () => {
  it("picks the most urgent slot", () => {
    expect(pickSlotAsap(NOW, SLOTS, HOURS)).toMatchObject({ ok: true, slot: { slug: "express" } });
  });

  it("refuses outside working hours", () => {
    expect(pickSlotAsap(new Date("2026-11-05T01:00:00Z"), SLOTS, HOURS)).toEqual({
      ok: false,
      code: "slot_outside_hours",
    });
  });

  it("reports when there are no slots", () => {
    expect(pickSlotAsap(NOW, [], HOURS)).toEqual({ ok: false, code: "no_slot" });
  });
});
