import { ArrowUpRight } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Тексты секции. Меняйте только их — вёрстка ниже подхватит изменения.
// `labels` — две транспортные наклейки справа: первая доставка и вторая.
// ────────────────────────────────────────────────────────────────────────────
const CONTENT = {
  title: "Первая доставка бесплатно, вторая за полцены",
  text: "Попробуйте Skoro без риска: первую доставку сделаем бесплатно, а на вторую дадим скидку 50 %, если оставите нам отзыв.",
  audience: "Для новых клиентов",
  cta: "Оставить заявку",
  ctaHref: "#contact",
  labels: [
    { title: "Первая доставка", value: "0 Kč", note: "Новым клиентам", code: "SK 0001 2026" },
    { title: "Вторая доставка", value: "−50 %", note: "За отзыв о нас", code: "SK 0002 2026" },
  ],
};

export default function Promotions() {
  const [first, second] = CONTENT.labels;

  return (
    <section id="promotions" className="relative isolate overflow-hidden bg-section py-20 md:py-28">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-section-warm via-section to-section-shadow"
      />
      <div className="noise-layer" />

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-16">
        {/* Слева — тёмный текст прямо на фоне секции, без карточки */}
        <div className="max-w-xl text-[#1D1425]">
          <p className="text-sm text-[#1D1425]/70">{CONTENT.audience}</p>
          <h2 className="mt-3 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1] tracking-[-0.015em]">
            {CONTENT.title}
          </h2>
          <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-[#1D1425]/80 md:text-lg">
            {CONTENT.text}
          </p>
          <a
            href={CONTENT.ctaHref}
            className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-[#1D1425] px-7 py-4 text-sm font-medium text-ink transition hover:bg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1425]"
          >
            {CONTENT.cta}
            <ArrowUpRight
              size={16}
              aria-hidden
              className="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </div>

        {/* Справа — две наклейки на посылку: вторая частично закрывает первую */}
        <div
          className="relative mx-auto h-[440px] w-full max-w-[500px] sm:h-[480px]"
          role="img"
          aria-label={CONTENT.labels.map((l) => `${l.title}: ${l.value}, ${l.note}`).join("; ")}
        >
          <ShippingLabel
            {...first}
            index={1}
            className="absolute left-0 top-0 w-[78%] rotate-[-5deg] sm:w-[72%]"
          />
          <ShippingLabel
            {...second}
            index={2}
            accent
            className="absolute bottom-0 right-0 w-[78%] rotate-[3deg] sm:w-[72%]"
          />
        </div>
      </div>
    </section>
  );
}

function ShippingLabel({
  title,
  value,
  note,
  code,
  index,
  accent,
  className,
}: {
  title: string;
  value: string;
  note: string;
  code: string;
  index: number;
  accent?: boolean;
  className: string;
}) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-md border-2 border-[#1D1425] bg-[#FBF8FE] text-[#1D1425] shadow-[0_24px_50px_-18px_rgba(14,8,22,0.55)] ${className}`}
    >
      {/* Шапка этикетки: отправитель и номер места */}
      <div className="flex items-center justify-between border-b-2 border-[#1D1425] px-4 py-2.5">
        <span className="font-display text-lg leading-none">SKORO u vás</span>
        <span className="text-xs">
          место <span className="font-semibold">{index}</span> из 2
        </span>
      </div>

      {/* Главное поле: что и сколько */}
      <div className="px-4 pb-4 pt-3">
        <div className="text-sm">{title}</div>
        <div
          className={`mt-1 font-display text-[clamp(3.5rem,9vw,5.25rem)] leading-[0.9] tracking-[-0.02em] ${
            accent ? "text-brand" : ""
          }`}
        >
          {value}
        </div>
      </div>

      {/* Нижняя строка: условие слева, штрихкод справа */}
      <div className="grid grid-cols-[1fr_auto] border-t-2 border-[#1D1425]">
        <div className="flex items-center border-r-2 border-[#1D1425] px-4 py-3 text-sm">{note}</div>
        <div className="px-4 py-2.5">
          <Barcode seed={code} />
          <div className="mt-1 text-center text-[10px] tracking-[0.18em]">{code}</div>
        </div>
      </div>
    </div>
  );
}

/** Штрихкод для вида: ширины полос детерминированно выводятся из строки, на сервере и в браузере одинаково. */
function Barcode({ seed }: { seed: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; x < 120; i++) {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    const w = (c % 3) + 1;
    const gap = ((c >> 2) % 2) + 1;
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg viewBox="0 0 120 34" className="h-8 w-28" preserveAspectRatio="none">
      {bars
        .filter((b) => b.x + b.w <= 120)
        .map((b) => (
          <rect key={b.x} x={b.x} y="0" width={b.w} height="34" fill="#1D1425" />
        ))}
    </svg>
  );
}
