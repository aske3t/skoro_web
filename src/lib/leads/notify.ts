import type { Tables } from "@/types/database";
import { escapeHtml } from "../html.ts";
import type { PhotoUpload } from "./photo.ts";
import { leadKeyboardFor } from "../telegram/lead-keyboard.ts";

export type LeadNotification = Pick<
  Tables<"leads">,
  | "id"
  | "number"
  | "created_at"
  | "kind"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "message"
  | "utm"
  | "pickup_address"
  | "delivery_address"
  | "recipient_phone"
  | "payment_method"
>;

/** Колонки, нужные для уведомления; тот же список читает бот при правке сообщения. */
export const LEAD_NOTIFICATION_COLUMNS =
  "id, number, created_at, kind, first_name, last_name, email, phone, message, utm, pickup_address, delivery_address, recipient_phone, payment_method" as const;

type LeadNotifier = (
  text: string,
  lead: LeadNotification,
  photo?: PhotoUpload,
) => Promise<void>;

const TELEGRAM_TIMEOUT_MS = 5000;
const TELEGRAM_PHOTO_TIMEOUT_MS = 15000;
const TELEGRAM_TEXT_LIMIT = 4096;
const MESSAGE_PREVIEW_MAX = 3500;
const TIME_ZONE = "Europe/Prague";

const KIND_LABEL: Record<string, string> = {
  delivery: "Доставка",
  question: "Вопрос",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Наличные",
  online: "Оплата на сайте",
};

const PHOTO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Экранирует и обрезает так, чтобы экранированный текст влез в max символов.
 * Резать после экранирования нельзя — можно разорвать сущность вроде &amp;.
 */
function escapeAndTruncate(value: string, max: number): string {
  let out = "";
  for (const char of value) {
    const escaped = escapeHtml(char);
    if (out.length + escaped.length > max) return `${out}…`;
    out += escaped;
  }
  return out;
}

function deliveryLines(lead: LeadNotification): string[] {
  const phoneLink = (phone: string) =>
    `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>`;
  return [
    `Забор: ${lead.pickup_address ? escapeHtml(lead.pickup_address) : "—"}`,
    `Доставка: ${lead.delivery_address ? escapeHtml(lead.delivery_address) : "—"}`,
    `Тел. получателя: ${lead.recipient_phone ? phoneLink(lead.recipient_phone) : "—"}`,
    `Оплата: ${
      lead.payment_method
        ? escapeHtml(PAYMENT_LABEL[lead.payment_method] ?? lead.payment_method)
        : "—"
    }`,
  ];
}

/**
 * `note` — готовый HTML (вызывающий экранирует сам): дописывается в футер,
 * например «кто обработал». Его длина учитывается в лимите Telegram.
 */
export function formatLeadMessage(lead: LeadNotification, note?: string): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const utm =
    lead.utm && typeof lead.utm === "object" && !Array.isArray(lead.utm)
      ? Object.entries(lead.utm)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(", ")
      : "";

  const header = [
    `<b>Новая заявка${lead.number !== null ? ` №${lead.number}` : ""} · ${KIND_LABEL[lead.kind] ?? escapeHtml(lead.kind)}</b>`,
    `Имя: ${name ? escapeHtml(name) : "—"}`,
    `Email: ${escapeHtml(lead.email)}`,
    `Телефон: ${
      lead.phone
        ? `<a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a>`
        : "—"
    }`,
    ...(lead.kind === "delivery" ? deliveryLines(lead) : []),
    `Время: ${dateFormatter.format(new Date(lead.created_at))} (${TIME_ZONE})`,
  ].join("\n");
  const footer = [utm && `UTM: ${escapeHtml(utm)}`, `ID: ${lead.id}`, note]
    .filter(Boolean)
    .join("\n");

  // Остаток лимита Telegram уходит на сообщение, но не больше MESSAGE_PREVIEW_MAX.
  const budget = Math.min(
    MESSAGE_PREVIEW_MAX,
    TELEGRAM_TEXT_LIMIT - header.length - footer.length - 8,
  );
  const message = escapeAndTruncate(lead.message, Math.max(budget, 0));

  return `${header}\n\n${message}\n\n${footer}`;
}

const sendTelegram: LeadNotifier = async (text, lead, photo) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[leads] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set, skipping notification");
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: leadKeyboardFor(lead),
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram API ${response.status}: ${body.slice(0, 200)}`);
  }
  if (!photo) return;

  // Фото — ответом на заявку. Сбой фото не отменяет уже отправленную заявку.
  const sent = (await response.json().catch(() => null)) as {
    result?: { message_id?: number };
  } | null;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append(
    "photo",
    new Blob([photo.bytes as BlobPart], { type: photo.type }),
    `photo.${PHOTO_EXTENSION[photo.type]}`,
  );
  if (sent?.result?.message_id) {
    form.append("reply_parameters", JSON.stringify({ message_id: sent.result.message_id }));
  }

  const photoResponse = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(TELEGRAM_PHOTO_TIMEOUT_MS),
  });
  if (!photoResponse.ok) {
    const body = await photoResponse.text().catch(() => "");
    throw new Error(`Telegram sendPhoto ${photoResponse.status}: ${body.slice(0, 200)}`);
  }
};

// Новые каналы (email и т.п.) добавляются сюда.
const notifiers: LeadNotifier[] = [sendTelegram];

/** Никогда не бросает: лид уже сохранён, сбой уведомления только логируем. */
export async function notifyNewLead(lead: LeadNotification, photo?: PhotoUpload): Promise<void> {
  const text = formatLeadMessage(lead);
  const results = await Promise.allSettled(notifiers.map((notify) => notify(text, lead, photo)));
  for (const result of results) {
    if (result.status === "rejected") {
      const reason = result.reason;
      console.error(
        `[leads] notification failed for lead ${lead.id}:`,
        reason instanceof Error ? reason.message : reason,
      );
    }
  }
}
