/**
 * grammY при старте long polling сам снимает вебхук. Если он установлен —
 * значит это боевой бот, и polling его перехватит; нужен отдельный dev-бот.
 */
export function isWebhookConfigured(info: { url?: string }): boolean {
  return Boolean(info.url);
}
