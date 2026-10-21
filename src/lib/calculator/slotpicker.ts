import type { DeliverySlot } from "./types";

/**
 * Выбирает слот по запасу времени до доставки
 * null трактируется как infinity и попадает в конец
 */

//новый конфиг сервиса
export type ServiceConfig = {
    operating_start_minute: number;
    operating_end_minute: number;
}

export type PickResult = 
| { ok: true; slot: DeliverySlot; leadMinutes: number }
| { ok: false; reason: "past" | "outside_hours"};

export function pickSlot(
  now: Date,
  deliveryAt: Date,
  slots: DeliverySlot[],
  service: ServiceConfig,
): PickResult {
  const leadMs = deliveryAt.getTime() - now.getTime();
  if (leadMs <= 0) return { ok: false, reason: "past" };

  const minuteOfDay = deliveryAt.getHours() * 60 + deliveryAt.getMinutes();
  if (
    minuteOfDay < service.operating_start_minute ||
    minuteOfDay >= service.operating_end_minute
  ) {
    return { ok: false, reason: "outside_hours" };
  }

  const leadMinutes = Math.ceil(leadMs / 60_000);
  const sorted = [...slots].sort(
    (a, b) =>
      (a.max_lead_minutes ?? Infinity) - (b.max_lead_minutes ?? Infinity),
  );
  const slot = sorted.find(
    (s) => leadMinutes <= (s.max_lead_minutes ?? Infinity),
  );

  return slot ? { ok: true, slot, leadMinutes } : { ok: false, reason: "past" };
}

