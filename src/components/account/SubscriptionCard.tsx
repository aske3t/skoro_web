import type { Subscription } from "@/lib/account/queries";
import { Sparkles } from "lucide-react";

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

export default function SubscriptionCard({
  subscription,
  detailed = false,
}: {
  subscription: Subscription | null;
  detailed?: boolean;
}) {
  // Нет абонемента — заглушка
  if (!subscription) {
    return (
      <div className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-6 shadow-card">
        <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          Абонемент
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          У вас пока нет активного абонемента. Свяжитесь с менеджером, чтобы
          подключить тариф.
        </p>
      </div>
    );
  }

  const used =
    subscription.total_deliveries - subscription.remaining_deliveries;
  const pct =
    subscription.total_deliveries > 0
      ? Math.min(100, Math.round((used / subscription.total_deliveries) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-brand/40 bg-brand/10 p-6 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/50 bg-brand/20 text-brand-glow">
          <Sparkles size={16} />
        </span>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
            Активный абонемент
          </div>
          <div className="font-display text-2xl text-ink">
            {subscription.tier_name}
          </div>
        </div>
      </div>

      {/* Прогресс остатка доставок */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <div className="font-display text-3xl text-ink">
            {subscription.remaining_deliveries}
            <span className="ml-1 font-mono text-xs text-ink-dim">
              / {subscription.total_deliveries} доставок
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
            {pct}% использовано
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {detailed && (
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
              Куплен
            </dt>
            <dd className="mt-1 text-ink">{fmtDate(subscription.purchased_at)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
              Действует до
            </dt>
            <dd className="mt-1 text-ink">{fmtDate(subscription.valid_until)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}