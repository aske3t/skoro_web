import type { z } from "zod";
import type { TariffRequest } from "../../pricing/tariffs/types.ts";
import type { FormField } from "./constants.ts";

/** Строка сводки заказа. Экранирует вывод тот, кто её показывает: Telegram или письмо. */
export type FormSummaryLine = { field: string; label: string; value: string };

/** Данные из БД, которых нет в самой форме. */
export type FormSummaryContext = { pickupLocationName: string | null };

/**
 * Вид формы опции (ADR-0006 §3). Методы объявлены как методы, чтобы виды с разными
 * значениями помещались в один реестр. Файл фото проверяет action (`checkPhoto` из `lib/leads`).
 */
export type FormKind<V> = {
  fields: readonly FormField[];
  schema: z.ZodType<V>;
  /** Предзаполнение из `client_options.form_defaults`. */
  defaultsSchema: z.ZodType;
  toTariffRequest(values: V, slotSlug: string): TariffRequest;
  summarize(values: V, context: FormSummaryContext): FormSummaryLine[];
};
