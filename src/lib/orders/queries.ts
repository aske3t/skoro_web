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

export type ClientLocation = { id: string; name: string; address: string };

/** Точки клиента для «Откуда» и проверки, что выбранная точка — его. */
export async function loadClientLocations(db: AdminClient, clientId: string): Promise<ClientLocation[]> {
  const { data, error } = await db
    .from("client_locations")
    .select("id, name, address")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Где лежит карточка заказа в группе: шаг 5 правит её по этим полям. */
export async function saveOrderMessage(
  db: AdminClient,
  orderId: string,
  chatId: number,
  messageId: number,
): Promise<void> {
  const { error } = await db.from("orders").update({ tg_chat_id: chatId, tg_message_id: messageId }).eq("id", orderId);
  if (error) throw error;
}

export type RecentOrder = {
  number: number | null;
  optionName: string | null;
  scheduledFor: string | null;
  status: string;
  price: number | null;
};

type RecentOrderRow = {
  number: number | null;
  scheduled_for: string | null;
  status: string;
  price: number | null;
  client_options: { custom_name: string | null; service_options: { name: string } | null } | null;
};

/** «Мои заказы»: последние заказы клиента (компании, а не одного контакта). */
export async function listRecentOrders(db: AdminClient, clientId: string, limit = 10): Promise<RecentOrder[]> {
  const { data, error } = await db
    .from("orders")
    .select("number, scheduled_for, status, price, client_options(custom_name, service_options(name))")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentOrderRow[]>();
  if (error) throw error;

  return data.map((row) => ({
    number: row.number,
    optionName: row.client_options?.custom_name ?? row.client_options?.service_options?.name ?? null,
    scheduledFor: row.scheduled_for,
    status: row.status,
    price: row.price,
  }));
}
