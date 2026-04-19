"use client";

import { useReveal } from "@/lib/useReveal";
import { ArrowUpRight, Calendar, Clock, Truck, type LucideIcon } from "lucide-react";

type Service = {
  ordinal: string;
  title: string;
  tagline: string;
  description: string;
  meta: { label: string; value: string }[];
  icon: LucideIcon;
};

const services: Service[] = [
  {
    ordinal: "01",
    title: "Same-Day",
    tagline: "Dispatched within the hour.",
    description:
      "Courier on your doorstep in minutes. Hand-delivered across town before the sun crosses the meridian.",
    meta: [
      { label: "ETA", value: "< 4h" },
      { label: "Coverage", value: "In-city" },
    ],
    icon: Clock,
  },
  {
    ordinal: "02",
    title: "Express",
    tagline: "Priority corridors, cross-country.",
    description:
      "Overnight express along our dedicated air-road corridors. Sealed handoffs, signed at every checkpoint.",
    meta: [
      { label: "ETA", value: "< 24h" },
      { label: "Coverage", value: "Domestic" },
    ],
    icon: Truck,
  },
  {
    ordinal: "03",
    title: "Scheduled",
    tagline: "Pickups on your calendar.",
    description:
      "Book recurring pickups on the week you need them. Morning, afternoon or evening bracketing — your choice.",
    meta: [
      { label: "ETA", value: "Planned" },
      { label: "Coverage", value: "Unlimited" },
    ],
    icon: Calendar,
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="clip-both-slopes relative -mt-[72px] overflow-hidden bg-section pb-32 pt-36"
    >
      {/* Texture */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-section-warm via-section to-section-shadow"
      />
      <div className="noise-layer" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(14,8,22,0.18), transparent 40%), radial-gradient(circle at 80% 100%, rgba(146,90,244,0.25), transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header */}
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-bg/80">
              <span className="inline-block h-px w-8 bg-bg/50" />
              Services · 01/03
            </div>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-normal leading-[1] tracking-[-0.02em] text-bg">
              Three ways
              <br />
              <span className="italic">to move.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-bg/80 md:text-lg">
            Every Skoro courier is vetted, tracked and bonded. Pick the cadence
            — we handle the choreography.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
          {services.map((s, i) => (
            <ServiceCard key={s.ordinal} service={s} delay={i * 140} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, delay }: { service: Service; delay: number }) {
  const ref = useReveal<HTMLElement>();
  const Icon = service.icon;
  return (
    <article
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal group relative overflow-hidden rounded-[1.75rem] border border-bg/15 bg-bg p-7 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand/40 hover:shadow-brand md:p-8 ${
        service.ordinal === "02" ? "md:translate-y-10" : ""
      }`}
    >
      <div className="noise-layer rounded-[1.75rem]" />

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <span className="font-display text-6xl italic leading-none text-brand-glow/90 md:text-7xl">
          {service.ordinal}
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-bg-soft text-ink transition group-hover:border-brand group-hover:text-brand-glow">
          <Icon size={20} />
        </span>
      </div>

      {/* Title */}
      <div className="relative mt-12">
        <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          {service.tagline}
        </div>
        <h3 className="mt-3 font-display text-4xl leading-none text-ink md:text-[2.75rem]">
          {service.title}
        </h3>
      </div>

      {/* Description */}
      <p className="relative mt-5 text-sm leading-relaxed text-ink-muted">
        {service.description}
      </p>

      {/* Meta rows */}
      <div className="relative mt-8 space-y-2 border-t border-hairline pt-4">
        {service.meta.map((m) => (
          <div
            key={m.label}
            className="flex items-center justify-between font-mono text-[11px] uppercase tracking-label"
          >
            <span className="text-ink-dim">{m.label}</span>
            <span className="text-ink">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Hover cue */}
      <div className="relative mt-6 flex items-center justify-between border-t border-hairline pt-5 font-mono text-[11px] uppercase tracking-label text-ink-muted">
        Request
        <ArrowUpRight
          size={16}
          className="text-ink transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-glow"
        />
      </div>
    </article>
  );
}
