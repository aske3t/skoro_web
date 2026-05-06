type TariffItem = {
  label: string;
  price: string;
  sub?: string;
};

const items: TariffItem[] = [
  {
    label: "Экспресс <60m",
    price: "240 Kč",
    sub: "Курьер на месте за ≤30 минут",
  },
  {
    label: "Слот в течение 3-х часов",
    price: "180 Kč",
    sub: "",
  },
  {
    label: "Слот в течение дня",
    price: "150 Kč",
    sub: "",
  },
];

export default function Tariffs() {
  return (
    <section
      id="tariffs"
      className="relative overflow-hidden bg-bg pb-20 pt-20"
    >
      {/* Background */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-20" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 40% at 100% 0%, rgba(146,90,244,0.10), transparent 60%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <span className="inline-block h-px w-8 bg-ink-muted" />
              Тарифы · разовые заказы
            </div>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.75rem,4.5vw,3rem)] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              Базовые{" "}
              <span className="italic text-brand-glow">тарифы.</span>
            </h2>
          </div>
          <p className="max-w-md self-end ml-auto text-sm leading-relaxed text-ink-muted md:text-base">
            Стандартные тарифы для разовых заказов A-B. <p>Цены зафиксированы для города, выбираете подходящую опцию и мы приезжаем.</p>
          </p>
        </div>

        {/* Tariff table */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-hairline-strong bg-bg-soft/60 shadow-card backdrop-blur-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-hairline-strong bg-bg-deep/60 px-5 py-2.5 font-mono text-[10px] uppercase tracking-label text-ink-dim md:px-6">
            <span>Услуга</span>
            <span>Тариф</span>
          </div>

          {/* Rows */}
          {items.map((it, i) => (
            <TariffRow key={it.label} item={it} last={i === items.length - 1} />
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-4 max-w-2xl font-mono text-[10px] uppercase tracking-label text-ink-dim">
          * Все цены указаны без НДС. Действуют в пределах Брно. Для регулярных
          клиентов — индивидуальный тариф.
        </p>
      </div>
    </section>
  );
}

function TariffRow({ item, last }: { item: TariffItem; last: boolean }) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 md:px-6 md:py-4 ${
        last ? "" : "border-b border-hairline"
      }`}
    >
      <div>
        <div className="font-display text-base text-ink md:text-lg">
          {item.label}
        </div>
        {item.sub && (
          <div className="mt-0.5 text-xs text-ink-muted">{item.sub}</div>
        )}
      </div>
      <div className="font-display text-lg tabular-nums text-brand-glow md:text-xl">
        {item.price}
      </div>
    </div>
  );
}
