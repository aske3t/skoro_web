import type { Quote } from "@/lib/pricing";

const czk = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

/**
 * Превью стоимости в форме заявки. Пока тарифов нет (стратегии возвращают null),
 * блок не отображается и форма выглядит как раньше.
 */
export function DeliveryQuote({ quote }: { quote: Quote | null }) {
  if (!quote) return null;

  return (
    <div className="mt-3 border border-[#925AF4]/40 bg-[#925AF4]/[0.08] p-4 text-[#1D1425]" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] text-[#1D1425]/70">
          Предварительная стоимость
        </span>
        <span className="font-display text-2xl">{czk.format(quote.total)}</span>
      </div>
      {quote.breakdown.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-[#1D1425]/70">
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
