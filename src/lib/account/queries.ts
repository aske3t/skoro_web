import type { createClient } from  "@/lib/supabase/server"
import type { Tables } from "@/types/database"

//тип серверного клиента
type Client = Awaited<ReturnType<typeof createClient>>;

export type Profile = Tables<"profiles">;
export type Order = Tables<"orders">;
export type Payment = Tables<"payments">;
export type Subscription = Tables<"subscriptions">;

/** Профиль компании (1:1 с auth.users). Может отсутствовать, если лид ещё не заполнен. */
export async function getProfile(supabase: Client, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Активные заказы — статусы new / in_progress. RLS уже режет чужие строки. */
export async function getActiveOrders(supabase: Client): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .in("status", ["new", "in_progress"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** История заказов — завершённые и отменённые. */
export async function getOrderHistory(supabase: Client): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .in("status", ["delivered", "cancelled"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** История платежей, новые сверху. */
export async function getPayments(supabase: Client): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Активный абонемент (остаток доставок). Может не быть — тогда null. */
export async function getActiveSubscription(supabase: Client): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}