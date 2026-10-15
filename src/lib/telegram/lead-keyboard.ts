import { buildLeadCallback } from "./callback-data.ts";

export const LEAD_BUTTON_TEXT = {
  take: "✅ Взял в работу",
  spam: "🚫 Спам",
} as const;

/** Кнопки под уведомлением о заявке. */
export function buildLeadKeyboard(leadId: string) {
  return {
    inline_keyboard: [
      [
        { text: LEAD_BUTTON_TEXT.take, callback_data: buildLeadCallback("take", leadId) },
        { text: LEAD_BUTTON_TEXT.spam, callback_data: buildLeadCallback("spam", leadId) },
      ],
    ],
  };
}

/** Кнопки только у заявок на доставку; вопросы уходят в чат без кнопок. */
export function leadKeyboardFor(lead: { id: string; kind: string }) {
  return lead.kind === "delivery" ? buildLeadKeyboard(lead.id) : undefined;
}
