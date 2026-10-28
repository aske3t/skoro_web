type TariffItem = {
  label: string;
  price: string;
  sub?: string;
};

// Названия и подсказки — как в калькуляторе (Calculator.tsx: SLOT_TITLE, SLOT_HINT).
const items: TariffItem[] = [
  {
    label: "Экспресс",
    price: "240 Kč",
    sub: "Доставим в течение часа после заявки, курьер приедет за ≤30 минут",
  },
  {
    label: "За 3 часа",
    price: "180 Kč",
    sub: "Доставим в пределах 3 часов после заявки",
  },
  {
    label: "За день",
    price: "150 Kč",
    sub: "Время доставки — позже, чем через 3 часа после заявки",
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-12">
          <h2 className="max-w-2xl font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            Базовые{" "}
            <span className="italic text-brand-glow">тарифы.</span>
          </h2>
          {/* Было <p> внутри <p>: браузер разрывал абзац, разметка расходилась с сервером */}
          <div className="max-w-md text-sm leading-relaxed text-ink-muted md:text-base lg:ml-auto">
            <p>Стандартные тарифы для разовых заказов из&nbsp;точки&nbsp;A в&nbsp;точку&nbsp;B.</p>
            <p>
              Вы выбираете время доставки, а тариф зависит от того, сколько до него остаётся
              с&nbsp;момента заявки. Больше запас&nbsp;— ниже цена.
            </p>
          </div>
        </div>

        {/* Tariff table */}
        <ul className="mt-10 divide-y divide-hairline-strong rounded-2xl border border-hairline-strong bg-bg-soft shadow-card">
          {items.map(it => (
            <TariffRow key={it.label} item={it} />
          ))}
        </ul>

        <p className="mt-4 text-[13px] text-ink-muted">Все цены указаны без НДС.</p>
      </div>
    </section>
  );
}

function TariffRow({ item }: { item: TariffItem }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-6 px-5 py-5 md:px-8 md:py-6">
      <div>
        <div className="font-display text-xl leading-tight text-ink md:text-2xl">
          {item.label}
        </div>
        {item.sub && (
          <div className="mt-1 text-[13px] leading-snug text-ink-muted md:text-sm">{item.sub}</div>
        )}
      </div>
      <div className="whitespace-nowrap font-display text-2xl tabular-nums text-brand-glow md:text-3xl">
        {item.price}
      </div>
    </li>
  );
}
