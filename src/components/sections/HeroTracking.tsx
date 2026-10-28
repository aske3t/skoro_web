"use client";

import { useRef } from "react";
import { ArrowRight, FileSignature, HandCoins, MapPin, Package, Route, Truck } from "lucide-react";
import { AudienceSwitch } from "@/components/layout/AudienceSwitch";

// Карточка «Что можно нам поручить»: иконка подсказывает тип задачи, текст — что именно делаем.
const SERVICES = [
  { icon: Package, text: "Доставляем заказы из рук в руки от\u00a030\u00a0минут" },
  { icon: FileSignature, text: "Работаем с документами через доверенность" },
  { icon: HandCoins, text: "Работаем с деньгами и осуществляем выкуп товара" },
  { icon: Route, text: "Собираем мульти-маршруты под ваши задачи" },
  { icon: Truck, text: "Выполняем междугородние отправления" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/skoro.u.vas?igsh=Znp5ejlwbmk1ZHcy" },
  { label: "Telegram", href: "https://t.me/skorouvas" },
  { label: "Facebook", href: "https://www.facebook.com/share/1CALLj7NZE/?mibextid=wwXIfr" },
];

export default function HeroTracking() {
  return (
    <section className="clip-bottom-slope relative overflow-hidden bg-bg pb-40 pt-32 md:pt-40">
      {/* Background stack */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="absolute inset-0 ambient-glow" />
        <div className="noise-layer" />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Left column — editorial text */}
        <div className="max-w-2xl">
          {/* Слоган с визитки: тот же шрифт и акцент, линии по бокам; при загрузке выезжает слева направо */}
          {/* Кириллицы в Barlow нет: русские буквы берутся из Oswald (следующий в font-tagline,
              запасной Arial у Barlow отключён в layout.tsx). */}
          <p
            className="flex w-fit animate-slide-in-right items-center gap-4 font-tagline text-2xl font-extrabold italic leading-none text-ink motion-reduce:animate-none md:text-[1.75rem]"
          >
            <span aria-hidden className="h-px w-8 bg-brand-glow" />
            <span>
              Больше, чем <em className="text-brand-glow">курьер</em>
            </span>
            <span aria-hidden className="h-px w-8 bg-brand-glow" />
          </p>

          {/* Кто клиент: от выбора зависят версии сайта (сейчас — форма заявки, P-31). */}
          <AudienceSwitch variant="hero" className="mt-6" />

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

          <a
            href="#contact"
            className="group/btn relative mt-4 flex w-fit items-center gap-2 rounded-2xl bg-brand px-6 py-5 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-hover md:px-8 "
          >
            Связаться с нами
            <ArrowRight
              size={16}
              className="transition group-hover/btn:translate-x-1"
            />
          </a>

          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-hairline pt-6 md:max-w-lg">
            <Stat value="30 минут" label="Доставка по Брно" />
            <Stat value="1 день" label="Подключение" />
            <Stat value="100%" label="Страховка отправления" />
          </div>
        </div>

        {/* Right column — что можно поручить */}
        <div className="relative w-full max-w-[520px]">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-bg-soft/70 p-7 shadow-card backdrop-blur-sm md:p-8">
            <h2 className="font-display text-2xl leading-tight text-ink md:text-3xl">
              Что можно нам поручить
            </h2>

            <div className="mt-5 h-px w-full bg-hairline-strong" />
            <ul className="mt-6 space-y-4">
              {SERVICES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-pretty text-sm leading-relaxed text-ink md:text-base">
                  <Icon aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-glow md:mt-1" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="mt-7 border-t border-hairline-strong pt-5">
              <p className="text-sm text-ink-muted">Где смотреть нас</p>
              <SocialLinks />

              <a
                href="https://www.google.com/maps/"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 flex w-full items-center gap-4 rounded-2xl border border-hairline-strong px-4 py-3 transition hover:border-brand/50 hover:bg-brand/15"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-glow transition group-hover:bg-brand/25">
                  <MapPin aria-hidden size={20} />
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block text-sm text-ink md:text-base">Оставьте нам отзыв!</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">Google Maps</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Одна подсветка на все ссылки: переезжает к той, что под курсором или в фокусе
// (Fluid Hover Highlight с 21st.dev, без motion — координаты в style, анимация на CSS).
function SocialLinks() {
  const glideRef = useRef<HTMLSpanElement>(null);

  function glideTo(link: HTMLElement) {
    const glide = glideRef.current;
    if (!glide) return;
    // Появляется сразу на месте; едет только между ссылками и если анимации не отключены.
    const travel =
      glide.dataset.on === "true" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    glide.style.transitionProperty = travel ? "opacity, transform, width" : "opacity";
    glide.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    glide.style.width = `${link.offsetWidth}px`;
    glide.style.height = `${link.offsetHeight}px`;
    glide.dataset.on = "true";
  }

  function hide() {
    if (glideRef.current) glideRef.current.dataset.on = "false";
  }

  return (
    <div
      className="relative mt-3 flex flex-wrap gap-3"
      onPointerLeave={hide}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
    >
      <span
        ref={glideRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full bg-brand/15 opacity-0 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[on=true]:opacity-100"
      />
      {SOCIALS.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          onPointerEnter={(e) => glideTo(e.currentTarget)}
          onFocus={(e) => glideTo(e.currentTarget)}
          className="relative rounded-full border border-hairline-strong px-4 py-2 text-sm text-ink-muted transition-colors hover:border-brand/50 hover:text-ink focus-visible:border-brand/50 focus-visible:text-ink"
        >
          {label}
        </a>
      ))}
    </div>
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
