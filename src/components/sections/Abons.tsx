import {Info} from "lucide-react";
const REGULAR_PRICE = 190

type Subscribition = {
    name: string;
    pricePerMonth: number;
    ordersPerMonth: number;
    pricePerOrder: number;
    regularPrice: number;
    highlight: boolean;
}

const tiers: Subscribition[] = [
    {
        name: "Новичок",
        pricePerMonth: 2700,
        ordersPerMonth: 15,
        pricePerOrder: 180,
        regularPrice: REGULAR_PRICE,
        highlight: false,
    },
        {
        name: "Таксист",
        pricePerMonth: 5600,
        ordersPerMonth: 35,
        pricePerOrder: 180,
        regularPrice: REGULAR_PRICE,
        highlight: true,
    },
        {
        name: "Ветеран уличных гонок",
        pricePerMonth: 10800,
        ordersPerMonth: 75,
        pricePerOrder: 180,
        regularPrice: REGULAR_PRICE,
        highlight: false,
    },
        {
        name: "Иркутский бомбила",
        pricePerMonth: 13000,
        ordersPerMonth: 100,
        pricePerOrder: 180,
        regularPrice: REGULAR_PRICE,
        highlight: false,
    },

]

export default function Abons() {
  return (
    <section
      id="abons"
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
              Абонементы · фиксированная цена
            </div>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.75rem,4.5vw,3rem)] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              Больше выгоды с{" "}
              <span className="italic text-brand-glow">абонементами!</span>
            </h2>
          </div>
          <p className="max-w-md self-end ml-auto text-sm leading-relaxed text-ink-muted md:text-base">
            Получаете приоритет и фиксированную цену на все опции доставок. <p>Никакой доплаты за срочность и временные окна, считаем всё одинаково.</p>
          </p>
        </div>

        {/* Tariff table */}
        <div className="mt-10 grid grid-cols-1 gap-3">
          {/* Table header */}
          <div className="flex items-start gap-4 rounded-2xl border border-brand/40 bg-brand/10 p-5 shadow-card backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/50 bg-brand/20 text-brand-glow">
            <Info size={18} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
            Как мы считали
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">
            Сравниваем фиксированную месячную цену по абонементу с разовой стоимостью
            того же количества заказов по тарифу <span className="font-mono text-ink-muted">200 Kč/заказ</span>.
            <p>Это средняя цена за заказ, которую платят заказчики за наши услуги, выведенная из месяца использования услуг по ценам базового тарифа.</p>
        </p>
      </div>
    </div>

          {/* Rows */}
          {tiers.map((tier) => (
            <AbonsCard key={tier.name} tier={tier} />
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

function AbonsCard({tier}: {tier: Subscribition}) {
return (
    <div className={`rounded-2xl border p-5 shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:border-brand/50 hover:shadow-brand ${
      tier.highlight ? "border-brand bg-brand/10" : "border-hairline-strong bg-bg-soft/60"
    }`}>
    {/* Бейдж сверху — только для highlight */}
      {tier.highlight && (
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 font-mono text-[10px] uppercase tracking-label text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
      Большинство выбирают
    </div>
  )}
  {/* Сравнение */}
  <div className="mt-4 grid grid-cols-[1fr_1px_1fr] gap-5 items-stretch">
    {/* С абонементом */}
    <div>
      <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
        С абонементом
      </div>
      <div className="mt-2 font-display text-3xl text-ink">
        {tier.pricePerMonth.toLocaleString("cs-CZ")} Kč
        <span className="ml-1 font-mono text-xs text-ink-dim">/мес</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-muted">
        <li>{tier.ordersPerMonth} заказов</li>
        <li>{tier.pricePerOrder} Kč за заказ</li>
      </ul>
    </div>

    {/* Вертикальный разделитель */}
    <div className="bg-hairline-strong" />

    {/* Без абонемента */}
    <div className="opacity-70">
      <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        Без абонемента
      </div>
      <div className="mt-2 font-display text-3xl text-ink-muted line-through decoration-ink-dim">
        {(tier.ordersPerMonth * REGULAR_PRICE).toLocaleString("cs-CZ")} Kč
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-muted">
        <li>{tier.ordersPerMonth} заказов</li>
        <li>{REGULAR_PRICE} Kč за заказ</li>
      </ul>
    </div>
  </div>
</div>
    )
}