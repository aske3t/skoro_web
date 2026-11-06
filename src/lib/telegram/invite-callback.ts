/** callback_data кнопок `/invite`: `inv:<action>:<uuid>`. Лимит Telegram — 64 байта; здесь не больше 47. */
export const INVITE_ACTIONS = ["new", "unlink"] as const;
export type InviteAction = (typeof INVITE_ACTIONS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildInviteCallback(action: InviteAction, contactId: string): string {
  return `inv:${action}:${contactId}`;
}

/** null — данные не наши или повреждены. */
export function parseInviteCallback(data: string | undefined): { action: InviteAction; contactId: string } | null {
  const [kind, action, contactId, ...rest] = (data ?? "").split(":");
  if (kind !== "inv" || rest.length > 0) return null;
  if (!INVITE_ACTIONS.includes(action as InviteAction)) return null;
  if (!contactId || !UUID_RE.test(contactId)) return null;
  return { action: action as InviteAction, contactId: contactId.toLowerCase() };
}
