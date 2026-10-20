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

export const LEAD_KINDS = ["delivery", "question"] as const;
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
