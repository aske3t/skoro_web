import type { Order } from "@/lib/account/queries";

const STATUS_LABEL: Record<Order["status"], string> = {
  new: "Новый",
  in_progress: "В пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_STYLE: Record<Order["status"], string> = {
  new: "border-brand/40 bg-brand/10 text-brand-glow",
  in_progress: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  delivered: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  cancelled: "border-red-400/40 bg-red-400/10 text-red-300",
};

const fmtDate = (iso: string | null) =>
  iso == null
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));

const fmtMoney = (amount: number | null) =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
      }).format(amount);

export default function OrderCard({ order }: { order: Order }) {
  return (
    <article className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-brand">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          #{order.id.slice(0, 8)}
        </span>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-label ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </header>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            Откуда
          </div>
          <div className="mt-1 text-sm text-ink">{order.from_address ?? "—"}</div>
        </div>
        <div aria-hidden className="text-ink-dim">→</div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            Куда
          </div>
          <div className="mt-1 text-sm text-ink">{order.to_address ?? "—"}</div>
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between border-t border-hairline pt-3 font-mono text-[11px] uppercase tracking-label">
        <span className="text-ink-muted">{fmtDate(order.created_at)}</span>
        <span className="text-ink">{fmtMoney(order.price)}</span>
      </footer>
    </article>
  );
}