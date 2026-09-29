import type { Tables } from "@/types/database";

export type LeadNotification = Pick<
  Tables<"leads">,
  | "id"
  | "created_at"
  | "kind"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "message"
  | "utm"
>;

type LeadNotifier = (text: string) => Promise<void>;

const TELEGRAM_TIMEOUT_MS = 5000;
const TELEGRAM_TEXT_LIMIT = 4096;
const MESSAGE_PREVIEW_MAX = 3500;
const TIME_ZONE = "Europe/Prague";

const KIND_LABEL: Record<string, string> = {
  delivery: "Доставка",
  question: "Вопрос",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

export function formatLeadMessage(lead: LeadNotification): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const utm =
    lead.utm && typeof lead.utm === "object" && !Array.isArray(lead.utm)
      ? Object.entries(lead.utm)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(", ")
      : "";

  const header = [
    `<b>Новая заявка · ${KIND_LABEL[lead.kind] ?? escapeHtml(lead.kind)}</b>`,
    `Имя: ${name ? escapeHtml(name) : "—"}`,
    `Email: ${escapeHtml(lead.email)}`,
    `Телефон: ${
      lead.phone
        ? `<a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a>`
        : "—"
    }`,
    `Время: ${dateFormatter.format(new Date(lead.created_at))} (${TIME_ZONE})`,
  ].join("\n");
  const footer = [utm && `UTM: ${escapeHtml(utm)}`, `ID: ${lead.id}`]
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

const sendTelegram: LeadNotifier = async (text) => {
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
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram API ${response.status}: ${body.slice(0, 200)}`);
  }
};

// Новые каналы (email и т.п.) добавляются сюда.
const notifiers: LeadNotifier[] = [sendTelegram];

/** Никогда не бросает: лид уже сохранён, сбой уведомления только логируем. */
export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  const text = formatLeadMessage(lead);
  const results = await Promise.allSettled(notifiers.map((notify) => notify(text)));
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
