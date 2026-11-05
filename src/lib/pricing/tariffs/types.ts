import type { z } from "zod";
import type { Quote } from "../types.ts";

/** Что нужно тарифу о заказе. Новые виды тарифов добавят сюда свои поля. */
export type TariffRequest = {
  slotSlug: string;
  locationId: string | null;
};

export type TariffSlot = { slug: string; label: string; base_price: number };

/** Данные из БД на момент расчёта. */
export type TariffContext = {
  slots: readonly TariffSlot[];
  optionName: string;
};

export type TariffResult = { ok: true; quote: Quote } | { ok: false; code: "tariff_invalid" };

/** Вид тарифа (ADR-0006 §2). `quote` — чистая функция; `null` значит, что параметры не подходят к данным. */
export type TariffKind<P> = {
  schema: z.ZodType<P>;
  quote: (params: P, request: TariffRequest, context: TariffContext) => Quote | null;
};
