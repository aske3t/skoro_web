import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  getActiveOrders,
  getActiveSubscription,
} from "@/lib/account/queries";
import SubscriptionCard from "@/components/account/SubscriptionCard";
import OrdersList from "@/components/account/OrdersList";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const [subscription, activeOrders] = await Promise.all([
    getActiveSubscription(supabase),
    getActiveOrders(supabase),
  ]);

    return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          Обзор
        </span>
        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center rounded-full bg-brand px-4 py-2 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-hover"
        >
          Новый заказ
        </Link>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        <SubscriptionCard subscription={subscription} />
        <OrdersList title="Активные заказы" orders={activeOrders} />
      </div>
    </div>
  );
}
