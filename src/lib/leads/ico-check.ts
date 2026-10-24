"use server";

import { lookupIco } from "./ares";
import { isValidIco, normalizeIco } from "./ico";

export type IcoCheckResult =
  | { status: "found"; name: string }
  | { status: "inactive"; name: string }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

/**
 * Живая проверка IČO для формы: контрольная сумма, затем ARES.
 * Только подсказка — при отправке submitLead проверяет IČO заново.
 * В ARES уходят только номера с верной контрольной суммой.
 */
export async function checkIco(raw: string): Promise<IcoCheckResult> {
  const ico = normalizeIco(String(raw ?? ""));
  if (!isValidIco(ico)) return { status: "invalid" };

  const result = await lookupIco(ico);
  if (result.status === "found" || result.status === "inactive") {
    return { status: result.status, name: result.name };
  }
  return { status: result.status };
}
