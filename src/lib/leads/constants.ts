// Без zod: модуль импортирует клиентская форма, схема живёт в schema.ts.
// Лимиты совпадают с check-ограничениями в миграции create_leads.
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PHONE_INPUT_MAX = 32; // сырой ввод с пробелами и скобками
export const MESSAGE_MAX = 4000;
export const UTM_VALUE_MAX = 200;
export const ADDRESS_MAX = 300;

// Фото отправления. Лимит запроса на Vercel — 4,5 МБ, поэтому файл до 4 МБ.
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
// В браузере фото сжимается до PHOTO_MAX_SIDE по длинной стороне, поэтому исходник может быть больше.
export const PHOTO_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 2048;
export const PHOTO_JPEG_QUALITY = 0.85;

export const PAYMENT_METHODS = ["cash", "online"] as const;

// Тип клиента в заявке на доставку. Для компании обязательно IČO (проверка в ARES).
export const CUSTOMER_TYPES = ["company", "person"] as const;
export const ICO_LENGTH = 8;
export const COMPANY_NAME_MAX = 300;

// Страны для списка кодов у поля телефона. groups — разбивка национального номера для читаемости.
// Первая страна — по умолчанию: номер без кода считается чешским.
export const PHONE_COUNTRIES = [
  { code: "CZ", name: "Чехия", dial: "+420", groups: [3, 3, 3] },
  { code: "SK", name: "Словакия", dial: "+421", groups: [3, 3, 3] },
  { code: "UA", name: "Украина", dial: "+380", groups: [2, 3, 2, 2] },
  { code: "PL", name: "Польша", dial: "+48", groups: [3, 3, 3] },
  { code: "DE", name: "Германия", dial: "+49", groups: [3, 4, 4] },
  { code: "AT", name: "Австрия", dial: "+43", groups: [3, 3, 4] },
  { code: "HU", name: "Венгрия", dial: "+36", groups: [2, 3, 4] },
  { code: "GB", name: "Великобритания", dial: "+44", groups: [4, 3, 3] },
] as const;
export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];
export const DEFAULT_PHONE_COUNTRY: PhoneCountryCode = "CZ";
export const PHONE_LOCAL_MAX = 20;

export const LEAD_KINDS = ["delivery", "question"] as const;
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
