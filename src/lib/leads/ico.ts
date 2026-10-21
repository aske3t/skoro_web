// Без zod и серверного кода: проверка IČO нужна и схеме, и форме.
import { ICO_LENGTH } from "./constants";

const ICO_WEIGHTS = [8, 7, 6, 5, 4, 3, 2];

/** Оставляет только цифры: «452 74 649» → «45274649». */
export function normalizeIco(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Формат и контрольная цифра IČO: сумма первых семи цифр с весами 8…2,
 * r = сумма mod 11; контрольная = 1 при r = 0, 0 при r = 1, иначе 11 − r.
 * Ловит опечатки, но не подтверждает, что фирма существует, — это делает ARES.
 */
export function isValidIco(ico: string): boolean {
  if (!new RegExp(`^\\d{${ICO_LENGTH}}$`).test(ico)) return false;
  const sum = ICO_WEIGHTS.reduce((acc, w, i) => acc + w * Number(ico[i]), 0);
  const r = sum % 11;
  const check = r === 0 ? 1 : r === 1 ? 0 : 11 - r;
  return Number(ico[7]) === check;
}
