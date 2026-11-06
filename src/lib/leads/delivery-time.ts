import { pickSlotForTime, type ServiceHours, type SlotCandidate } from "../orders/slot.ts";

export type DeliveryTimeResult =
  | { status: "ok"; slotLabel: string }
  | { status: "past" | "outside_hours" | "no_slot" };

/** Подходит ли время «ко времени» для заявки и какой у него слот. */
export function evaluateDeliveryTime(
  now: Date,
  deliveryAt: Date,
  data: { slots: readonly (SlotCandidate & { label: string })[]; hours: ServiceHours },
): DeliveryTimeResult {
  const result = pickSlotForTime(now, deliveryAt, data.slots, data.hours);
  if (result.ok) return { status: "ok", slotLabel: result.slot.label };

  switch (result.code) {
    case "slot_past":
      return { status: "past" };
    case "slot_outside_hours":
      return { status: "outside_hours" };
    case "no_slot":
      return { status: "no_slot" };
  }
}
