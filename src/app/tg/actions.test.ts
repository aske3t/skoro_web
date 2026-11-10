import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInitData } from "@/test-utils/telegram-init-data";
import type { Json } from "@/types/database";

const afterCallbacks: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: vi.fn((fn: () => unknown) => afterCallbacks.push(fn)) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ db: true })) }));
vi.mock("@/lib/telegram/contacts", () => ({ resolveClientContact: vi.fn() }));
vi.mock("@/lib/orders/options", () => ({ loadClientOption: vi.fn() }));
vi.mock("@/lib/orders/queries", () => ({ loadClientLocations: vi.fn(), saveOrderMessage: vi.fn() }));
vi.mock("@/lib/orders/place-order", () => ({ placeOrder: vi.fn(), previewPrice: vi.fn() }));
vi.mock("@/lib/telegram/order-messages", () => ({
  sendOrderCard: vi.fn(),
  sendOrderReceived: vi.fn(),
  sendTariffAlert: vi.fn(),
}));

import { loadClientOption } from "@/lib/orders/options";
import { placeOrder, previewPrice } from "@/lib/orders/place-order";
import { loadClientLocations, saveOrderMessage } from "@/lib/orders/queries";
import { resolveClientContact } from "@/lib/telegram/contacts";
import { sendOrderCard, sendOrderReceived, sendTariffAlert } from "@/lib/telegram/order-messages";
import { loadOrderForm, previewOrderPrice, submitOptionOrder } from "./actions";

const CLIENT_TOKEN = "123456:client-test-token";
const SERVICE_TOKEN = "654321:service-test-token";
const OPTION_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT = {
  id: "contact-1",
  name: "Анна",
  phone: "+420777000111",
  email: "a@example.test",
  clientId: "client-1",
  clientName: "Клиент А",
  paymentMethod: "invoice",
};
const ORDERING_CONTACT = {
  id: "contact-1",
  name: "Анна",
  phone: "+420777000111",
  clientId: "client-1",
  clientName: "Клиент А",
  paymentMethod: "invoice",
};
const PLACED = {
  id: "order-1",
  number: 12,
  optionName: "Доставка по городу",
  clientName: "Клиент А",
  contactName: "Анна",
  contactPhone: "+420777000111",
  summary: [],
  slotLabel: "Экспресс",
  total: 220,
  paymentMethod: "invoice",
};

const initData = (token = CLIENT_TOKEN) =>
  signInitData(
    { auth_date: String(Math.floor(Date.now() / 1000) - 60), user: JSON.stringify({ id: 42, first_name: "Анна" }) },
    token,
  );

function option(formDefaults: Json = {}) {
  return {
    id: OPTION_ID,
    name: "Доставка по городу",
    formKind: "city_delivery",
    tariffKind: "slot_table",
    tariffParams: {},
    formDefaults,
  };
}

function orderForm(fields: Record<string, string | Blob> = {}, data = initData()): FormData {
  const form = new FormData();
  form.set("initData", data);
  form.set("clientOptionId", OPTION_ID);
  form.set("pickupAddress", "Brno, Česká 1");
  form.set("deliveryAddress", "Brno, Veveří 2");
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

async function runAfter() {
  for (const fn of afterCallbacks.splice(0)) await fn();
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", CLIENT_TOKEN);
  vi.mocked(resolveClientContact).mockResolvedValue({ ok: true, contact: CONTACT });
  vi.mocked(loadClientOption).mockResolvedValue(option());
  vi.mocked(loadClientLocations).mockResolvedValue([{ id: LOCATION_ID, name: "Склад", address: "Brno, Skladová 1" }]);
  vi.mocked(placeOrder).mockResolvedValue({ ok: true, order: PLACED });
  vi.mocked(sendOrderCard).mockResolvedValue({ chatId: -100, messageId: 55 });
  vi.mocked(sendOrderReceived).mockResolvedValue();
  vi.mocked(sendTariffAlert).mockResolvedValue();
  vi.mocked(saveOrderMessage).mockResolvedValue();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  afterCallbacks.length = 0;
});

describe("authorization, shared by every action", () => {
  it.each([
    ["no initData", ""],
    ["something that is not initData", "user=%7B%22id%22%3A42%7D"],
    ["data signed by the service bot", initData(SERVICE_TOKEN)],
  ])("refuses %s without touching the database", async (_name, data) => {
    expect(await loadOrderForm(data, OPTION_ID)).toEqual({ status: "error", code: "unauthorized" });
    expect(await submitOptionOrder(orderForm({}, data))).toEqual({ status: "error", code: "unauthorized" });
    expect(resolveClientContact).not.toHaveBeenCalled();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("refuses tampered data", async () => {
    const params = new URLSearchParams(initData());
    params.set("user", JSON.stringify({ id: 43, first_name: "Чужой" }));
    expect(await loadOrderForm(params.toString(), OPTION_ID)).toEqual({ status: "error", code: "unauthorized" });
  });

  it.each(["not_linked", "client_inactive"] as const)("passes on %s", async (code) => {
    vi.mocked(resolveClientContact).mockResolvedValue({ ok: false, code });
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code });
    expect(await submitOptionOrder(orderForm())).toEqual({ status: "error", code });
  });

  it("reports a missing bot token and a database failure as server errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", "");
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code: "server_error" });

    vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", CLIENT_TOKEN);
    vi.mocked(resolveClientContact).mockRejectedValue(new Error("db down"));
    expect(await submitOptionOrder(orderForm())).toEqual({ status: "error", code: "server_error" });
    error.mockRestore();
  });
});

