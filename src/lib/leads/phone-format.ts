// Без zod и серверного кода: используется и формой в браузере, и схемой на сервере.
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  type PhoneCountryCode,
} from "./constants";

type PhoneCountry = (typeof PHONE_COUNTRIES)[number];

export function findPhoneCountry(code: string | null | undefined): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.code === code) ??
    PHONE_COUNTRIES.find((c) => c.code === DEFAULT_PHONE_COUNTRY)!
  );
}

/** Номер введён целиком в международном формате («+…» или «00…») — код страны из списка не нужен. */
export function isInternational(raw: string): boolean {
  const trimmed = raw.trimStart();
  return trimmed.startsWith("+") || trimmed.startsWith("00");
}

/**
 * Разбивает национальную часть номера на группы по правилам страны: «777123456» → «777 123 456».
 * Цифры сверх шаблона идут последней группой. Международный ввод не трогаем, кроме мусора.
 */
export function formatLocalPhone(raw: string, country: PhoneCountryCode): string {
  if (isInternational(raw)) return raw.replace(/[^\d+ ]/g, "");

  const digits = raw.replace(/\D/g, "");
  const parts: string[] = [];
  let rest = digits;
  for (const size of findPhoneCountry(country).groups) {
    if (!rest) break;
    parts.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  if (rest) parts.push(rest);
  return parts.join(" ");
}

/**
 * Собирает номер из кода страны и национальной части: («CZ», «777 123 456») → «+420 777 123 456».
 * Если номер уже международный, код страны игнорируется. Пустой ввод → пустая строка.
 */
export function composePhone(local: string, country: string | null | undefined): string {
  const trimmed = local.trim();
  if (!trimmed || isInternational(trimmed)) return trimmed;
  // Ведущий 0 национального формата (например, 067 в Украине) с кодом страны не пишется.
  const national = trimmed.replace(/^0+/, "");
  return `${findPhoneCountry(country).dial} ${national}`;
}
