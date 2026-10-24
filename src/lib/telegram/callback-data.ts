/**
 * callback_data кнопок: `lead:<action>:<uuid>`. Лимит Telegram — 64 байта;
 * `lead:email:` + uuid = 47.
 */

/** Действия, меняющие статус заявки. */
export const LEAD_ACTIONS = ["take", "spam"] as const;
export type LeadAction = (typeof LEAD_ACTIONS)[number];

/** Все кнопки под заявкой: смена статуса и повтор письма клиенту. */
export const CALLBACK_ACTIONS = [...LEAD_ACTIONS, "email"] as const;
export type CallbackAction = (typeof CALLBACK_ACTIONS)[number];

export type ParsedCallback = {
  kind: "lead";
  action: CallbackAction;
  leadId: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildLeadCallback(action: CallbackAction, leadId: string): string {
  return `lead:${action}:${leadId}`;
}

/** null — данные не наши или повреждены. */
export function parseCallbackData(data: string | undefined): ParsedCallback | null {
  if (!data) return null;
  const [kind, action, leadId, ...rest] = data.split(":");
  if (kind !== "lead" || rest.length > 0) return null;
  if (!CALLBACK_ACTIONS.includes(action as CallbackAction)) return null;
  if (!leadId || !UUID_RE.test(leadId)) return null;
  return { kind: "lead", action: action as CallbackAction, leadId: leadId.toLowerCase() };
}
