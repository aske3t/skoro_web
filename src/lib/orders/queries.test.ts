import { describe, expect, it } from "vitest";
import { argsOf, fail, fakeSupabase, hasCall, ok } from "@/test-utils/fake-supabase";
import { listRecentOrders, loadClientLocations, saveOrderMessage } from "./queries";

describe("loadClientLocations", () => {
  it("reads only the client's points", async () => {
    const points = [{ id: "p1", name: "Склад", address: "Brno" }];
    const { db, queries } = fakeSupabase([ok(points)]);
    expect(await loadClientLocations(db, "client-1")).toEqual(points);
    expect(hasCall(queries[0], "eq", "client_id", "client-1")).toBe(true);
  });

  it("throws on a database error", async () => {
    await expect(loadClientLocations(fakeSupabase([fail()]).db, "client-1")).rejects.toBeTruthy();
  });
});

describe("saveOrderMessage", () => {
  it("stores where the card is", async () => {
    const { db, queries } = fakeSupabase([ok(null)]);
    await saveOrderMessage(db, "order-1", -100, 55);
    expect(argsOf(queries[0], "update")).toEqual([{ tg_chat_id: -100, tg_message_id: 55 }]);
    expect(hasCall(queries[0], "eq", "id", "order-1")).toBe(true);
  });

  it("throws on a database error", async () => {
    await expect(saveOrderMessage(fakeSupabase([fail()]).db, "order-1", -100, 55)).rejects.toBeTruthy();
  });
});

describe("listRecentOrders", () => {
  it("lists the newest orders of the client with the option name", async () => {
    const { db, queries } = fakeSupabase([
      ok([
        {
          number: 12,
          scheduled_for: null,
          status: "new",
          price: 220,
          client_options: { custom_name: null, service_options: { name: "Доставка по городу" } },
        },
        {
          number: 11,
          scheduled_for: "2026-07-15T10:05:00Z",
          status: "delivered",
          price: 170,
          client_options: { custom_name: "Своя доставка", service_options: { name: "Доставка по городу" } },
        },
        { number: 10, scheduled_for: null, status: "cancelled", price: null, client_options: null },
      ]),
    ]);
    expect(await listRecentOrders(db, "client-1")).toEqual([
      { number: 12, optionName: "Доставка по городу", scheduledFor: null, status: "new", price: 220 },
      { number: 11, optionName: "Своя доставка", scheduledFor: "2026-07-15T10:05:00Z", status: "delivered", price: 170 },
      { number: 10, optionName: null, scheduledFor: null, status: "cancelled", price: null },
    ]);
    expect(hasCall(queries[0], "eq", "client_id", "client-1")).toBe(true);
    expect(argsOf(queries[0], "order")).toEqual(["created_at", { ascending: false }]);
    expect(argsOf(queries[0], "limit")).toEqual([10]);
  });

  it("throws on a database error", async () => {
    await expect(listRecentOrders(fakeSupabase([fail()]).db, "client-1")).rejects.toBeTruthy();
  });
});
