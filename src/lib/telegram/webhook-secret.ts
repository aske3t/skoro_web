import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Сравнение за постоянное время: обе строки хэшируются в фиксированную длину,
 * иначе timingSafeEqual бросает исключение при несовпадении длины.
 */
export function isValidWebhookSecret(
  received: string | null,
  expected: string,
): boolean {
  if (!received || !expected) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
