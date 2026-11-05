import { pragueMinuteOfDay } from "./prague-time.ts";

export type ServiceHours = {
  operating_start_minute: number;
  operating_end_minute: number;
};

export type SlotCandidate = { max_lead_minutes: number | null };

export type SlotError = "slot_past" | "slot_outside_hours" | "no_slot";

export type SlotResult<S> = { ok: true; slot: S } | { ok: false; code: SlotError };

function isOpen(moment: Date, hours: ServiceHours): boolean {
  const minute = pragueMinuteOfDay(moment);
  return minute >= hours.operating_start_minute && minute < hours.operating_end_minute;
}

/** От самого срочного к самому свободному; слот без лимита (`null`) — последний. */
function byUrgency<S extends SlotCandidate>(slots: readonly S[]): S[] {
  return [...slots].sort(
    (a, b) => (a.max_lead_minutes ?? Infinity) - (b.max_lead_minutes ?? Infinity),
  );
}

/** Слот на конкретное время: самый срочный, в запас которого оно укладывается. */
export function pickSlotForTime<S extends SlotCandidate>(
  now: Date,
  deliveryAt: Date,
  slots: readonly S[],
  hours: ServiceHours,
): SlotResult<S> {
  const leadMs = deliveryAt.getTime() - now.getTime();
  if (leadMs <= 0) return { ok: false, code: "slot_past" };
  if (!isOpen(deliveryAt, hours)) return { ok: false, code: "slot_outside_hours" };

  const leadMinutes = Math.ceil(leadMs / 60_000);
  const slot = byUrgency(slots).find((s) => leadMinutes <= (s.max_lead_minutes ?? Infinity));
  return slot ? { ok: true, slot } : { ok: false, code: "no_slot" };
}

/**
 * «Как можно скорее» — самый срочный слот. Вне рабочих часов — ошибка, заказ на утро
 * не принимается (решение владельца, 2026-11-05).
 */
export function pickSlotAsap<S extends SlotCandidate>(
  now: Date,
  slots: readonly S[],
  hours: ServiceHours,
): SlotResult<S> {
  if (!isOpen(now, hours)) return { ok: false, code: "slot_outside_hours" };
  const slot = byUrgency(slots)[0];
  return slot ? { ok: true, slot } : { ok: false, code: "no_slot" };
}
