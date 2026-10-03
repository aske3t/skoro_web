// Без zod: модуль импортирует клиентская форма, схема живёт в schema.ts.
// Лимиты совпадают с check-ограничениями в миграции create_leads.
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PHONE_INPUT_MAX = 32; // сырой ввод с пробелами и скобками
export const MESSAGE_MAX = 4000;
export const UTM_VALUE_MAX = 200;

export const LEAD_KINDS = ["delivery", "question"] as const;
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
