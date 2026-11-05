import { z } from "zod";
import type { TariffKind } from "./types.ts";

const priceTable = z.record(z.string(), z.number().nonnegative());

// Строгая схема: тариф правят руками, опечатка в ключе не должна молча менять цену.
const schema = z.strictObject({
  default: priceTable,
  byLocation: z.record(z.uuid(), priceTable).optional(),
});

export type SlotTableParams = z.output<typeof schema>;

/**
 * Цена по слоту и точке (ADR-0006 §2).
 * Порядок поиска: точка × слот → `default` × слот → `delivery_slots.base_price`.
 */
export const slotTable: TariffKind<SlotTableParams> = {
  schema,
  quote(params, request, context) {
    const slot = context.slots.find((s) => s.slug === request.slotSlug);
    if (!slot) return null;

    // Неизвестный слаг — опечатка: без этой проверки клиент молча получил бы базовую цену.
    const known = new Set(context.slots.map((s) => s.slug));
    const tables = [params.default, ...Object.values(params.byLocation ?? {})];
    if (tables.some((table) => Object.keys(table).some((slug) => !known.has(slug)))) return null;

    const atLocation = request.locationId ? params.byLocation?.[request.locationId]?.[slot.slug] : undefined;
    const amount = atLocation ?? params.default[slot.slug] ?? slot.base_price;

    return {
      total: amount,
      currency: "CZK",
      breakdown: [{ label: slot.label, amount }],
      pricingVersion: "slot_table/1",
    };
  },
};
