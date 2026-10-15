/**
 * callback_data кнопок: `lead:<action>:<uuid>`. Лимит Telegram — 64 байта;
 * `lead:take:` + uuid = 46.
 */

export const LEAD_ACTIONS = ["take", "spam"] as const;
export type LeadAction = (typeof LEAD_ACTIONS)[number];

export type ParsedCallback = {
  kind: "lead";
  action: LeadAction;
  leadId: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildLeadCallback(action: LeadAction, leadId: string): string {
  return `lead:${action}:${leadId}`;
}

/** null — данные не наши или повреждены. */
export function parseCallbackData(data: string | undefined): ParsedCallback | null {
  if (!data) return null;
  const [kind, action, leadId, ...rest] = data.split(":");
  if (kind !== "lead" || rest.length > 0) return null;
  if (!LEAD_ACTIONS.includes(action as LeadAction)) return null;
  if (!leadId || !UUID_RE.test(leadId)) return null;
  return { kind: "lead", action: action as LeadAction, leadId: leadId.toLowerCase() };
}
