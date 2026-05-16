import type {
  CalculatorData,
  CalculatorResult,
  PricingInput,
  ServiceCost,
  ZoneDistance,
  RouteUnit,
} from "./types";
import { calcStopSurcharge } from "./surcharges";

const BATCH_PER_EXTRA_STOP = 100;

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
 * total = база + надбавка за каждую дополнительную точку + surcharges.
 */
export function calcSkoro(data: CalculatorData, input: PricingInput): ServiceCost {
  const slot = data.slots.find(s => s.id === input.slotId)!;

  const totalKm = input.pickupPointIds.reduce((sum, id) => {
    const point = data.retailPoints.find(p => p.id === id);
    if (!point?.zone_id) return sum;
    return sum + distance(data.distances, point.zone_id, input.deliveryZoneId);
  }, 0);

  const extraPoints = Math.max(0, input.pickupPointIds.length - 1);

  const slotPrice = slot.base_price;
  const extras    = extraPoints * data.skoro.per_extra_point;
  const km        = totalKm * data.skoro.per_km_price;
  const total     = slotPrice + extras + km;

  return {
    serviceSlug: "skoro",
    serviceName: `Skoro · ${slot.label}`,
    total,
    breakdown: [
      { label: slot.label, amount: slotPrice },
      { label: `Доп. точки забора (${extraPoints})`, amount: extras },
      { label: `Километраж (${totalKm} км)`, amount: km },
    ],
  };
}

export type RouteInput = {
  units: RouteUnit[],
  batch: boolean,
}
//калькуляция кастомного маршрута
export function calcRoute(data: CalculatorData, input: RouteInput): ServiceCost {
  const validPickups = input.units.map(u => u.pickup).filter(p => p.slotId)
  if (validPickups.length === 0) {
    return { serviceSlug: "skoro-route", serviceName: "Skoro · маршрут",
             total: 0, breakdown: [] };
  }

  const eligible = isBatchEligible(input.units);
  const useBatch = input.batch && eligible;

  const breakdown: ServiceCost["breakdown"] = [];
  let total = 0;

  if (useBatch) {
    // База одного слота + 100 за каждую доп. точку
    const slot = data.slots.find(s => s.id === validPickups[0].slotId)!;
    breakdown.push({ label: `Batch · ${slot.label}`, amount: slot.base_price });
    total += slot.base_price;

    const extra = validPickups.length - 1;
    if (extra > 0) {
      const extraCost = extra * BATCH_PER_EXTRA_STOP;
      breakdown.push({ label: `Доп. точки в batch (${extra})`, amount: extraCost });
      total += extraCost;
    }
  } else {
    // Полная цена слота за каждую точку
    for (const s of validPickups) {
      const slot = data.slots.find(x => x.id === s.slotId)!;
      breakdown.push({
        label: `Точка · ${s.address || "—"} (${slot.label})`,
        amount: slot.base_price,
      });
      total += slot.base_price;
    }
  }

  // Доплаты за детали — независимо от batch
  for (let i = 0; i < validPickups.length; i++) {
    const sur = calcStopSurcharge(validPickups[i].surcharge);
    for (const it of sur.items) {
      breakdown.push({ label: `Точка ${i + 1} · ${it.label}`, amount: it.amount });
    }
    total += sur.total;
  }

  return { serviceSlug: "skoro-route", serviceName: "Skoro · маршрут",
           total, breakdown };
}

export function isBatchEligible(units: RouteUnit[]): boolean {
  if (units.length < 2) return false;
  const firstZone = units[0].pickup.zoneId;
  const firstSlot = units[0].pickup.slotId;
  if (!firstZone || !firstSlot) return false;
  return units.every(u =>
    u.pickup.zoneId === firstZone && u.pickup.slotId === firstSlot
  );
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
