import { ArrowDown} from "lucide-react";
import { CouponBox, type Coupon } from "./CouponBox";

// ────────────────────────────────────────────────────────────────────────────
// Тексты секции. Меняйте только их — вёрстка ниже подхватит изменения.
// `coupons` — два купона, которые поднимаются из коробки справа: первая доставка и вторая.
// `stub` — надпись на отрывном корешке, `tone` — цвет купона: "violet" или "cream".
// ────────────────────────────────────────────────────────────────────────────
const CONTENT = {
  title: <>Первая доставка <span className="italic text-brand">бесплатно,</span> вторая за полцены</>,
  text: "Попробуйте нас без риска: первую доставку сделаем бесплатно, а на вторую дадим скидку 50 %, если оставите нам отзыв.",
  // Условия акции: подзаголовок и пункты списка, каждый пункт — отдельная строка.
  termsTitle: "УСЛОВИЯ АКЦИИ",
  terms: [
    "Действует на доставку в пределах города",
    "Для клиентов с зарегистрированным ЛК",
    <>
      Для подписчиков нашего{" "}
      <a
        href="https://www.instagram.com/skoro.u.vas?igsh=Znp5ejlwbmk1ZHcy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline decoration-[#1D1425]/40 underline-offset-4 transition hover:text-brand hover:decoration-brand"
      >
        Instagram
      </a>
    </>,
  ],
  audience: "Для новых клиентов",
  cta: "Оставить заявку",
  ctaHref: "#contact",
  coupons: [
    { title: "Первая доставка", value: "0 Kč", note: "Новым клиентам", stub: "Закажи", tone: "violet" },
    { title: "Вторая доставка", value: "−50 %", note: "За отзыв о нас", stub: "Оцени", tone: "cream" },
  ] satisfies [Coupon, Coupon],
};

export default function Promotions() {
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

          <h3 className="mt-7 text-base font-bold md:text-lg">{CONTENT.termsTitle}</h3>
          <ul className="mt-3 space-y-2 text-base leading-snug text-[#1D1425]/80 md:text-lg">
            {CONTENT.terms.map((term, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span aria-hidden className="size-1.5 shrink-0 -translate-y-[0.2em] rounded-full bg-[#1D1425]" />
                {/* Обёртка держит текст и ссылку одной строкой: иначе flex сделает их отдельными блоками */}
                <span>{term}</span>
              </li>
            ))}
          </ul>
          <a
            href={CONTENT.ctaHref}
            className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-[#1D1425] px-7 py-4 text-sm font-medium text-ink transition hover:bg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1425]"
          >
            {CONTENT.cta}
            <ArrowDown
              size={16}
              aria-hidden
              className="shrink-0 transition group-hover:translate-y-0.5"
            />
          </a>
        </div>

        {/* Справа — коробка, из которой поднимаются два купона */}
        <CouponBox
          coupons={CONTENT.coupons}
          label={CONTENT.coupons.map((c) => `${c.title}: ${c.value}, ${c.note}`).join("; ")}
        />
      </div>
    </section>
  );
}
