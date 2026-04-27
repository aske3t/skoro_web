import type {
  CalculatorData,
  CalculatorResult,
  PricingInput,
  ServiceCost,
  ZoneDistance,
} from "./types";

function distance(matrix: ZoneDistance[], from: string, to: string): number {
  return matrix.find(d => d.from_zone_id === from && d.to_zone_id === to)
    ?.distance_km ?? 0;
}

/**
 * «Конкурентный» сценарий: клиент заказывает доставку отдельно от каждой точки
 * её собственной службой (M.Видео express / Яндекс / OZON Rocket / ...).
 * Итог = сумма по всем выбранным точкам.
 */
export function calcCompetitors(
  data: CalculatorData,
  input: PricingInput,
): ServiceCost {
  const breakdown: ServiceCost["breakdown"] = [];
  let total = 0;

  for (const pointId of input.pickupPointIds) {
    const point = data.retailPoints.find(p => p.id === pointId);
    if (!point || !point.zone_id) continue;

    const km = distance(data.distances, point.zone_id, input.deliveryZoneId);
    const cost = point.base_price + km * point.per_km_price;

    const service = point.delivery_service ? ` · ${point.delivery_service}` : "";
    breakdown.push({
      label: `${point.name}${service} (${km} км)`,
      amount: cost,
    });
    total += cost;
  }

  return { total, breakdown };
}

/**
 * «Скоро» сценарий: один курьер забирает по всем точкам и едет к клиенту.
 * total = база + надбавка за каждую дополнительную точку + километраж.
 */
export function calcSkoro(
  data: CalculatorData,
  input: PricingInput,
): ServiceCost {
  const totalKm = input.pickupPointIds.reduce((sum, id) => {
    const point = data.retailPoints.find(p => p.id === id);
    if (!point || !point.zone_id) return sum;
    return sum + distance(data.distances, point.zone_id, input.deliveryZoneId);
  }, 0);

  const extraPoints = Math.max(0, input.pickupPointIds.length - 1);
  const base = data.skoro.base_price;
  const extras = extraPoints * data.skoro.per_extra_point;
  const km = totalKm * data.skoro.per_km_price;

  return {
    total: base + extras + km,
    breakdown: [
      { label: "База маршрута", amount: base },
      { label: `Доп. точки забора (${extraPoints})`, amount: extras },
      { label: `Километраж (${totalKm} км)`, amount: km },
    ],
  };
}

export function compare(
  data: CalculatorData,
  input: PricingInput,
): CalculatorResult {
  const competitors = calcCompetitors(data, input);
  const skoro = calcSkoro(data, input);
  const savings = competitors.total - skoro.total;
  const savingsPct =
    competitors.total > 0 ? Math.round((savings / competitors.total) * 100) : 0;

  return { competitors, skoro, savings, savingsPct };
}
