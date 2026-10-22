"use client";

import { ArrowUpRight } from "lucide-react";
import { useReveal } from "@/lib/useReveal";

// ────────────────────────────────────────────────────────────────────────────
// Тексты секции. Меняйте только их — вёрстка ниже подхватит изменения.
// `sheet.terms` — строки бланка договора справа: название условия и значение.
// ────────────────────────────────────────────────────────────────────────────
const CONTENT = {
  title: "Договор под ваш бизнес вместо общего прайса",
  text:
    "Если доставок много или они регулярные, закрепим цену и условия в индивидуальном договоре и возьмём логистику целиком: забор, доставку, возвраты и документы.",
  cta: "Обсудить договор",
  ctaHref: "#contact",
  note: "Ответим в течение рабочего дня",
  sheet: {
    title: "Договор на курьерские услуги",
    number: "№ ______",
    terms: [
      { label: "Заказчик", value: "Ваша компания" },
      { label: "Цена", value: "Фиксируем под ваш объём" },
      { label: "Маршруты", value: "Ваши точки и график" },
      { label: "Возвраты и выкуп", value: "Берём на себя" },
      { label: "Документы", value: "Акты, реестры, выгрузка в 1С" },
      { label: "Контакт", value: "Личный менеджер" },
    ],
    signature: "Подпись заказчика",
    stamp: "Согласовано",
  },
};

export default function Individual() {
  // Печать «опускается» на бланк один раз, когда он появляется на экране.
  const sheetRef = useReveal<HTMLDivElement>();

  return (
    <section id="individual" className="relative overflow-hidden bg-bg py-20 md:py-28">
      <div aria-hidden className="absolute inset-0 grid-lines opacity-15" />
      <div className="noise-layer" />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-20">
        {/* Слева — коротко и спокойно: главный здесь бланк справа */}
        <div className="max-w-xl">
          <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-ink">
            {CONTENT.title}
          </h2>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ink-muted md:text-lg">
            {CONTENT.text}
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <a
              href={CONTENT.ctaHref}
              className="group inline-flex items-center gap-2.5 rounded-full bg-brand px-7 py-4 text-sm font-medium text-ink transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow"
            >
              {CONTENT.cta}
              <ArrowUpRight
                size={16}
                aria-hidden
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
            <span className="text-sm text-ink-dim">{CONTENT.note}</span>
          </div>
        </div>

        {/* Справа — бланк договора: бумага, поля с отточиями, подпись и печать */}
        <div ref={sheetRef} className="relative mx-auto w-full max-w-[560px]">
          <div
            className="relative rotate-[-1.5deg] rounded-[6px] bg-[#EFE9F6] px-7 pb-9 pt-8 text-[#1D1425] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] sm:px-10 sm:pb-11 sm:pt-10"
            role="img"
            aria-label={`${CONTENT.sheet.title}: ${CONTENT.sheet.terms
              .map((t) => `${t.label} — ${t.value}`)
              .join("; ")}`}
          >
            {/* Перфорация сверху, как у отрывного бланка */}
            <div
              aria-hidden
              className="absolute inset-x-6 top-3 h-px"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #B8ADC6 0 6px, transparent 6px 12px)",
              }}
            />

            <div className="flex items-baseline justify-between gap-4 border-b border-[#1D1425]/80 pb-4">
              <h3 className="font-display text-xl leading-tight sm:text-2xl">{CONTENT.sheet.title}</h3>
              <span className="shrink-0 text-sm text-[#1D1425]/60">{CONTENT.sheet.number}</span>
            </div>

            <dl className="mt-6 space-y-4">
              {CONTENT.sheet.terms.map((term) => (
                <div key={term.label} className="flex flex-col gap-0.5 text-[15px] leading-snug sm:flex-row sm:items-end sm:gap-2">
                  <dt className="shrink-0 text-sm text-[#1D1425]/60 sm:text-[15px]">{term.label}</dt>
                  <span
                    aria-hidden
                    className="mb-[5px] hidden min-w-6 flex-1 border-b border-dotted border-[#B8ADC6] sm:block"
                  />
                  <dd className="font-medium sm:text-right">{term.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex items-end justify-between gap-6">
              <div className="w-1/2">
                <div className="h-8 border-b border-[#1D1425]/70" />
                <div className="mt-1.5 text-xs text-[#1D1425]/55">{CONTENT.sheet.signature}</div>
              </div>

              {/* Печать: единственное движение секции. Без анимации при prefers-reduced-motion. */}
              <div
                aria-hidden
                className="-mb-2 mr-1 select-none rounded-lg border-[3px] border-double border-brand px-4 py-2 font-display text-xl uppercase tracking-[0.08em] text-brand opacity-0 mix-blend-multiply transition-[opacity,transform] delay-300 duration-500 ease-[cubic-bezier(0.2,1.4,0.4,1)] [transform:rotate(-12deg)_scale(1.6)] motion-reduce:opacity-90 motion-reduce:transition-none motion-reduce:[transform:rotate(-12deg)] [.is-visible_&]:opacity-90 [.is-visible_&]:[transform:rotate(-12deg)_scale(1)]"
              >
                {CONTENT.sheet.stamp}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
