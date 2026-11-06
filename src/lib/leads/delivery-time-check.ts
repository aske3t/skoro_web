"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { parsePragueLocal } from "../orders/prague-time.ts";
import { loadSlotData } from "../orders/queries.ts";
import { evaluateDeliveryTime } from "./delivery-time.ts";

export type DeliveryTimeCheck =
  | { status: "ok"; slotLabel: string }
  | { status: "past" | "outside_hours" | "invalid" | "unavailable" };

/**
 * Живая подсказка слота для формы: время трактуется как пражское и считается на сервере.
 * Только подсказка — при отправке submitLead проверяет время заново.
 */
export async function checkDeliveryTime(raw: string): Promise<DeliveryTimeCheck> {
  const deliveryAt = parsePragueLocal(String(raw ?? ""));
  if (!deliveryAt) return { status: "invalid" };

  try {
    const data = await loadSlotData(createAdminClient());
    if (!data) return { status: "unavailable" };

    const result = evaluateDeliveryTime(new Date(), deliveryAt, data);
    if (result.status === "ok") return result;
    return { status: result.status === "no_slot" ? "unavailable" : result.status };
  } catch (error) {
    console.error("[leads] delivery time check failed:", error);
    return { status: "unavailable" };
  }
}
