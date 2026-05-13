"use client";

import { createClient } from "@/lib/supabase/client";
import type { CalculatorData } from "./types";

/**
 * Грузит всю справочную таблицу для калькулятора одним батчем.
 * Все запросы идут параллельно — итоговое время = время самого медленного,
 * а не сумма по всем.
 */
export async function loadCalculatorData(): Promise<CalculatorData> {
  const supabase = createClient();

  const [zones, retailPoints, distances, skoro, slots] = await Promise.all([
    supabase.from("zones").select("*").order("display_order"),
    supabase.from("retail_points").select("*").order("display_order"),
    supabase.from("zone_distances").select("*"),
    supabase.from("skoro_pricing").select("*").single(),
    supabase.from("delivery_slots").select("*").order("display_order"),

  ]);

  // Каждый ответ имеет .data и .error. Бросаем первую же ошибку наверх,
  // чтобы UI показал понятное сообщение.
  for (const r of [zones, retailPoints, distances, skoro, slots]) {
    if (r.error) throw r.error;
  }

  return {
    zones: zones.data!,
    retailPoints: retailPoints.data!,
    distances: distances.data!,
    skoro: skoro.data!,
    slots: slots.data!
  };
}
