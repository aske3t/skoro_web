import type { Payment } from "@/lib/account/queries";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const fmtMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const STATUS_LABEL: Record<string, string> = {
  paid: "Оплачен",
  pending: "В обработке",
};

const STATUS_STYLE: Record<string, string> = {
  paid: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-300",
};

export default function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-hairline-strong p-6 text-center text-sm text-ink-muted">
        Платежей пока нет.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: вертикальный стек карточек */}
      <ul className="grid gap-3 md:hidden">
        {payments.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-ink">
                {fmtMoney(p.amount, p.currency)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-label ${
                  STATUS_STYLE[p.status] ?? "border-hairline text-ink-muted"
                }`}
              >
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <span>{fmtDate(p.paid_at ?? "")}</span>
              <span>{p.method ?? "—"}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: таблица */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-hairline text-left font-mono text-[10px] uppercase tracking-label text-ink-dim">
            <th className="py-3 pr-4">Дата</th>
            <th className="py-3 pr-4">Метод</th>
            <th className="py-3 pr-4 text-right">Сумма</th>
            <th className="py-3 text-right">Статус</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-hairline last:border-0">
              <td className="py-4 pr-4 text-sm text-ink">{fmtDate(p.paid_at ?? "")}</td>
              <td className="py-4 pr-4 font-mono text-[11px] uppercase tracking-label text-ink-muted">
                {p.method ?? "—"}
              </td>
              <td className="py-4 pr-4 text-right font-display text-lg text-ink">
                {fmtMoney(p.amount, p.currency)}
              </td>
              <td className="py-4 text-right">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-label ${
                    STATUS_STYLE[p.status] ?? "border-hairline text-ink-muted"
                  }`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}