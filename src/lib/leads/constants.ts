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

// Страны для поля телефона. groups — разбивка национального номера для читаемости,
// example — плейсхолдер. Первая страна — значение по умолчанию.
export const PHONE_COUNTRIES = [
  { code: "CZ", dial: "+420", groups: [3, 3, 3], example: "777 123 456" },
  { code: "SK", dial: "+421", groups: [3, 3, 3], example: "901 123 456" },
  { code: "UA", dial: "+380", groups: [2, 3, 2, 2], example: "67 123 45 67" },
  { code: "PL", dial: "+48", groups: [3, 3, 3], example: "512 345 678" },
  { code: "DE", dial: "+49", groups: [3, 4, 4], example: "151 2345 6789" },
  { code: "AT", dial: "+43", groups: [3, 3, 4], example: "664 123 4567" },
  { code: "HU", dial: "+36", groups: [2, 3, 4], example: "20 123 4567" },
  { code: "GB", dial: "+44", groups: [4, 3, 3], example: "7400 123 456" },
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
