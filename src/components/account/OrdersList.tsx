import type { Order } from "@/lib/account/queries";
import OrderCard from "./OrderCard";

export default function OrdersList({
  title,
  orders,
  emptyMessage = "Заказов нет.",
}: {
  title: string;
  orders: Order[];
  emptyMessage?: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-hairline-strong p-6 text-center text-sm text-ink-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </section>
  );
}