describe("loadOrderForm", () => {
  it("returns what the form needs", async () => {
    vi.mocked(loadClientOption).mockResolvedValue(option({ pickupLocationId: LOCATION_ID }));
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({
      status: "ok",
      form: {
        clientName: "Клиент А",
        optionName: "Доставка по городу",
        formKind: "city_delivery",
        paymentMethod: "invoice",
        locations: [{ id: LOCATION_ID, name: "Склад", address: "Brno, Skladová 1" }],
        defaults: { pickupLocationId: LOCATION_ID },
      },
    });
    expect(loadClientOption).toHaveBeenCalledWith(expect.anything(), "client-1", OPTION_ID);
  });

  it("drops a default point that is not the client's", async () => {
    vi.mocked(loadClientOption).mockResolvedValue(option({ pickupLocationId: "44444444-4444-4444-8444-444444444444" }));
    const state = await loadOrderForm(initData(), OPTION_ID);
    expect(state.status === "ok" && state.form.defaults).toEqual({});
  });

  it("ignores broken defaults instead of failing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(loadClientOption).mockResolvedValue(option({ pickup_location: "x" }));
    const state = await loadOrderForm(initData(), OPTION_ID);
    expect(state.status === "ok" && state.form.defaults).toEqual({});
    warn.mockRestore();
  });

  it("refuses an option the client cannot order", async () => {
    vi.mocked(loadClientOption).mockResolvedValue(null);
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code: "option_unavailable" });
  });
});

describe("previewOrderPrice", () => {
  it("passes the inputs and the verified contact", async () => {
    vi.mocked(previewPrice).mockResolvedValue({ ok: true, total: 220, slotLabel: "Экспресс" });
    expect(
      await previewOrderPrice(initData(), OPTION_ID, { deliveryMode: "at", deliveryAt: "2026-11-05T14:30", pickupLocationId: LOCATION_ID }),
    ).toEqual({ status: "ok", total: 220, slotLabel: "Экспресс" });
    expect(previewPrice).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contact: ORDERING_CONTACT,
        clientOptionId: OPTION_ID,
        deliveryMode: "at",
        deliveryAt: "2026-11-05T14:30",
        pickupLocationId: LOCATION_ID,
      }),
    );
  });

  it("passes on the error code", async () => {
    vi.mocked(previewPrice).mockResolvedValue({ ok: false, code: "slot_outside_hours" });
    expect(await previewOrderPrice(initData(), OPTION_ID, { deliveryMode: "asap", deliveryAt: "", pickupLocationId: "" })).toEqual({
      status: "error",
      code: "slot_outside_hours",
    });
  });
});

describe("submitOptionOrder", () => {
  it("places the order with the form fields only and the verified contact", async () => {
    expect(await submitOptionOrder(orderForm({ comment: "Этаж 3" }))).toEqual({ status: "ok", number: 12, total: 220 });
    expect(placeOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contact: ORDERING_CONTACT,
        clientOptionId: OPTION_ID,
        createdVia: "bot",
        rawForm: { pickupAddress: "Brno, Česká 1", deliveryAddress: "Brno, Veveří 2", comment: "Этаж 3" },
      }),
    );
  });

  it("then posts the card, saves where it is and tells the client", async () => {
    await submitOptionOrder(orderForm());
    expect(sendOrderCard).not.toHaveBeenCalled();
    await runAfter();
    expect(sendOrderCard).toHaveBeenCalledWith(PLACED, undefined);
    expect(saveOrderMessage).toHaveBeenCalledWith(expect.anything(), "order-1", -100, 55);
    expect(sendOrderReceived).toHaveBeenCalledWith(42, 12);
  });

  it("still tells the client when the card fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendOrderCard).mockRejectedValue(new Error("telegram down"));
    await submitOptionOrder(orderForm());
    await runAfter();
    expect(saveOrderMessage).not.toHaveBeenCalled();
    expect(sendOrderReceived).toHaveBeenCalledWith(42, 12);
    error.mockRestore();
  });

  it("passes a valid photo to the card", async () => {
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])], "a.jpg", { type: "image/jpeg" });
    await submitOptionOrder(orderForm({ photo: jpeg }));
    await runAfter();
    expect(sendOrderCard).toHaveBeenCalledWith(PLACED, { bytes: expect.any(Uint8Array), type: "image/jpeg" });
  });

  it("refuses a file that is not a photo before placing the order", async () => {
    const text = new File(["hello"], "a.jpg", { type: "image/jpeg" });
    expect(await submitOptionOrder(orderForm({ photo: text }))).toEqual({
      status: "error",
      code: "validation",
      fieldErrors: { photo: "invalid" },
    });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("passes on field errors", async () => {
    vi.mocked(placeOrder).mockResolvedValue({ ok: false, code: "validation", fieldErrors: { deliveryAddress: "required" } });
    expect(await submitOptionOrder(orderForm())).toEqual({
      status: "error",
      code: "validation",
      fieldErrors: { deliveryAddress: "required" },
    });
    await runAfter();
    expect(sendOrderCard).not.toHaveBeenCalled();
  });

  it("alerts the admin about a broken tariff and tells the client", async () => {
    vi.mocked(placeOrder).mockResolvedValue({ ok: false, code: "tariff_invalid", optionName: "Доставка по городу" });
    expect(await submitOptionOrder(orderForm())).toEqual({ status: "error", code: "tariff_invalid", fieldErrors: undefined });
    await runAfter();
    expect(sendTariffAlert).toHaveBeenCalledWith("Клиент А", "Доставка по городу");
    expect(sendOrderCard).not.toHaveBeenCalled();
  });
});
