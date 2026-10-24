// Запрос в ARES — государственный реестр экономических субъектов ČR. Публичный REST без ключа.
import { COMPANY_NAME_MAX } from "./constants";

const ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/";
const ARES_TIMEOUT_MS = 3000;

export type AresResult =
  | { status: "found"; name: string; address: string | null }
  | { status: "not_found" }
  | { status: "inactive"; name: string }
  | { status: "unavailable" };

type AresSubject = {
  obchodniJmeno?: unknown;
  datumZaniku?: unknown;
  sidlo?: { textovaAdresa?: unknown } | null;
  seznamRegistraci?: { stavZdrojeRes?: unknown } | null;
};

/**
 * 404 → фирмы нет. Закрытая фирма: есть `datumZaniku` или запись в базовом реестре (RES)
 * историческая. Любой другой ответ считаем недоступностью ARES, а не ошибкой клиента.
 */
export function parseAresResponse(httpStatus: number, body: unknown): AresResult {
  if (httpStatus === 404) return { status: "not_found" };
  if (httpStatus !== 200 || !body || typeof body !== "object") {
    return { status: "unavailable" };
  }

  const subject = body as AresSubject;
  const name =
    typeof subject.obchodniJmeno === "string"
      ? subject.obchodniJmeno.replace(/\s+/g, " ").trim().slice(0, COMPANY_NAME_MAX)
      : "";
  if (!name) return { status: "unavailable" };

  const inactive =
    Boolean(subject.datumZaniku) ||
    subject.seznamRegistraci?.stavZdrojeRes === "HISTORICKY";
  if (inactive) return { status: "inactive", name };

  const address = subject.sidlo?.textovaAdresa;
  return { status: "found", name, address: typeof address === "string" ? address : null };
}

/** Никогда не бросает: сбой сети или таймаут → `unavailable`, решение принимает вызывающий. */
export async function lookupIco(
  ico: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AresResult> {
  try {
    const response = await fetchImpl(`${ARES_URL}${ico}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ARES_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = response.status === 200 ? await response.json().catch(() => null) : null;
    return parseAresResponse(response.status, body);
  } catch (error) {
    console.warn(
      "[ares] lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return { status: "unavailable" };
  }
}
