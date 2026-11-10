import { InputFile } from "grammy";
import { escapeHtml } from "../html.ts";
import type { PhotoUpload } from "../leads/photo.ts";
import type { PlacedOrder } from "../orders/place-order.ts";
import { botApi } from "./bot-api.ts";
import { TEXT as CLIENT_TEXT } from "./client/texts.ts";
import { buildOrderCallback } from "./order-callback.ts";

// Сообщения о заказе: карточка в группу «Заявки» шлёт и обрабатывает служебный бот,
// клиенту пишет клиентский (ADR-0006 §4, §6).

const PAYMENT_LABEL: Record<string, string> = {
  invoice: "по счёту",
  cash: "наличными",
};

const PHOTO_EXTENSION: Record<PhotoUpload["type"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Лимит текста Telegram — 4096 символов; длинное поле (комментарий до 4000) режем.
const VALUE_MAX = 1000;

export const ORDER_BUTTON_TEXT = {
  accept: "✅ Принять",
  decline: "❌ Отклонить",
} as const;

function clip(value: string): string {
  const chars = Array.from(value);
  return chars.length > VALUE_MAX ? `${chars.slice(0, VALUE_MAX).join("")}…` : value;
}

export function formatOrderCard(order: PlacedOrder): string {
  const phone = order.contactPhone
    ? `, <a href="tel:${escapeHtml(order.contactPhone)}">${escapeHtml(order.contactPhone)}</a>`
    : "";
  return [
    `<b>Новый заказ${order.number !== null ? ` №${order.number}` : ""} · ${escapeHtml(order.optionName)}</b>`,
    `Клиент: ${escapeHtml(order.clientName)}`,
    `Контакт: ${escapeHtml(order.contactName)}${phone}`,
    ...order.summary.map((line) => `${escapeHtml(line.label)}: ${escapeHtml(clip(line.value))}`),
    `Слот: ${escapeHtml(order.slotLabel)} · Цена: ${order.total} Kč`,
    `Оплата: ${escapeHtml(PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod)}`,
    `ID: ${order.id}`,
  ].join("\n");
}

export function buildOrderKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: ORDER_BUTTON_TEXT.accept, callback_data: buildOrderCallback("accept", orderId) },
        { text: ORDER_BUTTON_TEXT.decline, callback_data: buildOrderCallback("decline", orderId) },
      ],
    ],
  };
}

function groupChatId(): string {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set");
  return chatId;
}

/** Карточка в группу; фото — ответом на неё. Сбой фото не отменяет карточку. */
export async function sendOrderCard(
  order: PlacedOrder,
  photo?: PhotoUpload,
): Promise<{ chatId: number; messageId: number }> {
  const chatId = groupChatId();
  const api = botApi("service");
  const message = await api.sendMessage(chatId, formatOrderCard(order), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: buildOrderKeyboard(order.id),
  });

  if (photo) {
    try {
      await api.sendPhoto(chatId, new InputFile(photo.bytes, `photo.${PHOTO_EXTENSION[photo.type]}`), {
        reply_parameters: { message_id: message.message_id },
      });
    } catch (error) {
      console.error("[telegram] order photo failed:", error instanceof Error ? error.message : error);
    }
  }
  return { chatId: message.chat.id, messageId: message.message_id };
}

/** Клиенту в чат клиентского бота: личный чат с пользователем — это его Telegram id. */
export async function sendOrderReceived(telegramUserId: number, number: number | null): Promise<void> {
  await botApi("client").sendMessage(telegramUserId, CLIENT_TEXT.orderReceived(number));
}

/** Битый тариф: клиент заказать не может, админу — сообщение в группу (ADR-0006 §2). */
export async function sendTariffAlert(clientName: string, optionName: string): Promise<void> {
  await botApi("service").sendMessage(
    groupChatId(),
    `⚠️ Не удалось рассчитать цену: клиент «${clientName}», опция «${optionName}». ` +
      "Клиент видит ошибку и не может оформить заказ. Проверьте tariff_params (docs/ops/clients.md).",
  );
}
