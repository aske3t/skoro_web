"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HeroTracking() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = trackingNumber.trim();
    if (!v) return;
    router.push(`/tracking?id=${encodeURIComponent(v)}`);
  }

  return (
    <section className="clip-bottom-slope relative overflow-hidden bg-bg pb-40 pt-32 md:pt-40">
      {/* Background stack */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="absolute inset-0 ambient-glow" />
        <div className="noise-layer" />
        {/* Ghost wordmark */}
        <div className="absolute -right-10 top-24 hidden select-none md:block">
          <span className="ghost-type font-display text-[22rem] leading-none">
            Skoro
          </span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Left column — editorial text */}
        <div className="max-w-2xl">
          {/* Manifest tag */}
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
            <span className="inline-block h-px w-8 bg-ink-muted" />
            Главное · доставка для бизнеса
            <span className="rounded-full border border-hairline-strong px-2.5 py-0.5 text-brand-glow">
              Live
            </span>
          </div>

          {/* Editorial headline */}
          <h1 className="mt-7 font-display text-[clamp(3rem,8vw,6.5rem)] font-normal leading-[0.95] tracking-[-0.02em] text-ink">
            Курьер
            <br />
            <span className="italic text-brand-glow">по запросу</span>
            <br />
            вашего бизнеса.
          </h1>

          {/* Sub-copy */}
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-muted md:text-xl">
            Курьерская служба с ориентиром на ваш бизнес&nbsp;
            <span className="text-ink">и интересы</span>.
            <br />
            Занимайтесь фирмой - сервис оставьте на нас.
          </p>

          {/* Console tracking input */}
          {/*<form
            onSubmit={onSubmit}
            className="group mt-10 flex w-full items-stretch overflow-hidden rounded-2xl border border-hairline-strong bg-bg-deep/80 shadow-card backdrop-blur transition focus-within:border-brand/60 focus-within:shadow-brand"
          >
            <div className="hidden items-center gap-2 border-r border-hairline px-5 font-mono text-[11px] uppercase tracking-label text-ink-dim sm:flex">
              <span className="h-2 w-2 rounded-full bg-brand-glow" />
              Track
            </div>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              type="text"
              spellCheck={false}
              placeholder="SK-XXXX-XXXX-XXXX"
              className="min-w-0 flex-1 bg-transparent px-5 py-5 font-mono text-base text-ink placeholder:text-ink-dim focus:outline-none md:text-lg"
            />*/}

          <button
            type="submit"
            className="group/btn relative mt-4 flex items-center gap-2 rounded-2xl bg-brand px-6 py-5 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-hover md:px-8 "
          >
            Связаться с нами
            <ArrowRight
              size={16}
              className="transition group-hover/btn:translate-x-1"
            />
          </button>
          
          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-hairline pt-6 md:max-w-lg">
            <Stat value="30 минут" label="Доставка по Брно" />
            <Stat value="1 день" label="Подключение" />
            <Stat value="100%" label="Страховка отправления" />
          </div>
        </div>

        {/* Right column — бета */}
            <div className="relative w-full max-w-[520px]">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-bg-soft/70 p-7 shadow-card backdrop-blur-sm md:p-8">
              <div className="noise-layer rounded-[1.75rem]"/>
              <div aria-hidden className="absolute inset-0 grid-lines-fine opacity-20"/>

              <div className="relative">
                <div>
                <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
                
                </div>
                <h3 className="mt-2 font-display text-2xl leading-tight text-ink md:text-3xl">
                  Что можно нам <span className="italic text-brand-glow">поручить</span>
                </h3>
              </div>

                <div className="mt-5 h-px w-full bg-hairline-strong"/>
                <ul className="mt-6 space-y-4">
                  <li className="flex gap-3 text-sm leading-relaxed text-ink md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-glow" />
                      Доставляем заказы из рук в руки от 30 минут
                  </li>
                  <li className="flex gap-3 text-sm leading-relaxed text-ink md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-glow" />
                      Работаем с документами через доверенность
                  </li>
                  <li className="flex gap-3 text-sm leading-relaxed text-ink md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-glow" />
                      Работаем с деньгами и осуществляем выкуп товара
                  </li>

                  <li className="flex gap-3 text-sm leading-relaxed text-ink md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-glow" />
                      Собираем мульти-маршруты под ваши задачи
                  </li>

                  <li className="flex gap-3 text-sm leading-relaxed text-ink md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-glow" />
                      Выполняем междугородние отправления
                  </li>
                </ul>

                <div className="mt-7 border-t border-hairline-strong pt-5">
                  <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
                    Где смотреть нас
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href="https://www.instagram.com/skoro.u.vas?igsh=Znp5ejlwbmk1ZHcy" className="rounded-full border border-hairline-strong bg-bg/40 px-4 py-2 text-sm text-ink-muted transition hover:border-brand/50 hover:bg-brand/15 hover:text-ink">
                      Instagram
                    </a>

                    <a href="#" className="rounded-full border border-hairline-strong bg-bg/40 px-4 py-2 text-sm text-ink-muted transition hover:border-brand/50 hover:bg-brand/15 hover:text-ink">
                      Telegram
                    </a>

                    <a href="https://www.facebook.com/share/1CALLj7NZE/?mibextid=wwXIfr" className="rounded-full border border-hairline-strong bg-bg/40 px-4 py-2 text-sm text-ink-muted transition hover:border-brand/50 hover:bg-brand/15 hover:text-ink">
                      Facebook
                    </a>
                  </div>
                  <a
                  href="https://www.google.com/maps/"
                  target="blank"
                  rel="noopener noreferrer"
                  className="group mt-3 inline-flex w-full items-center gap-4 rounded-2xl border border-hairline-strong bg-bg/40 px-4 py-3 transition hover:border-brand/50 hover:bg-brand/15">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-glow transition group-hover:bg-brand/25">
                    <MapPin size={22}/>
                  </span>
                  <span className="min-w-0 leading-snug">
                    <span className="block font-mono text-[10px] uppercase tracking-label text-ink-dim">
                      Google Maps
                    </span>
                    <span className="mt-1 block text-sm text-ink md:text-base">
                      Оставьте нам отзыв!
                    </span>
                  </span>
                  </a>
                </div>

              </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl leading-none text-ink md:text-4xl">
        {value}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </div>
    </div>
  );
}
