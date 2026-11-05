import { flat } from "./flat.ts";
import { slotTable } from "./slot-table.ts";
import type { TariffContext, TariffKind, TariffRequest, TariffResult } from "./types.ts";

export type { TariffContext, TariffRequest, TariffResult, TariffSlot } from "./types.ts";

type Runner = (rawParams: unknown, request: TariffRequest, context: TariffContext) => TariffResult;

function runner<P>(tariff: TariffKind<P>): Runner {
  return (rawParams, request, context) => {
    const parsed = tariff.schema.safeParse(rawParams);
    if (!parsed.success) return { ok: false, code: "tariff_invalid" };

    const quote = tariff.quote(parsed.data, request, context);
    return quote ? { ok: true, quote } : { ok: false, code: "tariff_invalid" };
  };
}

// Реестр видов тарифов: новый вид добавляется кодом, схема БД не меняется (ADR-0006 §2).
const TARIFFS = new Map<string, Runner>([
  ["slot_table", runner(slotTable)],
  ["flat", runner(flat)],
]);

/**
 * Расчёт по тарифу опции. Параметры проверяются при каждом расчёте: они лежат в БД
 * и правятся руками. Неизвестный вид или битые параметры → `tariff_invalid`.
 */
export function quoteTariff(
  kind: string,
  rawParams: unknown,
  request: TariffRequest,
  context: TariffContext,
): TariffResult {
  const run = TARIFFS.get(kind);
  return run ? run(rawParams, request, context) : { ok: false, code: "tariff_invalid" };
}
