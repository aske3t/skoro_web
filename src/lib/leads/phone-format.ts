// Без zod и серверного кода: используется и формой в браузере, и схемой на сервере.
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES } from "./constants";

export type PhoneCountry = (typeof PHONE_COUNTRIES)[number];

// Для определения страны по коду: сначала более длинные коды (+420 раньше +42…).
const BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
const UNKNOWN_GROUPS = [3, 3, 3, 3, 3];

export function findPhoneCountry(code: string | null | undefined): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.code === code) ??
    PHONE_COUNTRIES.find((c) => c.code === DEFAULT_PHONE_COUNTRY)!
  );
}

/** Номер введён в международном формате («+…» или «00…»). */
export function isInternational(raw: string): boolean {
  const trimmed = raw.trimStart();
  return trimmed.startsWith("+") || trimmed.startsWith("00");
}

/** Цифры после «+»/«00»; null для номера без кода страны. */
function internationalDigits(raw: string): string | null {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("+")) return trimmed.slice(1).replace(/\D/g, "");
  if (trimmed.startsWith("00")) return trimmed.slice(2).replace(/\D/g, "");
  return null;
}

function group(digits: string, sizes: readonly number[]): string {
  const parts: string[] = [];
  let rest = digits;
  for (const size of sizes) {
    if (!rest) break;
    parts.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  if (rest) parts.push(rest);
  return parts.join(" ");
}

/** Страна по введённому коду: «+420 777…» → CZ. Номер без кода или неизвестный код → null. */
export function detectPhoneCountry(raw: string): PhoneCountry | null {
  const digits = internationalDigits(raw);
  if (!digits) return null;
  return BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial.slice(1))) ?? null;
}

/**
 * Форматирует ввод для читаемости: «+420777123456» → «+420 777 123 456».
 * Номер без кода — разбивка по правилам страны по умолчанию (CZ); неизвестный код — группами по 3.
 */
export function formatPhoneInput(raw: string): string {
  const digits = internationalDigits(raw);
  if (digits === null) return group(raw.replace(/\D/g, ""), findPhoneCountry(null).groups);
  if (!digits) return "+";

  const country = detectPhoneCountry(raw);
  if (!country) return `+${group(digits, UNKNOWN_GROUPS)}`;
  const code = country.dial.slice(1);
  const national = digits.slice(code.length);
  return national ? `+${code} ${group(national, country.groups)}` : `+${code}`;
}

/** Меняет код страны в введённом номере, сохраняя национальную часть. */
export function withCountryCode(raw: string, country: PhoneCountry): string {
  const current = detectPhoneCountry(raw);
  const digits = internationalDigits(raw);
  let national: string;
  if (digits === null) national = raw.replace(/\D/g, "").replace(/^0+/, "");
  else if (current) national = digits.slice(current.dial.length - 1);
  else national = "";
  return formatPhoneInput(`${country.dial}${national}`);
}

/**
 * Номер для проверки на сервере: международный — как есть, без кода — с кодом страны
 * (по умолчанию CZ). Ведущий 0 национального формата с кодом страны не пишется.
 */
export function composePhone(local: string, country?: string | null): string {
  const trimmed = local.trim();
  if (!trimmed || isInternational(trimmed)) return trimmed;
  return `${findPhoneCountry(country).dial} ${trimmed.replace(/^0+/, "")}`;
}

/** Флаг страны из двухбуквенного кода (региональные индикаторы Unicode). */
export function countryFlag(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
