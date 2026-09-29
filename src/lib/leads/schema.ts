import { z } from "zod";

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

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const DEFAULT_COUNTRY_CODE = "+420";

export type LeadKind = (typeof LEAD_KINDS)[number];
export type LeadField = "firstName" | "lastName" | "email" | "phone" | "message";
export type FieldErrorCode = "required" | "invalid" | "too_long";
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export type LeadFormValues = {
  kind: LeadKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

export type LeadFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      code: "validation" | "rate_limited" | "server_error";
      fieldErrors?: Partial<Record<LeadField, FieldErrorCode>>;
      values: LeadFormValues; // чтобы форма не теряла ввод
    };

const LEAD_FIELDS: readonly LeadField[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "message",
];
const FIELD_ERROR_CODES: readonly FieldErrorCode[] = [
  "required",
  "invalid",
  "too_long",
];

/**
 * Приводит телефон к E.164. Номер без кода страны считается чешским.
 * Возвращает null, если результат не похож на телефон.
 */
export function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/[\s\-()]/g, "");
  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  } else if (!phone.startsWith("+")) {
    phone = `${DEFAULT_COUNTRY_CODE}${phone}`;
  }
  return PHONE_RE.test(phone) ? phone : null;
}

/** Оставляет только разрешённые utm_* ключи. Невалидный ввод → null. */
export function parseUtm(raw: string | null | undefined): Utm | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed && trimmed.length <= UTM_VALUE_MAX) utm[key] = trimmed;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

// Сообщения ошибок zod — это коды FieldErrorCode, тексты живут в компоненте.
const optionalName = z
  .string()
  .trim()
  .max(NAME_MAX, "too_long")
  .transform((v) => v || null);

export const leadSchema = z.object({
  kind: z.enum(LEAD_KINDS, { error: "invalid" }).default("delivery"),
  firstName: optionalName,
  lastName: optionalName,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "required")
    .max(EMAIL_MAX, "too_long")
    .pipe(z.email({ error: "invalid" })),
  phone: z
    .string()
    .trim()
    .max(PHONE_INPUT_MAX, "too_long")
    .transform((v, ctx) => {
      if (!v) return null;
      const phone = normalizePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "invalid" });
        return z.NEVER;
      }
      return phone;
    }),
  message: z
    .string()
    .trim()
    .min(1, "required")
    .max(MESSAGE_MAX, "too_long"),
  utm: z
    .string()
    .optional()
    .transform((v) => parseUtm(v)),
});

export type LeadInput = z.output<typeof leadSchema>;

/** Первая ошибка по каждому полю формы, в виде кода. */
export function getFieldErrors(
  error: z.ZodError,
): Partial<Record<LeadField, FieldErrorCode>> {
  const fieldErrors: Partial<Record<LeadField, FieldErrorCode>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as LeadField;
    if (!LEAD_FIELDS.includes(field) || fieldErrors[field]) continue;
    const code = issue.message as FieldErrorCode;
    fieldErrors[field] = FIELD_ERROR_CODES.includes(code) ? code : "invalid";
  }
  return fieldErrors;
}
