// Без zod: проверка обязательных полей в браузере до отправки, чтобы сразу показать ошибки.
// Сервер (schema.ts) проверяет то же самое заново — это защита, а здесь только удобство.
import { isValidIco, normalizeIco } from "./ico";
import type { FieldErrorCode, LeadField } from "./schema";

export type ClientCheckInput = {
  kind: string;
  customerType: string;
  email: string;
  message: string;
  phone: string;
  pickupAddress: string;
  deliveryAddress: string;
  paymentMethod: string;
  ico: string;
};

// Порядок полей в форме: к первому с ошибкой переводим фокус.
export const FIELD_ORDER: readonly LeadField[] = [
  "email",
  "phone",
  "ico",
  "pickupAddress",
  "deliveryAddress",
  "recipientName",
  "recipientPhone",
  "paymentMethod",
  "message",
  "photo",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkRequiredFields(input: ClientCheckInput): Partial<Record<LeadField, FieldErrorCode>> {
  const errors: Partial<Record<LeadField, FieldErrorCode>> = {};
  const has = (v: string) => v.trim().length > 0;

  if (!has(input.email)) errors.email = "required";
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = "invalid";
  // Комментарий к доставке необязателен, текст вопроса — обязателен.
  if (input.kind !== "delivery" && !has(input.message)) errors.message = "required";

  if (input.kind === "delivery") {
    if (!has(input.phone)) errors.phone = "required";
    if (!has(input.pickupAddress)) errors.pickupAddress = "required";
    if (!has(input.deliveryAddress)) errors.deliveryAddress = "required";
    if (!has(input.paymentMethod)) errors.paymentMethod = "required";
    if (input.customerType === "company") {
      const ico = normalizeIco(input.ico);
      if (!ico) errors.ico = "required";
      else if (!isValidIco(ico)) errors.ico = "invalid";
    }
  }
  return errors;
}
