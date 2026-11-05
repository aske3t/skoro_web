const PROD_HOST = "skorouvas.cz";

/**
 * grammY при старте long polling сам снимает вебхук. Если он установлен,
 * polling перехватит обновления у развёрнутого сайта; сначала вебхук надо снять.
 */
export function isWebhookConfigured(info: { url?: string }): boolean {
  return Boolean(info.url);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Вебхук стоит на боевом домене, а операция уводит его оттуда (`target = null` — снятие).
 * Так бывает, когда в `.env.local` оказался токен боевого бота.
 */
export function leavesProdWebhook(current: string | undefined, target: string | null): boolean {
  if (!current || hostOf(current) !== PROD_HOST) return false;
  return target === null || hostOf(target) !== PROD_HOST;
}
