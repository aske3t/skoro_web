"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Clock } from "lucide-react";

// Средняя цена разового заказа по базовым тарифам — база для расчёта экономии.
const REGULAR_PRICE = 190;

type Subscription = {
  name: string;
  pricePerMonth: number;
  ordersPerMonth: number;
};

// Цена за доставку и экономия считаются из этих двух чисел, вручную их не задаём.
const tiers: Subscription[] = [
  { name: "Иногда", pricePerMonth: 2700, ordersPerMonth: 15 },
  { name: "Регулярно", pricePerMonth: 5600, ordersPerMonth: 35 },
  { name: "Ежедневно", pricePerMonth: 10800, ordersPerMonth: 75 },
  { name: "Без остановки", pricePerMonth: 13000, ordersPerMonth: 100 },
];

// Шкала ползунка. Абонемент действует от своего объёма до порога следующего.
const MIN = 0;
const MAX = 120;
const THUMB = 24; // px, как в .range-dual (globals.css)
const DEFAULT_RANGE: [number, number] = [25, 45];

type Zone = { tier: Subscription | null; from: number; to: number };

// Участки шкалы: до первого порога — разовые заказы, дальше — абонементы по нарастающей.
const ZONES: Zone[] = [
  { tier: null, from: MIN, to: tiers[0].ordersPerMonth },
  ...tiers.map((tier, i) => ({
    tier,
    from: tier.ordersPerMonth,
    to: tiers[i + 1]?.ordersPerMonth ?? MAX,
  })),
];
const TICKS = [...ZONES.map(z => z.from), MAX];

const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});
const formatCzk = (n: number) => czkFormatter.format(n);

function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
const deliveries = (n: number) => plural(n, ["доставка", "доставки", "доставок"]);

function perOrder(t: Subscription) {
  return Math.round(t.pricePerMonth / t.ordersPerMonth);
}

function saving(t: Subscription) {
  const regular = t.ordersPerMonth * REGULAR_PRICE;
  const amount = regular - t.pricePerMonth;
  return { regular, amount, pct: Math.round((amount / regular) * 100) };
}

// Абонемент для n доставок в месяц — последний, чей объём уже набран (как участки на шкале).
function tierFor(n: number): Subscription | null {
  let found: Subscription | null = null;
  for (const t of tiers) if (n >= t.ordersPerMonth) found = t;
  return found;
}

