const items = [
  "Заявка принята",
  "Маршрут рассчитан",
  "Курьер назначен",
  "Забор выполнен",
  "Доставка в пути",
  "Получатель уведомлен",
  "Подпись получена",
  "Отчет отправлен",
];

export default function MarqueeTicker() {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-bg-deep py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-mono text-[11px] uppercase tracking-label text-ink-muted">
        {doubled.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-4">
            <span
              className="h-[5px] w-[5px] rounded-full bg-brand-glow"
              aria-hidden
            />
            {t}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg-deep to-transparent" />
    </div>
  );
}
