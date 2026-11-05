import { createHmac, timingSafeEqual } from "node:crypto";

// Проверка данных Mini App по токену бота (Telegram, «Validating data received via the Mini App»).
const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
// Часы сервера и Telegram могут немного расходиться.
const CLOCK_SKEW_SECONDS = 5 * 60;
const HASH_RE = /^[0-9a-f]{64}$/;

export type InitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type InitDataResult =
  | { ok: true; user: InitDataUser; authDate: Date; startParam: string | null }
  | { ok: false; code: "invalid" | "expired" };

function parseUser(raw: string | null): InitDataUser | null {
  if (!raw) return null;
  try {
    const user: unknown = JSON.parse(raw);
    if (!user || typeof user !== "object") return null;
    const { id } = user as { id?: unknown };
    return Number.isSafeInteger(id) ? (user as InitDataUser) : null;
  } catch {
    return null;
  }
}

/**
 * Подлинность и свежесть `initData`. Принимать только с токеном того бота, чья кнопка открыла
 * Mini App: данные, подписанные другим ботом, не пройдут.
 * В строку проверки входят все поля, кроме `hash`, включая `signature`.
 */
export function verifyInitData(initData: string, botToken: string, now: Date): InitDataResult {
  if (!initData || !botToken) return { ok: false, code: "invalid" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !HASH_RE.test(hash)) return { ok: false, code: "invalid" };

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex"))) return { ok: false, code: "invalid" };

  const authSeconds = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authSeconds) || authSeconds <= 0) return { ok: false, code: "invalid" };

  const ageSeconds = now.getTime() / 1000 - authSeconds;
  if (ageSeconds < -CLOCK_SKEW_SECONDS) return { ok: false, code: "invalid" };
  if (ageSeconds > INIT_DATA_MAX_AGE_SECONDS) return { ok: false, code: "expired" };

  const user = parseUser(params.get("user"));
  if (!user) return { ok: false, code: "invalid" };

  return {
    ok: true,
    user,
    authDate: new Date(authSeconds * 1000),
    startParam: params.get("start_param"),
  };
}