export default function Abons() {
  const [range, setRange] = useState<[number, number]>(DEFAULT_RANGE);
  const [low, high] = range;
  // Рекомендация — по середине диапазона: типичный месяц клиента.
  const recommended = tierFor(Math.round((low + high) / 2));

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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-12">
          <h2 className="max-w-2xl font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            Больше выгоды с{" "}
            <span className="italic text-brand-glow">абонементами!</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted md:text-base lg:ml-auto">
            Получаете приоритет и фиксированную цену на все опции доставок.
          </p>
        </div>

        {/* Главное отличие абонемента от разовых тарифов — крупно и до ползунка */}
        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-brand/40 bg-brand/10 p-5 md:gap-5 md:p-7">
          <Clock aria-hidden strokeWidth={1.5} className="mt-0.5 h-7 w-7 shrink-0 text-brand-glow md:h-9 md:w-9" />
          <div>
            <p className="font-display text-2xl leading-tight text-ink md:text-3xl">
              Доставка в нужное вам время — по одной цене
            </p>
            {/* Цены слотов — как в секции «Тарифы» (Tariffs.tsx) */}
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted md:text-base">
              Разовые заказы стоят от 150 до 240&nbsp;Kč в зависимости от срочности. С абонементом слотов
              нет: время доставки выбираете вы, а цена за доставку одна — без доплат за срочность и временные окна.
            </p>
          </div>
        </div>

        {/* Шкала — она же прайс: участки шкалы — абонементы, под ней выбранный. Без рамки — прямо на фоне секции */}
        <div className="mt-14">
          <p className="text-sm text-ink-muted md:text-base">Сколько доставок у вас в месяц?</p>
          <p className="mt-2 font-display text-[clamp(2.5rem,6vw,4rem)] leading-none tabular-nums text-ink">
            {formatRange(low, high)}
            <span className="ml-3 align-middle text-xl text-ink-muted md:text-2xl">{deliveries(high)}</span>
          </p>

          <div className="mt-8">
            <DeliveryScale value={range} active={recommended} onChange={setRange} />
          </div>

          <div aria-live="polite" className="mt-10 border-t border-hairline-strong pt-8">
            {recommended ? <Recommendation tier={recommended} /> : <NoSubscription />}
          </div>
        </div>

        {/* Условия — по одному на строку */}
        <ul className="mt-10 space-y-1.5 border-t border-hairline-strong pt-6 text-[13px] leading-relaxed text-ink-muted">
          {[
            `Экономию считаем против того же числа разовых заказов по ${REGULAR_PRICE} Kč — это средняя цена заказа по базовым тарифам.`,
            "Все цены указаны без НДС.",
            "Действуют в пределах Брно.",
            "Для регулярных клиентов — индивидуальный тариф.",
            "Неиспользованный остаток абонемента можно использовать в следующем месяце.",
          ].map(note => (
            <li key={note} className="flex max-w-3xl gap-2">
              <span aria-hidden className="text-brand-glow">*</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function formatRange(low: number, high: number) {
  const fmt = (n: number) => (n >= MAX ? `${MAX}+` : String(n));
  return low === high ? fmt(low) : `${fmt(low)}–${fmt(high)}`;
}

function Recommendation({ tier }: { tier: Subscription }) {
  const s = saving(tier);
  return (
    // Три смысловых блока — кто, сколько, выгода — разделены линиями: на телефоне горизонтальными, шире — вертикальными.
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-12">
      <div className="flex flex-col justify-end">
        <p className="text-sm text-ink-muted md:text-base">Вам подходит</p>
        <p className="mt-2 font-display text-3xl leading-tight text-brand-glow md:text-4xl">{tier.name}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {tier.ordersPerMonth} {deliveries(tier.ordersPerMonth)} в месяц
        </p>
      </div>
      <div className="flex flex-col justify-end border-t border-hairline pt-6 md:border-l md:border-t-0 md:border-hairline-strong md:pl-12 md:pt-0">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-5xl leading-none tabular-nums text-ink md:text-6xl">
            {formatCzk(tier.pricePerMonth)}
          </span>
        </p>
        <p className="mt-2 text-sm text-ink">{perOrder(tier)}&nbsp;Kč за доставку в любое время</p>
      </div>
      <dl className="flex flex-col justify-end space-y-1.5 border-t border-hairline pt-6 text-sm md:border-l md:border-t-0 md:border-hairline-strong md:pl-12 md:pt-0 md:text-base">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Без абонемента</dt>
          <dd className="tabular-nums text-ink-muted line-through decoration-ink-muted/60">
            {formatCzk(s.regular)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Экономия</dt>
          <dd className="whitespace-nowrap font-medium tabular-nums text-brand-glow">
            {formatCzk(s.amount)} · {s.pct}&nbsp;%
          </dd>
        </div>
      </dl>
    </div>
  );
}

function NoSubscription() {
  return (
    <div>
      <p className="text-sm text-ink-muted md:text-base">Абонемент пока не нужен</p>
      <p className="mt-2 font-display text-3xl leading-tight text-ink md:text-4xl">Выгоднее разовые тарифы</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Абонемент окупается от {tiers[0].ordersPerMonth} доставок в месяц. До этого —{" "}
        <a
          href="#tariffs"
          className="text-ink underline decoration-brand-glow/60 underline-offset-4 transition-colors hover:text-brand-glow"
        >
          базовые тарифы
        </a>
        .
      </p>
    </div>
  );
}

// Двойной ползунок «от–до» по образцу Slider06 (21st.dev): заливка между ручками и бледное
// продолжение до курсора при наведении. Без Radix и NumberFlow — два нативных input range,
// поэтому работают клавиатура, скринридер и касание. Стили ручек — .range-dual в globals.css.
// Под дорожкой — участки абонементов; клик по участку ставит ползунок на весь его диапазон.
function DeliveryScale({
  value,
  active,
  onChange,
}: {
  value: [number, number];
  active: Subscription | null;
  onChange: (value: [number, number]) => void;
}) {
  const [low, high] = value;
  const boxRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const share = (v: number) => (v - MIN) / (MAX - MIN);
  // Ручка не выходит за края поля, поэтому шкала начинается и кончается на полручки внутри.
  const at = (v: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${share(v)})`;
  const span = (from: number, to: number) => `calc((100% - ${THUMB}px) * ${share(to) - share(from)})`;

  function trackPointer(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const raw = ((e.clientX - rect.left - THUMB / 2) / (rect.width - THUMB)) * (MAX - MIN) + MIN;
    setPreview(Math.max(MIN, Math.min(MAX, Math.round(raw))));
  }

  const ghost: [number, number] | null =
    preview === null ? null : preview < low ? [preview, low] : preview > high ? [high, preview] : null;

  return (
    <div>
      <div
        ref={boxRef}
        className="relative h-11"
        onPointerMove={trackPointer}
        onPointerLeave={() => setPreview(null)}
      >
        <div aria-hidden className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-hairline-strong" />
        {ghost && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand/30"
            style={{ left: at(ghost[0]), width: span(ghost[0], ghost[1]) }}
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: at(low), width: span(low, high) }}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={low}
          aria-label="Минимум доставок в месяц"
          aria-valuetext={`от ${low}`}
          onChange={e => onChange([Math.min(Number(e.target.value), high), high])}
          className="range-dual"
          // Когда ручки сошлись у правого края, нижняя должна быть сверху, иначе её не сдвинуть.
          style={{ zIndex: low > MAX - 10 ? 3 : 2 }}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={high}
          aria-label="Максимум доставок в месяц"
          aria-valuetext={high >= MAX ? `${MAX} и больше` : `до ${high}`}
          onChange={e => onChange([low, Math.max(Number(e.target.value), low)])}
          className="range-dual"
          style={{ zIndex: 2 }}
        />
      </div>

      {/* Участки абонементов — те же координаты, что у дорожки */}
      <div className="relative mt-3 h-2.5 lg:h-16">
        {ZONES.map(z => {
          const isActive = z.tier ? z.tier.name === active?.name : active === null;
          const label = z.tier ? z.tier.name : "Разовые";
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange([z.from, z.to >= MAX ? MAX : z.to - 1])}
              aria-pressed={isActive}
              aria-label={
                z.tier
                  ? `${z.tier.name}: от ${z.from} доставок, ${formatCzk(z.tier.pricePerMonth)} в месяц`
                  : `Разовые заказы: до ${z.to - 1} доставок`
              }
              className={`absolute inset-y-0 flex flex-col justify-center overflow-hidden rounded-full border text-left lg:rounded-lg transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow lg:px-3 ${
                isActive
                  ? "border-brand bg-brand/20 text-ink"
                  : "border-hairline-strong text-ink-muted hover:border-brand/50 hover:text-ink"
              }`}
              // 2px зазор между участками
              style={{ left: `calc(${at(z.from)} + 1px)`, width: `calc(${span(z.from, z.to)} - 2px)` }}
            >
              {/* На узких экранах названий не хватит места: там выбранный абонемент — в панели ниже */}
              <span className="hidden truncate text-[13px] font-medium leading-tight lg:block">{label}</span>
              <span className="hidden truncate text-[13px] tabular-nums leading-tight opacity-80 lg:block">
                {z.tier ? `${formatCzk(z.tier.pricePerMonth)}/мес` : "по тарифам"}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-hidden className="relative mt-2 h-5 text-[13px] tabular-nums text-ink-muted">
        {TICKS.map(t => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: at(t) }}>
            {t >= MAX ? `${t}+` : t}
          </span>
        ))}
      </div>
    </div>
  );
}
