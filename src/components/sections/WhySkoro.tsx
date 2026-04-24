"use client";

import { useReveal } from "@/lib/useReveal";
import { History, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

type Feature = {
  number: string;
  ordinal: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    number: "I",
    ordinal: "01",
    icon: History,
    title: "Доставка документов",
    description:
      "Подпишем за вас документы, представим ваши интересы в возможной форме и доставим на указанный адрес.",
  },
  {
    number: "II",
    ordinal: "02",
    icon: UserRound,
    title: "Экспресс-доставка",
    description:
      "Довезем ваши заказы до получателя, примем оплату и настроии работу с вашей системой.",
  },
  {
    number: "III",
    ordinal: "03",
    icon: ShieldCheck,
    title: "Закупки и снабжение",
    description:
      "Предоставим регулярные и разовые пополнения расходных материалов под нужды вашего бизнеса в согласованным с вами графиком.\nКупить кофе в офис? Докупить материалы в строительном и привезти через полчаса?\n\nНе проблема!",
  },
  {
    number: "IV",
    ordinal: "04",
    icon: ShieldCheck,
    title: "Переезды и крупногабарит",
    description:
      "Организуем переезд и перевозку крупногабаритного груза.\nПереезд офиса, поставка мебели.",
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
        {/* Top row — title & stats */}
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <span className="inline-block h-px w-8 bg-ink-muted" />
              Method · why&nbsp;Skoro
            </div>
            <h2 className="mt-6 max-w-2xl font-display text-[clamp(2.25rem,6vw,4.75rem)] font-normal leading-[1] tracking-[-0.02em] text-ink">
              We move packages
              <br />
              the way a&nbsp;
              <span className="italic text-brand-glow">jeweller</span>
              <br />
              moves stones.
            </h2>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-ink-muted md:text-lg">
              No black boxes, no vanishing links in the chain. Every Skoro
              handoff is logged, signed, and watchable from the moment the box
              closes to the moment it reopens.
            </p>
          </div>

          {/* Stats block */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline-strong bg-hairline-strong">
            <StatBig value="99.8%" label="On-time arrivals" />
            <StatBig value="40+" label="Cities covered" />
            <StatBig value="24/7" label="Live dispatch" />
            <StatBig value="£10k" label="Default insurance" />
          </div>
        </div>

        {/* Feature rows */}
        <div className="mt-24 border-t border-hairline-strong">
          {features.map((f, i) => (
            <FeatureRow key={f.number} feature={f} delay={i * 140} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatBig({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col justify-between gap-6 bg-bg-soft/90 p-6 md:p-8">
      <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </span>
      <span className="font-display text-5xl leading-none text-ink md:text-6xl">
        {value}
      </span>
    </div>
  );
}

function FeatureRow({ feature, delay }: { feature: Feature; delay: number }) {
  const ref = useReveal<HTMLDivElement>();
  const Icon = feature.icon;
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className="reveal group grid grid-cols-[auto_1fr_auto] items-start gap-6 border-b border-hairline-strong py-10 transition md:grid-cols-[auto_1fr_auto_auto] md:gap-10 md:py-14"
    >
      <div className="font-display text-3xl italic leading-none text-brand-glow/80 md:text-5xl">
        {feature.number}
      </div>

      <div className="max-w-2xl">
        <h3 className="font-display text-2xl leading-tight text-ink md:text-[2rem]">
          {feature.title}
        </h3>
        <p className="whitespace-pre-line mt-3 text-base leading-relaxed text-ink-muted md:text-lg">
          {feature.description}
        </p>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-hairline-strong text-ink-muted transition group-hover:border-brand group-hover:text-brand-glow">
          <Icon size={22} />
        </div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim md:pt-2">
        / {feature.ordinal}
      </div>
    </div>
  );
}
