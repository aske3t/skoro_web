import { describe, expect, it } from "vitest";
import { fail, fakeSupabase, hasCall, ok } from "@/test-utils/fake-supabase";
import { listClientOptions, loadClientOption } from "./options";

const OPTION_ID = "11111111-1111-4111-8111-111111111111";

function row(overrides: Record<string, unknown> = {}, service: Record<string, unknown> = {}) {
  return {
    id: OPTION_ID,
    custom_name: null,
    display_order: 0,
    tariff_kind: "slot_table",
    tariff_params: { default: { express: 220 } },
    form_defaults: {},
    active: true,
    ...overrides,
    service_options: { name: "Доставка по городу", form_kind: "city_delivery", active: true, display_order: 0, ...service },
  };
}

describe("listClientOptions", () => {
  it("asks only for the client's active options", async () => {
    const { db, queries } = fakeSupabase([ok([])]);
    await listClientOptions(db, "client-1");
    expect(hasCall(queries[0], "eq", "client_id", "client-1")).toBe(true);
    expect(hasCall(queries[0], "eq", "active", true)).toBe(true);
    expect(hasCall(queries[0], "eq", "service_options.active", true)).toBe(true);
  });

  it("orders by the client's order, then the catalogue's, and prefers the custom name", async () => {
    const { db } = fakeSupabase([
      ok([
        row({ id: "c", display_order: 2 }),
        row({ id: "b", display_order: 1 }, { display_order: 5, name: "Б" }),
        row({ id: "a", display_order: 1, custom_name: "Своя доставка" }, { display_order: 1 }),
      ]),
    ]);
    expect(await listClientOptions(db, "client-1")).toEqual([
      { id: "a", name: "Своя доставка" },
      { id: "b", name: "Б" },
      { id: "c", name: "Доставка по городу" },
    ]);
  });

  it("hides an option whose form kind is not in the code", async () => {
    const { db } = fakeSupabase([ok([row({ id: "a" }), row({ id: "b" }, { form_kind: "furniture" })])]);
    expect((await listClientOptions(db, "client-1")).map((o) => o.id)).toEqual(["a"]);
  });

  it("throws on a database error", async () => {
    await expect(listClientOptions(fakeSupabase([fail()]).db, "client-1")).rejects.toBeTruthy();
  });
});

describe("loadClientOption", () => {
  it("returns the option of this client", async () => {
    const { db, queries } = fakeSupabase([ok(row({ custom_name: "Своя доставка" }))]);
    expect(await loadClientOption(db, "client-1", OPTION_ID)).toEqual({
      id: OPTION_ID,
      name: "Своя доставка",
      formKind: "city_delivery",
      tariffKind: "slot_table",
      tariffParams: { default: { express: 220 } },
      formDefaults: {},
    });
    expect(hasCall(queries[0], "eq", "client_id", "client-1")).toBe(true);
    expect(hasCall(queries[0], "eq", "id", OPTION_ID)).toBe(true);
  });

  it("does not query for an id that is not a uuid", async () => {
    const { db, queries } = fakeSupabase([]);
    expect(await loadClientOption(db, "client-1", "../../admin")).toBeNull();
    expect(queries).toHaveLength(0);
  });

  it("refuses another client's, a switched off or an unknown-form option", async () => {
    expect(await loadClientOption(fakeSupabase([ok(null)]).db, "client-1", OPTION_ID)).toBeNull();
    expect(await loadClientOption(fakeSupabase([ok(row({ active: false }))]).db, "client-1", OPTION_ID)).toBeNull();
    expect(await loadClientOption(fakeSupabase([ok(row({}, { active: false }))]).db, "client-1", OPTION_ID)).toBeNull();
    expect(
      await loadClientOption(fakeSupabase([ok(row({}, { form_kind: "furniture" }))]).db, "client-1", OPTION_ID),
    ).toBeNull();
  });

  it("throws on a database error", async () => {
    await expect(loadClientOption(fakeSupabase([fail()]).db, "client-1", OPTION_ID)).rejects.toBeTruthy();
  });
});
