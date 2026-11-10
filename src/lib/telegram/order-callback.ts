/**
 * callback_data кнопок карточки заказа: `order:<action>:<uuid>` (ADR-0005 §4).
 * Лимит Telegram — 64 байта; самое длинное, `order:decline:` + uuid, — 50.
 * Кнопки появляются на шаге 4 пилота, обрабатываются с шага 5.
 */
export const ORDER_ACTIONS = ["accept", "decline", "deliver", "cancel"] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildOrderCallback(action: OrderAction, orderId: string): string {
  return `order:${action}:${orderId}`;
}

/** null — данные не наши или повреждены. */
export function parseOrderCallback(data: string | undefined): { action: OrderAction; orderId: string } | null {
  const [kind, action, orderId, ...rest] = (data ?? "").split(":");
  if (kind !== "order" || rest.length > 0) return null;
  if (!ORDER_ACTIONS.includes(action as OrderAction)) return null;
  if (!orderId || !UUID_RE.test(orderId)) return null;
  return { action: action as OrderAction, orderId: orderId.toLowerCase() };
}
