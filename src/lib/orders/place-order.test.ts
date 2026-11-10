import { describe, expect, it, vi } from "vitest";
import { argsOf, fail, fakeSupabase, ok, type QueryResult } from "@/test-utils/fake-supabase";
import { placeOrder, previewPrice, type OrderingContact } from "./place-order";

const OPTION_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";
// 12:00 по Праге (зимнее время).
const NOW = new Date("2026-11-05T11:00:00Z");
const NIGHT = new Date("2026-11-05T02:00:00Z");

const CONTACT: OrderingContact = {
  id: "contact-1",
  name: "Анна",
  phone: "+420777000111",
  clientId: "client-1",
  clientName: "Клиент А",
  paymentMethod: "invoice",
};

const optionRow = (tariff_params: unknown = { default: { express: 220, slot_3h: 170 } }) => ({
  id: OPTION_ID,
  custom_name: null,
  display_order: 0,
  tariff_kind: "slot_table",
  tariff_params,
  form_defaults: {},
  active: true,
  service_options: { name: "Доставка по городу", form_kind: "city_delivery", active: true, display_order: 0 },
});

const SLOTS = [
  { id: "slot-express", slug: "express", label: "Экспресс", base_price: 240, max_lead_minutes: 60, display_order: 1 },
  { id: "slot-3h", slug: "slot_3h", label: "За 3 часа", base_price: 180, max_lead_minutes: 180, display_order: 2 },
  { id: "slot-day", slug: "slot_day", label: "В течение дня", base_price: 150, max_lead_minutes: null, display_order: 3 },
];
const slotData = (): QueryResult[] => [ok(SLOTS), ok({ operating_start_minute: 360, operating_end_minute: 1440 })];
const LOCATIONS = [{ id: LOCATION_ID, name: "Склад", address: "Brno, Skladová 1" }];

const BASE_FORM = { pickupAddress: "Brno, Česká 1", deliveryAddress: "Brno, Veveří 2" };

function input(rawForm: Record<string, string> = BASE_FORM, now = NOW) {
  return { contact: CONTACT, clientOptionId: OPTION_ID, rawForm, createdVia: "bot" as const, now };
}

const rpcArgs = (queries: ReturnType<typeof fakeSupabase>["queries"]) => {
  const call = queries.find((calls) => calls[0][0] === "rpc");
  return call?.[0][2] as Record<string, unknown> | undefined;
};

describe("placeOrder", () => {
  it("creates an order as soon as possible on the most urgent slot at the client's price", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow()), ...slotData(), ok({ id: ORDER_ID, number: 12 })]);
    const result = await placeOrder(db, input());

    expect(result).toMatchObject({
      ok: true,
      order: { id: ORDER_ID, number: 12, total: 220, slotLabel: "Экспресс", optionName: "Доставка по городу" },
    });
    const args = rpcArgs(queries);
    expect(args).toMatchObject({
      p_contact_id: "contact-1",
      p_client_option_id: OPTION_ID,
      p_created_via: "bot",
      p_price: 220,
      p_tariff_kind: "slot_table",
      p_slot_id: "slot-express",
      p_from_address: "Brno, Česká 1",
      p_to_address: "Brno, Veveří 2",
      p_scheduled_for: undefined,
    });
    expect(args?.p_price_breakdown).toMatchObject({ total: 220, currency: "CZK", pricingVersion: "slot_table/1" });
    expect(args?.p_form_data).toMatchObject({
      deliveryAddress: "Brno, Veveří 2",
      deliveryAt: null,
      pickupLocation: null,
      slot: { slug: "express", label: "Экспресс" },
      paymentMethod: "invoice",
    });
  });

  it("uses the chosen time for the slot and stores it", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow()), ...slotData(), ok({ id: ORDER_ID, number: 13 })]);
    // 14:30 по Праге — через 150 минут: слот «За 3 часа».
    const result = await placeOrder(db, input({ ...BASE_FORM, deliveryMode: "at", deliveryAt: "2026-11-05T14:30" }));

    expect(result).toMatchObject({ ok: true, order: { total: 170, slotLabel: "За 3 часа" } });
    expect(rpcArgs(queries)).toMatchObject({ p_slot_id: "slot-3h", p_scheduled_for: "2026-11-05T13:30:00.000Z" });
  });

  it("takes the pickup address and the location price from the client's point", async () => {
    const tariff = { default: { express: 220 }, byLocation: { [LOCATION_ID]: { express: 200 } } };
    const { db, queries } = fakeSupabase([
      ok(optionRow(tariff)),
      ok(LOCATIONS),
      ...slotData(),
      ok({ id: ORDER_ID, number: 14 }),
    ]);
    const result = await placeOrder(db, input({ pickupLocationId: LOCATION_ID, deliveryAddress: "Brno, Veveří 2" }));

    expect(result).toMatchObject({ ok: true, order: { total: 200 } });
    expect(rpcArgs(queries)).toMatchObject({ p_from_address: "Brno, Skladová 1" });
    expect(rpcArgs(queries)?.p_form_data).toMatchObject({ pickupLocation: LOCATIONS[0] });
    if (result.ok) expect(result.order.summary[0]).toMatchObject({ value: "Склад, Brno, Skladová 1" });
  });

  it("refuses a point that is not the client's", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow()), ok([])]);
    const result = await placeOrder(db, input({ pickupLocationId: LOCATION_ID, deliveryAddress: "Brno" }));
    expect(result).toEqual({ ok: false, code: "validation", fieldErrors: { pickupLocationId: "invalid" } });
    expect(rpcArgs(queries)).toBeUndefined();
  });

  it("returns field errors and stops before pricing", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow())]);
    const result = await placeOrder(db, input({ pickupAddress: "Brno" }));
    expect(result).toEqual({ ok: false, code: "validation", fieldErrors: { deliveryAddress: "required" } });
    expect(queries).toHaveLength(1);
  });

  it("refuses an option the client cannot order", async () => {
    expect(await placeOrder(fakeSupabase([ok(null)]).db, input())).toEqual({ ok: false, code: "option_unavailable" });
  });

  it("refuses a time in the past and outside working hours", async () => {
    const past = await placeOrder(
      fakeSupabase([ok(optionRow()), ...slotData()]).db,
      input({ ...BASE_FORM, deliveryMode: "at", deliveryAt: "2026-11-05T11:00" }),
    );
    expect(past).toMatchObject({ ok: false, code: "slot_past" });

    const night = await placeOrder(fakeSupabase([ok(optionRow()), ...slotData()]).db, input(BASE_FORM, NIGHT));
    expect(night).toMatchObject({ ok: false, code: "slot_outside_hours" });
  });

  it("reports a broken tariff with the option name for the admin alert", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow({ default: { expres: 220 } })), ...slotData()]);
    expect(await placeOrder(db, input())).toEqual({
      ok: false,
      code: "tariff_invalid",
      optionName: "Доставка по городу",
    });
    expect(rpcArgs(queries)).toBeUndefined();
  });

  it("reports missing slot data as a server error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await placeOrder(fakeSupabase([ok(optionRow()), fail(), ok(null)]).db, input());
    expect(result).toMatchObject({ ok: false, code: "server_error" });
    error.mockRestore();
  });

  it("maps the codes raised by create_option_order", async () => {
    for (const code of ["not_linked", "client_inactive", "option_unavailable"]) {
      const db = fakeSupabase([ok(optionRow()), ...slotData(), { data: null, error: { message: code } }]).db;
      expect(await placeOrder(db, input())).toEqual({ ok: false, code });
    }

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = fakeSupabase([ok(optionRow()), ...slotData(), { data: null, error: { message: "invalid_price" } }]).db;
    expect(await placeOrder(db, input())).toEqual({ ok: false, code: "server_error" });
    error.mockRestore();
  });
});

