import { ArrowUpRight } from "lucide-react";

export default function Promotions() {
  return (
    <section
      id="promotions"
      className="relative isolate overflow-hidden bg-section py-24"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-section-warm via-section to-section-shadow"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 60% at 12% 0%, rgba(14,8,22,0.20), transparent 55%), radial-gradient(55% 55% at 88% 100%, rgba(146,90,244,0.30), transparent 55%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1240px] px-5 md:px-10">
        <article
          aria-label="Текущая акция"
          className="relative grid grid-cols-1 items-center gap-7 overflow-hidden rounded-[28px] border border-bg/15 bg-bg px-7 py-8 text-ink shadow-card md:px-12 md:py-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:gap-12"
        >
          <div className="noise-layer rounded-[28px] opacity-[0.04]" />

          <div className="relative z-10 flex min-w-0 flex-col gap-[18px]">
            <div className="flex items-center gap-3.5 font-mono text-[11px] uppercase tracking-label text-ink-dim">
              <span className="h-px w-8 bg-ink/30" />
              Акция
            </div>

            <h2 className="font-display text-[clamp(2.25rem,4.6vw,3.75rem)] font-extrabold leading-[0.95] tracking-[-0.02em] text-ink">
              Доставка{" "}
              <span className="italic text-brand-glow">бесплатно</span>,
              <br />
              вторая <span className="italic text-brand-glow">−50%</span>
            </h2>

            <p className="max-w-[56ch] text-sm leading-relaxed text-ink-muted">
              Получите первую доставку бесплатно и скидку{" "}
              <span className="italic text-brand-glow">50%</span> на вторую,
              если оставите нам отзыв.
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-stretch gap-5 lg:flex-row lg:gap-7">
            <div className="flex flex-col items-start justify-center border-b border-hairline pb-5 lg:items-end lg:border-b-0 lg:border-r lg:pb-0 lg:pr-7">
              <div className="font-display text-[clamp(4rem,6.5vw,6rem)] font-extrabold italic leading-[0.85] tracking-[-0.02em] text-brand-glow">
                1
                <span className="ml-0.5 align-[0.35em] text-[0.5em] text-ink">
                  +1
                </span>
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-label text-ink-dim">
                действует для новых клиентов
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-3.5 lg:min-w-[200px]">
              <a
                href="#contact"
                className="group inline-flex w-full items-center justify-between gap-3 rounded-full bg-brand px-7 py-[22px] font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-glow hover:text-bg"
              >
                <span>Оставить заявку</span>
                <ArrowUpRight
                  size={16}
                  className="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
