"use client";

import { useReveal } from "@/lib/useReveal";
import {
  FileCheck2,
  FileText,
  Handshake,
  SlidersHorizontal,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

type Anchor =
  | "bottom-center"
  | "bottom-left-corner"
  | "bottom-right-corner"
  | "top-left-corner"
  | "top-right-corner";

type Step = {
  ordinal: string;
  title: string;
  description: string;
  icon: LucideIcon;
  pos: { top: string; left: string };
  anchor: Anchor;
};

// pos = точка УЗЛА на кольце (в точности конец одной дуги и начало следующей).
// anchor = какой угол/край карточки прилипает к этой точке.
// Карточка "лучом" выходит наружу кольца: 01 вверх, 02 вверх-вправо,
// 03 вниз-вправо, 04 вниз-влево, 05 вверх-влево.
//
// Пары симметричны относительно вертикальной оси:
//   02 ↔ 05 (Y = 41.97%, X зеркальны)
//   03 ↔ 04 (Y = 71.03%, X зеркальны)
//   01 по центру (X = 50%).
const steps: Step[] = [
  {
    ordinal: "01",
    title: "Заявка",
    description:
      "Оставляете заявку на сотрудничество — через форму на сайте или звонком.",
    icon: FileText,
    pos: { top: "23.4%", left: "50%" },
    anchor: "bottom-center",
  },
  {
    ordinal: "02",
    title: "Потребности и договор",
    description:
      "Узнаём ваши задачи, фиксируем объёмы и заключаем договор без бумажной волокиты.",
    icon: Handshake,
    pos: { top: "41.97%", left: "74.73%" },
    anchor: "bottom-left-corner",
  },
  {
    ordinal: "03",
    title: "Настройка процесса",
    description:
      "Индивидуально настраиваем рабочий процесс — каналы связи, регламенты, форматы заявок.",
    icon: SlidersHorizontal,
    pos: { top: "71.03%", left: "65.28%" },
    anchor: "top-left-corner",
  },
  {
    ordinal: "04",
    title: "Доставка день в день",
    description:
      "Выполняем заявки в день обращения — курьер, экспресс или регулярные рейсы.",
    icon: Truck,
    pos: { top: "71.03%", left: "34.72%" },
    anchor: "top-right-corner",
  },
  {
    ordinal: "05",
    title: "Отчётные документы",
    description:
      "Готовим закрывающие документы — акты, реестры, выгрузки в 1С.",
    icon: FileCheck2,
    pos: { top: "41.97%", left: "25.27%" },
    anchor: "bottom-right-corner",
  },
];

// Зазор между наконечником стрелки и углом/краем карточки.
const GAP = 4;

const anchorStyles: Record<Anchor, CSSProperties> = {
  "bottom-center": {
    transform: `translate(-50%, calc(-100% - ${GAP}px))`,
  },
  "bottom-left-corner": {
    transform: `translate(${GAP}px, calc(-100% - ${GAP}px))`,
  },
  "bottom-right-corner": {
    transform: `translate(calc(-100% - ${GAP}px), calc(-100% - ${GAP}px))`,
  },
  "top-left-corner": {
    transform: `translate(${GAP}px, ${GAP}px)`,
  },
  "top-right-corner": {
    transform: `translate(calc(-100% - ${GAP}px), ${GAP}px)`,
  },
};

export default function Cooperation() {
  return (
    <section
      id="cooperation"
      className="relative overflow-hidden bg-bg pb-36 pt-32"
    >
      {/* Background layers */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(146,90,244,0.16), transparent 60%), radial-gradient(ellipse 50% 60% at 50% 100%, rgba(179,143,185,0.10), transparent 65%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <span className="inline-block h-px w-8 bg-ink-muted" />
              Сотрудничество · 5 шагов
            </div>
            <h2 className="mt-6 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.75rem)] font-normal leading-[1] tracking-[-0.02em] text-ink">
              Как выглядит{" "}
              <span className="italic text-brand-glow">сотрудничество</span>
              <br className="hidden md:block" /> с нами.
            </h2>
          </div>
          <p className="max-w-md self-end ml-auto text-base leading-relaxed text-ink-muted md:text-lg">
            Пять шагов — от заявки до закрывающих документов. Подключение
            возможно в день обращения, дальше всё идёт по кругу: заявка,
            настройка, выполнение, отчётность.
          </p>
        </div>

        {/* Desktop: ring diagram */}
        <RingDiagram />

        {/* Mobile: stacked list */}
        <MobileList />
      </div>
    </section>
  );
}

function RingDiagram() {
  return (
    <div
      role="list"
      aria-label="Шаги сотрудничества"
      className="relative mx-auto mt-20 hidden aspect-square w-full max-w-[880px] md:block"
    >
      {/* Connector arcs */}
      <svg
        aria-hidden
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <marker
            id="coop-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M0 0 L10 5 L0 10 z"
              fill="rgba(183, 148, 255, 0.9)"
            />
          </marker>
        </defs>

        {/* 5 dashed arcs, clockwise. Each arc goes node → next node on radius 260,
            so the arrow tip lands exactly on the next card's anchor point. */}
        {[
          "M 500,240 A 260,260 0 0 1 747.3,419.7",
          "M 747.3,419.7 A 260,260 0 0 1 652.8,710.3",
          "M 652.8,710.3 A 260,260 0 0 1 347.2,710.3",
          "M 347.2,710.3 A 260,260 0 0 1 252.7,419.7",
          "M 252.7,419.7 A 260,260 0 0 1 500,240",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(183, 148, 255, 0.45)"
            strokeWidth="1.5"
            strokeDasharray="5 7"
            strokeLinecap="round"
            markerEnd="url(#coop-arrow)"
            className="animate-dash-flow"
          />
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute left-1/2 top-1/2 flex w-[260px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-bg-soft/60 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-brand-glow backdrop-blur">
          <span className="h-1.5 w-1.5 animate-float-slow rounded-full bg-brand-glow" />
          Цикл работы
        </span>
        <h3 className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink md:text-5xl">
          От <span className="italic text-brand-glow">заявки</span>
          <br />
          до <span className="italic text-brand-glow">отчёта</span>
        </h3>
      </div>

      {/* Step bubbles */}
      {steps.map((step, i) => (
        <StepNode key={step.ordinal} step={step} delay={i * 120} />
      ))}
    </div>
  );
}

function StepNode({ step, delay }: { step: Step; delay: number }) {
  const ref = useReveal<HTMLDivElement>();
  const Icon = step.icon;
  return (
    <div
      ref={ref}
      role="listitem"
      style={{
        top: step.pos.top,
        left: step.pos.left,
        transitionDelay: `${delay}ms`,
        ...anchorStyles[step.anchor],
      }}
      className="reveal absolute w-[180px] lg:w-[200px]"
    >
      <div className="group rounded-2xl border border-hairline bg-bg-soft/70 p-5 shadow-card backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand/40 hover:bg-bg-raised/80">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-strong bg-bg text-ink-muted transition group-hover:border-brand group-hover:text-brand-glow">
            <Icon size={18} />
          </span>
          <span className="font-display text-3xl italic leading-none text-brand-glow/80">
            {step.ordinal}
          </span>
        </div>
        <h4 className="mt-4 font-display text-xl leading-tight text-ink">
          {step.title}
        </h4>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          {step.description}
        </p>
      </div>
    </div>
  );
}

function MobileList() {
  return (
    <ol
      aria-label="Шаги сотрудничества"
      className="mt-14 grid grid-cols-1 gap-3 md:hidden"
    >
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <li
            key={step.ordinal}
            className="rounded-2xl border border-hairline bg-bg-soft/70 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline-strong bg-bg text-ink-muted">
                <Icon size={18} />
              </span>
              <span className="font-display text-3xl italic leading-none text-brand-glow/80">
                {step.ordinal}
              </span>
            </div>
            <h4 className="mt-4 font-display text-xl leading-tight text-ink">
              {step.title}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