describe("previewPrice", () => {
  const preview = (overrides: Partial<Parameters<typeof previewPrice>[1]> = {}) => ({
    contact: CONTACT,
    clientOptionId: OPTION_ID,
    deliveryMode: "asap",
    deliveryAt: "",
    pickupLocationId: "",
    now: NOW,
    ...overrides,
  });

  it("prices as soon as possible", async () => {
    const { db } = fakeSupabase([ok(optionRow()), ...slotData()]);
    expect(await previewPrice(db, preview())).toEqual({ ok: true, total: 220, slotLabel: "Экспресс" });
  });

  it("uses the location price without loading the client's points", async () => {
    const tariff = { default: { express: 220 }, byLocation: { [LOCATION_ID]: { express: 200 } } };
    const { db, queries } = fakeSupabase([ok(optionRow(tariff)), ...slotData()]);
    expect(await previewPrice(db, preview({ pickupLocationId: LOCATION_ID }))).toMatchObject({ ok: true, total: 200 });
    expect(queries.some((calls) => calls[0][1] === "client_locations")).toBe(false);
  });

  it("falls back to the default price for a point that is not in the tariff", async () => {
    const other = "44444444-4444-4444-8444-444444444444";
    const { db } = fakeSupabase([ok(optionRow()), ...slotData()]);
    expect(await previewPrice(db, preview({ pickupLocationId: other }))).toMatchObject({ ok: true, total: 220 });
  });

  it("reports a time it cannot read", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow())]);
    expect(await previewPrice(db, preview({ deliveryMode: "at", deliveryAt: "soon" }))).toEqual({
      ok: false,
      code: "invalid_time",
    });
    expect(queries).toHaveLength(1);
  });

  it("reports the slot and tariff problems", async () => {
    const night = await previewPrice(fakeSupabase([ok(optionRow()), ...slotData()]).db, preview({ now: NIGHT }));
    expect(night).toEqual({ ok: false, code: "slot_outside_hours" });

    const broken = await previewPrice(fakeSupabase([ok(optionRow({ price: 1 })), ...slotData()]).db, preview());
    expect(broken).toEqual({ ok: false, code: "tariff_invalid" });
  });

  it("refuses an option the client cannot order", async () => {
    expect(await previewPrice(fakeSupabase([ok(null)]).db, preview())).toEqual({ ok: false, code: "option_unavailable" });
  });
});

describe("rpc arguments", () => {
  it("leave out empty optional fields", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow()), ...slotData(), ok({ id: ORDER_ID, number: 15 })]);
    await placeOrder(db, input());
    const args = rpcArgs(queries);
    expect(args?.p_recipient_contact).toBeUndefined();
    expect(args?.p_comment).toBeUndefined();
    expect(argsOf(queries[0], "eq")).toEqual(["id", OPTION_ID]);
  });

  it("join the recipient name and phone", async () => {
    const { db, queries } = fakeSupabase([ok(optionRow()), ...slotData(), ok({ id: ORDER_ID, number: 16 })]);
    await placeOrder(db, input({ ...BASE_FORM, recipientName: "Иван", recipientPhone: "0777 123 456", comment: "Этаж 3" }));
    expect(rpcArgs(queries)).toMatchObject({ p_recipient_contact: "Иван, +420777123456", p_comment: "Этаж 3" });
  });
});
