import type { z } from "zod";
import type { Json } from "@/types/database";
import type { TariffRequest } from "../../pricing/tariffs/types.ts";
import type { FormField } from "./constants.ts";

/** Строка сводки заказа. Экранирует вывод тот, кто её показывает: Telegram или письмо. */
export type FormSummaryLine = { field: string; label: string; value: string };

/** Данные из БД, которых нет в самой форме. */
export type FormSummaryContext = { pickupLocationName: string | null };

/** Общие поля заказа, продублированные в колонки `orders` для списков (ADR-0006 §6). */
export type OrderColumns = {
  fromAddress: string;
  toAddress: string;
  recipientContact: string | null;
  comment: string | null;
};

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
  /** Время доставки; `null` — как можно скорее. */
  deliveryAt(values: V): Date | null;
  /** Выбранная точка клиента или `null`. Что точка принадлежит клиенту, проверяет логика заказа. */
  pickupLocationId(values: V): string | null;
  orderColumns(values: V, context: { pickupAddress: string | null }): OrderColumns;
  /** Снимок формы для `orders.form_data`. */
  snapshot(values: V): Json;
};
