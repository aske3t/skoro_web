import type { z } from "zod";
import type { FieldErrorCode } from "../../leads/schema.ts";
import { cityDelivery } from "./city-delivery.ts";
import type { FormKind } from "./types.ts";

export type { FormKind, FormSummaryContext, FormSummaryLine } from "./types.ts";

// Реестр видов форм: новый вид добавляется кодом (ADR-0006 §3).
const FORM_KINDS = new Map<string, FormKind<unknown>>([["city_delivery", cityDelivery]]);

/** Вид формы по `service_options.form_kind`; `null`, если такого вида в коде нет. */
export function getFormKind(kind: string): FormKind<unknown> | null {
  return FORM_KINDS.get(kind) ?? null;
}

const FORM_ERROR_CODES: readonly string[] = ["required", "invalid", "too_long"] satisfies FieldErrorCode[];

/** Первая ошибка по каждому полю, в виде кода. Текст показывает компонент. */
export function getFormFieldErrors(error: z.ZodError): Record<string, FieldErrorCode> {
  const fieldErrors: Record<string, FieldErrorCode> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] = FORM_ERROR_CODES.includes(issue.message) ? (issue.message as FieldErrorCode) : "invalid";
  }
  return fieldErrors;
}
