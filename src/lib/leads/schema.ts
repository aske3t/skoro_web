import { z } from "zod";

import { isValidIco, normalizeIco } from "./ico";
import {
  ADDRESS_MAX,
  CUSTOMER_TYPES,
  EMAIL_MAX,
  LEAD_KINDS,
  MESSAGE_MAX,
  NAME_MAX,
  PAYMENT_METHODS,
  PHONE_INPUT_MAX,
  UTM_KEYS,
  UTM_VALUE_MAX,
} from "./constants";

export {
  ADDRESS_MAX,
  EMAIL_MAX,
  LEAD_KINDS,
  MESSAGE_MAX,
  NAME_MAX,
  PAYMENT_METHODS,
  PHONE_INPUT_MAX,
  UTM_KEYS,
  UTM_VALUE_MAX,
};

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const DEFAULT_COUNTRY_CODE = "+420";

export type LeadKind = (typeof LEAD_KINDS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type LeadField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "message"
  | "pickupAddress"
  | "deliveryAddress"
  | "recipientName"
  | "recipientPhone"
  | "paymentMethod"
  | "customerType"
  | "ico"
  | "photo";
// not_found / inactive — результат проверки IČO в ARES (выставляет action, не схема).
export type FieldErrorCode =
  | "required"
  | "invalid"
  | "too_long"
  | "too_large"
  | "not_found"
  | "inactive";
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export type LeadFormValues = {
  kind: LeadKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  pickupAddress: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  // Галочка «Я получатель»: "on", если отмечена (так её отправляет браузер).
  recipientIsCustomer: string;
  paymentMethod: string;
  customerType: string;
  ico: string;
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
  "pickupAddress",
  "deliveryAddress",
  "recipientName",
  "recipientPhone",
  "paymentMethod",
  "customerType",
  "ico",
  "photo",
];
const FIELD_ERROR_CODES: readonly FieldErrorCode[] = [
  "required",
  "invalid",
  "too_long",
  "too_large",
  "not_found",
  "inactive",
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .optional()
    .transform((v) => v || null);

const baseLeadSchema = z.object({
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
  // Обязателен только для вопроса (проверка в transform ниже); к доставке — необязательный комментарий.
  message: z
    .string()
    .trim()
    .max(MESSAGE_MAX, "too_long")
    .transform((v) => v || null),
  utm: z
    .string()
    .optional()
    .transform((v) => parseUtm(v)),
  // Поля доставки: правила зависят от kind, проверяются в transform ниже.
  pickupAddress: optionalText(ADDRESS_MAX),
  deliveryAddress: optionalText(ADDRESS_MAX),
  recipientName: optionalText(NAME_MAX),
  recipientPhone: optionalText(PHONE_INPUT_MAX),
  paymentMethod: optionalText(32),
  customerType: optionalText(16),
  ico: optionalText(20),
  recipientIsCustomer: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

/**
 * Для kind = delivery обязательны адреса, телефон клиента и способ оплаты;
 * телефон получателя необязателен. Для question поля доставки отбрасываются.
 * Эти проверки идут после проверки базовых полей: пока email или сообщение
 * невалидны, ошибки полей доставки не показываются (в форме их ловит `required`).
 */
export const leadSchema = baseLeadSchema.transform((lead, ctx) => {
  const empty = {
    pickupAddress: null,
    deliveryAddress: null,
    recipientName: null,
    recipientPhone: null,
    paymentMethod: null,
    customerType: null,
    ico: null,
    recipientIsCustomer: false,
  };
  const fail = (path: LeadField, message: FieldErrorCode) =>
    ctx.addIssue({ code: "custom", message, path: [path] });

  if (lead.kind !== "delivery") {
    if (!lead.message) fail("message", "required");
    return { ...lead, ...empty };
  }

  if (!lead.pickupAddress) fail("pickupAddress", "required");
  if (!lead.deliveryAddress) fail("deliveryAddress", "required");
  if (!lead.phone) fail("phone", "required");

  let paymentMethod: PaymentMethod | null = null;
  if (!lead.paymentMethod) {
    fail("paymentMethod", "required");
  } else if ((PAYMENT_METHODS as readonly string[]).includes(lead.paymentMethod)) {
    paymentMethod = lead.paymentMethod as PaymentMethod;
  } else {
    fail("paymentMethod", "invalid");
  }

  // Компания обязана указать IČO; проверка существования в ARES — в action.
  let customerType: CustomerType | null = null;
  let ico: string | null = null;
  if (!lead.customerType) {
    fail("customerType", "required");
  } else if ((CUSTOMER_TYPES as readonly string[]).includes(lead.customerType)) {
    customerType = lead.customerType as CustomerType;
  } else {
    fail("customerType", "invalid");
  }
  if (customerType === "company") {
    const normalized = lead.ico ? normalizeIco(lead.ico) : "";
    if (!normalized) fail("ico", "required");
    else if (!isValidIco(normalized)) fail("ico", "invalid");
    else ico = normalized;
  }

  // «Я получатель»: получатель — сам заказчик, его имя и телефон (уже нормализован выше).
  if (lead.recipientIsCustomer) {
    return {
      ...lead,
      recipientName: lead.firstName,
      recipientPhone: lead.phone,
      paymentMethod,
      customerType,
      ico,
    };
  }

  let recipientPhone: string | null = null;
  if (lead.recipientPhone) {
    recipientPhone = normalizePhone(lead.recipientPhone);
    if (!recipientPhone) fail("recipientPhone", "invalid");
  }

  return { ...lead, recipientPhone, paymentMethod, customerType, ico };
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
