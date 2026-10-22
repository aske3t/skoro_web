import { ArrowUpRight, Boxes, Handshake, Headset, Route, type LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Тексты секции. Меняйте только их — вёрстка ниже подхватит изменения.
// В заголовке `accent` выделяется курсивом и фирменным цветом.
// ────────────────────────────────────────────────────────────────────────────
const CONTENT = {
  tag: "Индивидуальные условия · логистика под ключ",
  title: { before: "Нужен свой", accent: "тариф", after: "под ваш бизнес?" },
  text:
    "Составим индивидуальный договор с ценой под ваши объёмы и маршруты. Возьмём логистику на себя целиком — от забора до отчётных документов.",
  points: [
    {
      Icon: Handshake,
      title: "Индивидуальный договор",
      text: "Цена и условия под ваши объёмы и график.",
    },
    {
      Icon: Route,
      title: "Маршруты под задачу",
      text: "Регулярные рейсы, мульти-точки, срочные выезды.",
    },
    {
      Icon: Boxes,
      title: "Логистика под ключ",
      text: "Забор, хранение, доставка и возвраты — одним подрядчиком.",
    },
    {
      Icon: Headset,
      title: "Личный менеджер",
      text: "Один контакт для всех вопросов и отчётов.",
    },
  ] satisfies { Icon: LucideIcon; title: string; text: string }[],
  cta: "Обсудить условия",
  ctaHref: "#contact",
  note: "Ответим в течение рабочего дня",
};

export default function Individual() {
  return (
    <section id="individual" className="relative overflow-hidden bg-bg py-16 md:py-20">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-20" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 45% 60% at 0% 50%, rgba(146,90,244,0.12), transparent 60%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-brand/40 bg-bg-soft/60 p-7 shadow-card backdrop-blur-sm md:p-10">
          <div className="noise-layer rounded-[1.75rem]" />

          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
            {/* Left: message + CTA */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
                <span className="inline-block h-px w-8 bg-ink-muted" />
                {CONTENT.tag}
              </div>

              <h2 className="mt-5 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
                {CONTENT.title.before}{" "}
                <span className="italic text-brand-glow">{CONTENT.title.accent}</span>{" "}
                {CONTENT.title.after}
              </h2>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted md:text-base">
                {CONTENT.text}
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5 lg:mt-auto lg:pt-8">
                <a
                  href={CONTENT.ctaHref}
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand px-6 py-4 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-hover"
                >
                  {CONTENT.cta}
                  <ArrowUpRight
                    size={14}
                    className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
                  {CONTENT.note}
                </span>
              </div>
            </div>

            {/* Right: what's included */}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CONTENT.points.map(({ Icon, title, text }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-hairline-strong bg-bg/40 p-5 transition duration-300 ease-out hover:-translate-y-1 hover:border-brand/50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand-glow">
                    <Icon size={18} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
