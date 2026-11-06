import type { Tables } from "@/types/database";
import type { AdminClient } from "../supabase/admin.ts";
import type { ServiceHours } from "./slot.ts";

export type SlotData = {
  slots: Tables<"delivery_slots">[];
  hours: ServiceHours;
};

/** Слоты и рабочие часы. `null` — прочитать не удалось: решение за вызывающим кодом. */
export async function loadSlotData(db: AdminClient): Promise<SlotData | null> {
  const [slots, config] = await Promise.all([
    db.from("delivery_slots").select("*").order("display_order"),
    db.from("service_config").select("operating_start_minute, operating_end_minute").maybeSingle(),
  ]);
  if (slots.error || config.error || !config.data) {
    console.error("[orders] slot data load failed:", slots.error ?? config.error ?? "no service_config");
    return null;
  }
  return { slots: slots.data, hours: config.data };
}
