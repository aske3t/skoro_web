import type { Quote } from "@/lib/pricing";

const czk = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

/**
 * Превью стоимости в форме заявки. Пока тарифов нет (стратегии возвращают null),
 * блок не отображается и форма выглядит как раньше.
 */
export function DeliveryQuote({ quote }: { quote: Quote | null }) {
  if (!quote) return null;

  return (
    <div className="rounded-2xl border border-brand/40 bg-brand/10 p-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-label text-ink-muted">
          Предварительная стоимость
        </span>
        <span className="font-display text-2xl text-ink">{czk.format(quote.total)}</span>
      </div>
      {quote.breakdown.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink-muted">
          {quote.breakdown.map((line) => (
            <li key={line.label} className="flex justify-between gap-4">
              <span>{line.label}</span>
              <span>{czk.format(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
