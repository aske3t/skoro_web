// src/app/dashboard/orders/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getActiveOrders, getOrderHistory } from "@/lib/account/queries";
import OrdersList from "@/components/account/OrdersList";

export default async function OrdersPage() {
  const supabase = await createClient();

  // Параллельно — как Promise.all в калькуляторе.
  const [active, history] = await Promise.all([
    getActiveOrders(supabase),
    getOrderHistory(supabase),
  ]);

  return (
    <div className="space-y-10">
      <OrdersList title="Активные заказы" orders={active} />
      <OrdersList title="История заказов" orders={history} />
    </div>
  );
}
