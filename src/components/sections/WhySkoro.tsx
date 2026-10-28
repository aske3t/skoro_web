"use client";

import { useRef } from "react";
import {
  CircleChevronDown,
  FileCheck,
  ShoppingBasket,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Calculator from "@/components/calculator/Calculator";
import { useReveal } from "@/lib/useReveal";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: FileCheck,
    title: "Доставка документов",
    description:
      "Подпишем за вас документы, представим ваши интересы в возможной форме и доставим на указанный адрес.",
  },
  {
    icon: Zap,
    title: "Экспресс-доставка",
    description:
      "Довезём ваши заказы до получателя, примем оплату и настроим работу с вашей системой.",
  },
  {
    icon: ShoppingBasket,
    title: "Закупки и снабжение",
    description:
      "Предоставим регулярные и разовые пополнения расходных материалов под нужды вашего бизнеса по согласованному с вами графику.",
  },
  {
    icon: Truck,
    title: "Переезды и крупногабарит",
    description:
      "Организуем переезд и перевозку крупногабаритного груза.\nПереезд офиса, доставку мебели.",
  },
];

export default function WhySkoro() {
  return (
    <section
      id="why"
      className="clip-both-slopes relative -mt-[72px] overflow-hidden bg-bg pb-32 pt-36"
    >
      {/* Background */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 90% 10%, rgba(146,90,244,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(179,143,185,0.12), transparent 65%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Top row — title & calculator */}
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="mt-6 max-w-2xl font-display text-[clamp(2.25rem,6vw,4.75rem)] leading-[1] tracking-[-0.02em] text-ink">
              Нет нужды искать курьера под каждую задачу.
              <br />
              Мы закроем&nbsp;
              <span className="italic text-brand-glow">все</span>
              <br />
              за один маршрут.
            </h2>
            <p className="mt-7 max-w-lg text-pretty text-base leading-relaxed text-ink-muted md:text-lg">
              Мы подойдём как развивающимся предприятиям, так и уже собранному бизнесу.
              Создаём логистику и заменяем уже существующую в случае форс-мажора.
              Ознакомьтесь с нашим спектром услуг более детально.
            </p>

            {/* Скролл-хинт к списку услуг */}
            <a
              href="#why-services"
              aria-label="К списку услуг"
              className="group mt-12 inline-block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
            >
              <span className="block animate-float-slow motion-reduce:animate-none">
                <CircleChevronDown
                  size={64}
                  strokeWidth={1.25}
                  className="text-ink-muted transition duration-500 ease-out group-hover:translate-y-1 group-hover:scale-110 group-hover:text-brand-glow"
                />
              </span>
            </a>
          </div>

          <Calculator />
        </div>

        <ServiceList />
      </div>
    </section>
  );
}

// Список услуг: фиолетовая полоса скользит к строке под курсором (Interactive List Preview
// с 21st.dev, без GSAP и картинок — координаты в style, анимация на CSS). Строки не кликаются,
// поэтому подсветка мягкая, без инверсии текста. На сенсорных экранах полосы нет.
function ServiceList() {
  const revealRef = useReveal<HTMLDivElement>();
  const barRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);

  function activate(row: HTMLElement | null) {
    const bar = barRef.current;
    if (!bar || !row || !window.matchMedia("(hover: hover)").matches) return;
    // Первое появление — на месте; дальше полоса едет, если анимации не отключены.
    const travel =
      bar.dataset.on === "true" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bar.style.transitionProperty = travel ? "opacity, transform, height" : "opacity";
    bar.style.transform = `translateY(${row.offsetTop}px)`;
    bar.style.height = `${row.offsetHeight}px`;
    bar.dataset.on = "true";
    if (activeRef.current && activeRef.current !== row) activeRef.current.dataset.active = "false";
    row.dataset.active = "true";
    activeRef.current = row;
  }

  function deactivate() {
    if (barRef.current) barRef.current.dataset.on = "false";
    if (activeRef.current) activeRef.current.dataset.active = "false";
    activeRef.current = null;
  }

  return (
    // Одно появление на весь список: отдельный transition у .reveal не мешает строкам.
    <div
      ref={revealRef}
      id="why-services"
      className="reveal relative mt-24 scroll-mt-24 border-t border-hairline-strong motion-reduce:transform-none"
    >
      <span
        ref={barRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 rounded-2xl bg-brand/15 opacity-0 duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] data-[on=true]:opacity-100"
      />
      <ul
        aria-label="Услуги"
        className="relative"
        onPointerLeave={deactivate}
      >
        {features.map(f => (
          <ServiceRow key={f.title} feature={f} onActivate={activate} />
        ))}
      </ul>
    </div>
  );
}

function ServiceRow({
  feature,
  onActivate,
}: {
  feature: Feature;
  onActivate: (row: HTMLElement | null) => void;
}) {
  const Icon = feature.icon;
  return (
    <li
      className="group/row relative border-b border-hairline-strong"
      onPointerEnter={e => {
        if (e.pointerType === "mouse") onActivate(e.currentTarget);
      }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 py-8 md:grid-cols-[auto_minmax(0,5fr)_minmax(0,6fr)] md:items-baseline md:gap-x-10 md:px-8 md:py-11">
        {/* Фирменный фиолетовый — как у прежних римских номеров */}
        <Icon
          aria-hidden
          strokeWidth={1.5}
          className="h-8 w-8 self-center text-brand-glow/80 transition-colors duration-300 group-data-[active=true]/row:text-brand-glow md:h-10 md:w-10 md:self-start"
        />
        <h3 className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.05] text-ink">
          {feature.title}
        </h3>
        <p className="col-span-2 max-w-prose whitespace-pre-line text-pretty text-base leading-relaxed text-ink-muted md:col-span-1 md:text-lg">
          {feature.description}
        </p>
      </div>
    </li>
  );
}
