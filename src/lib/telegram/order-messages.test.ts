import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = {
  sendMessage: vi.fn(async () => ({ message_id: 55, chat: { id: -100 } })),
  sendPhoto: vi.fn(async () => ({})),
};
vi.mock("./bot-api.ts", () => ({ botApi: vi.fn(() => api) }));

import type { PlacedOrder } from "../orders/place-order";
import { botApi } from "./bot-api.ts";
import { parseOrderCallback } from "./order-callback";
import {
  buildOrderKeyboard,
  formatOrderCard,
  sendOrderCard,
  sendOrderReceived,
  sendTariffAlert,
} from "./order-messages";

const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const ORDER: PlacedOrder = {
  id: ORDER_ID,
  number: 12,
  optionName: "Доставка по городу",
  clientName: "Клиент <А>",
  contactName: "Анна",
  contactPhone: "+420777000111",
  summary: [
    { field: "pickup", label: "Откуда", value: "Склад, Brno" },
    { field: "deliveryAddress", label: "Куда", value: "Brno & Co" },
    { field: "comment", label: "Комментарий по заказу", value: "x".repeat(1500) },
  ],
  slotLabel: "Экспресс",
  total: 220,
  paymentMethod: "invoice",
};

beforeEach(() => vi.stubEnv("TELEGRAM_CHAT_ID", "-100"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("formatOrderCard", () => {
  const card = formatOrderCard(ORDER);

  it("shows the number, option, client, contact, summary, slot, price and payment", () => {
    expect(card).toContain("<b>Новый заказ №12 · Доставка по городу</b>");
    expect(card).toContain('Контакт: Анна, <a href="tel:+420777000111">+420777000111</a>');
    expect(card).toContain("Откуда: Склад, Brno");
    expect(card).toContain("Слот: Экспресс · Цена: 220 Kč");
    expect(card).toContain("Оплата: по счёту");
    expect(card).toContain(`ID: ${ORDER_ID}`);
  });

  it("escapes data", () => {
    expect(card).toContain("Клиент: Клиент &lt;А&gt;");
    expect(card).toContain("Куда: Brno &amp; Co");
  });

  it("fits a long comment into the Telegram limit", () => {
    expect(card.length).toBeLessThan(4096);
    expect(card).toContain("…");
  });
});

describe("buildOrderKeyboard", () => {
  it("offers accept and decline for this order", () => {
    const [[accept, decline]] = buildOrderKeyboard(ORDER_ID).inline_keyboard;
    expect(accept.text).toBe("✅ Принять");
    expect(parseOrderCallback(accept.callback_data)).toEqual({ action: "accept", orderId: ORDER_ID });
    expect(parseOrderCallback(decline.callback_data)).toEqual({ action: "decline", orderId: ORDER_ID });
  });
});

describe("sendOrderCard", () => {
  it("posts the card from the service bot with buttons and returns where it is", async () => {
    expect(await sendOrderCard(ORDER)).toEqual({ chatId: -100, messageId: 55 });
    expect(botApi).toHaveBeenCalledWith("service");
    expect(api.sendMessage).toHaveBeenCalledWith(
      "-100",
      expect.stringContaining("Новый заказ №12"),
      expect.objectContaining({ parse_mode: "HTML", reply_markup: buildOrderKeyboard(ORDER_ID) }),
    );
    expect(api.sendPhoto).not.toHaveBeenCalled();
  });

  it("sends the photo as a reply to the card", async () => {
    await sendOrderCard(ORDER, { bytes: new Uint8Array([0xff, 0xd8, 0xff]), type: "image/jpeg" });
    expect(api.sendPhoto).toHaveBeenCalledWith("-100", expect.anything(), { reply_parameters: { message_id: 55 } });
  });

  it("keeps the card when the photo fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    api.sendPhoto.mockRejectedValueOnce(new Error("too big"));
    await expect(
      sendOrderCard(ORDER, { bytes: new Uint8Array([0xff, 0xd8, 0xff]), type: "image/jpeg" }),
    ).resolves.toEqual({ chatId: -100, messageId: 55 });
    error.mockRestore();
  });

  it("fails without a group to post to", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    await expect(sendOrderCard(ORDER)).rejects.toThrow("TELEGRAM_CHAT_ID");
  });
});

describe("client and admin messages", () => {
  it("tells the client from the client bot", async () => {
    await sendOrderReceived(42, 12);
    expect(botApi).toHaveBeenCalledWith("client");
    expect(api.sendMessage).toHaveBeenCalledWith(42, "Заказ №12 получен, ждёт подтверждения");
  });

  it("alerts the group about a broken tariff from the service bot", async () => {
    await sendTariffAlert("Клиент А", "Доставка по городу");
    expect(botApi).toHaveBeenCalledWith("service");
    expect(api.sendMessage).toHaveBeenCalledWith("-100", expect.stringContaining("клиент «Клиент А», опция «Доставка по городу»"));
  });
});
